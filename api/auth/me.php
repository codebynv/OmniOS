<?php
/**
 * OmniOS Current Authenticated Owner Session Verification
 *
 * Method: GET
 * Returns HTTP 200 with owner profile if authenticated, or HTTP 401 if unauthenticated.
 */

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';
require_once __DIR__ . '/../config/session.php';

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    sendJsonResponse(405, [
        'success' => false,
        'error'   => 'Method not allowed. Use GET.'
    ]);
}

$conn = getDbConnection();
$owner = getCurrentOwner($conn);

if (!$owner) {
    sendJsonResponse(401, [
        'authenticated' => false,
        'error'         => 'No active owner session found.'
    ]);
}

sendJsonResponse(200, [
    'authenticated' => true,
    'owner'         => [
        'id'      => (int) $owner['id'],
        'name'    => $owner['name'],
        'email'   => $owner['email'],
        'company' => $owner['company'],
        'role'    => $owner['role']
    ]
]);
