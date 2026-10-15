<?php
/**
 * OmniOS Database Configuration & Connection Module
 * 
 * Provides a resilient mysqli database connection with sanitized error handling.
 * Raw credentials and low-level SQL errors are never returned to clients.
 */

// Database connection parameters
define('DB_HOST', '127.0.0.1');
define('DB_PORT', 3306);
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'omnios');

/**
 * Standardized JSON response helper.
 *
 * @param int $statusCode HTTP response status code
 * @param array $payload Response data payload
 * @return void
 */
function sendJsonResponse(int $statusCode, array $payload): void {
    // Prevent duplicate header calls
    if (!headers_sent()) {
        http_response_code($statusCode);
        header('Content-Type: application/json; charset=utf-8');
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    }
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

/**
 * Establish and return an active mysqli database connection.
 *
 * @param bool $suppressExit If true, returns null on failure instead of terminating the request
 * @return mysqli|null
 */
function getDbConnection(bool $suppressExit = false): ?mysqli {
    // Disable default mysqli exception mode to handle errors explicitly and safely
    mysqli_report(MYSQLI_REPORT_OFF);

    $conn = @mysqli_init();
    if (!$conn) {
        if ($suppressExit) {
            return null;
        }
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Database connection initialization failed.'
        ]);
    }

    // Set connection timeout (3 seconds)
    $conn->options(MYSQLI_OPT_CONNECT_TIMEOUT, 3);

    $connected = @$conn->real_connect(DB_HOST, DB_USER, DB_PASS, DB_NAME, DB_PORT);

    if (!$connected || $conn->connect_errno) {
        if ($suppressExit) {
            return null;
        }
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Database connection error. Please ensure the database service is running.'
        ]);
    }

    // Enforce UTF-8 encoding
    if (!$conn->set_charset('utf8mb4')) {
        if ($suppressExit) {
            return null;
        }
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to configure database character encoding.'
        ]);
    }

    return $conn;
}
