<?php
/**
 * OmniOS Owner Login Endpoint
 *
 * Method: POST
 * Payload: {"email": "...", "password": "..."}
 * Returns HTTP 200 with owner details on success, or HTTP 401 on failure.
 */

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/session.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    sendJsonResponse(405, [
        'success' => false,
        'error'   => 'Method not allowed. Use POST to authenticate.'
    ]);
}

$rawInput = file_get_contents('php://input');
$payload = json_decode($rawInput, true);
if (!is_array($payload)) {
    $payload = $_POST;
}

$email = isset($payload['email']) ? trim($payload['email']) : '';
$password = isset($payload['password']) ? $payload['password'] : '';

// Server-side validation
if ($email === '' || $password === '') {
    sendJsonResponse(400, [
        'success' => false,
        'error'   => 'Both email and password are required.'
    ]);
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    sendJsonResponse(400, [
        'success' => false,
        'error'   => 'Please provide a valid email address.'
    ]);
}

$conn = getDbConnection();

// Fetch owner by email using prepared statement
$stmt = $conn->prepare('SELECT id, name, email, company, role, password_hash FROM owners WHERE email = ?');
if (!$stmt) {
    sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
}

$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$owner = $result->fetch_assoc();
$stmt->close();

// Generic authentication failure response to avoid leaking account existence
$genericAuthError = 'Invalid email or password. Please verify your credentials.';

if (!$owner) {
    // Artificial delay to mitigate timing analysis attacks
    usleep(150000); // 150ms
    sendJsonResponse(401, [
        'success' => false,
        'error'   => $genericAuthError
    ]);
}

// Verify password with PHP password_verify()
if (!password_verify($password, $owner['password_hash'])) {
    sendJsonResponse(401, [
        'success' => false,
        'error'   => $genericAuthError
    ]);
}

// Start session & regenerate session ID to protect against session fixation
initOmniSession();
session_regenerate_id(true);

$_SESSION['owner_id']    = (int) $owner['id'];
$_SESSION['owner_email'] = $owner['email'];
$_SESSION['owner_name']  = $owner['name'];
$_SESSION['logged_at']   = time();

sendJsonResponse(200, [
    'success' => true,
    'message' => 'Owner authentication successful.',
    'owner'   => [
        'id'      => (int) $owner['id'],
        'name'    => $owner['name'],
        'email'   => $owner['email'],
        'company' => $owner['company'],
        'role'    => $owner['role']
    ]
]);
