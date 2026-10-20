<?php
/**
 * OmniOS Database Configuration & Connection Module
 * 
 * Provides a resilient mysqli database connection with sanitized error handling.
 * Raw credentials and low-level SQL errors are never returned to clients.
 * Configuration is loaded from environment variables with safe local development defaults.
 */

// Load .env file if present (non-fatal if missing)
$envPath = __DIR__ . '/.env';
if (is_readable($envPath)) {
    $lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#')) {
            continue;
        }
        if (strpos($line, '=') !== false) {
            [$k, $v] = array_map('trim', explode('=', $line, 2));
            // Remove optional surrounding quotes
            $v = trim($v, '"\'');
            putenv("$k=$v");
            $_ENV[$k] = $v;
            $_SERVER[$k] = $v;
        }
    }
}

// Determine application environment
$appEnv = getenv('APP_ENV') ?: 'development';
define('APP_ENV', $appEnv);

// Database connection parameters with environment variable overrides
// In production, require explicit configuration; fail fast if missing
if (APP_ENV === 'production') {
    $requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASS', 'DB_NAME'];
    foreach ($requiredVars as $var) {
        $value = getenv($var);
        if ($value === false || trim($value) === '') {
            // Generic error - no credentials or internal details exposed
            if (!headers_sent()) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
            }
            echo json_encode([
                'success' => false,
                'error'   => 'Server configuration error. Required environment variables are missing.'
            ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            exit;
        }
    }
    define('DB_HOST', getenv('DB_HOST'));
    define('DB_PORT', (int)getenv('DB_PORT'));
    define('DB_USER', getenv('DB_USER'));
    define('DB_PASS', getenv('DB_PASS'));
    define('DB_NAME', getenv('DB_NAME'));
} else {
    // Development/local: safe defaults for XAMPP
    define('DB_HOST', getenv('DB_HOST') ?: '127.0.0.1');
    define('DB_PORT', (int)(getenv('DB_PORT') ?: 3306));
    define('DB_USER', getenv('DB_USER') ?: 'root');
    define('DB_PASS', getenv('DB_PASS') ?: '');
    define('DB_NAME', getenv('DB_NAME') ?: 'omnios');
}

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

        // Security headers for API responses
        header('X-Content-Type-Options: nosniff');
        header('X-Frame-Options: DENY');
        header('Referrer-Policy: strict-origin-when-cross-origin');
        header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");

        // CORS headers (will be managed by dedicated CORS module in Phase 2)
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
