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

// Fetch user by email from unified users table with business context using prepared statement
$stmt = $conn->prepare('
    SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.business_id, 
        u.company, 
        u.department, 
        u.role, 
        u.status, 
        u.password_hash,
        b.name AS business_name
    FROM users u
    INNER JOIN businesses b ON u.business_id = b.id
    WHERE u.email = ?
');
if (!$stmt) {
    sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
}

$stmt->bind_param('s', $email);
$stmt->execute();
$result = $stmt->get_result();
$user = $result->fetch_assoc();
$stmt->close();

// Generic authentication failure response to avoid leaking account existence
$genericAuthError = 'Invalid email or password. Please verify your credentials.';

if (!$user) {
    // Artificial delay to mitigate timing analysis attacks
    usleep(150000); // 150ms
    sendJsonResponse(401, [
        'success' => false,
        'error'   => $genericAuthError
    ]);
}

// Check account active status
if ($user['status'] !== 'active') {
    usleep(150000);
    sendJsonResponse(403, [
        'success' => false,
        'error'   => 'Account is inactive. Please contact an administrator.'
    ]);
}

// Verify recognized role
if (!in_array($user['role'], ['owner', 'team_member'], true)) {
    sendJsonResponse(403, [
        'success' => false,
        'error'   => 'Invalid account role.'
    ]);
}

// Verify password with PHP password_verify()
if (!password_verify($password, $user['password_hash'])) {
    sendJsonResponse(401, [
        'success' => false,
        'error'   => $genericAuthError
    ]);
}

// Start session & regenerate session ID to protect against session fixation
initOmniSession();
session_regenerate_id(true);

$_SESSION['user_id']       = (int) $user['id'];
$_SESSION['user_role']     = $user['role'];
$_SESSION['user_email']    = $user['email'];
$_SESSION['user_name']     = $user['name'];
$_SESSION['business_id']   = (int) $user['business_id'];
$_SESSION['business_name'] = $user['business_name'];
$_SESSION['owner_id']      = (int) $user['id'];
$_SESSION['owner_email']   = $user['email'];
$_SESSION['owner_name']    = $user['name'];
$_SESSION['logged_at']     = time();

$userProfile = [
    'id'            => (int) $user['id'],
    'name'          => $user['name'],
    'email'         => $user['email'],
    'business_id'   => (int) $user['business_id'],
    'business_name' => $user['business_name'],
    'company'       => $user['company'],
    'department'    => $user['department'],
    'role'          => $user['role'],
    'status'        => $user['status']
];

sendJsonResponse(200, [
    'success' => true,
    'message' => 'Authentication successful.',
    'user'    => $userProfile,
    // Backwards-compatible alias for frontend components expecting 'owner'
    'owner'   => $userProfile
]);

