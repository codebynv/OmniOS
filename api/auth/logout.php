<?php
/**
 * OmniOS Owner Logout Endpoint
 *
 * Method: POST
 * Terminates the active server session and invalidates the session cookie.
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
        'error'   => 'Method not allowed. Use POST to log out.'
    ]);
}

initOmniSession();

// Clear session superglobal
$_SESSION = [];

// Delete session cookie from client
if (ini_get('session.use_cookies')) {
    $params = session_get_cookie_params();
    setcookie(
        session_name(),
        '',
        time() - 42000,
        $params['path'],
        $params['domain'],
        $params['secure'],
        $params['httponly']
    );
}

// Destroy session on server
session_destroy();

sendJsonResponse(200, [
    'success' => true,
    'message' => 'Logged out successfully.'
]);
