<?php
/**
 * OmniOS System & Database Health Check Endpoint
 *
 * Verifies that Apache/PHP and the MySQL database connection are operational.
 * Returns HTTP 200 if connected, or HTTP 503 if the database is unavailable.
 */

// Handle CORS Preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';

// Check database connection without dying immediately
$conn = getDbConnection(true);

if (!$conn) {
    sendJsonResponse(503, [
        'status'        => 'degraded',
        'service'       => 'OmniOS API',
        'php_version'   => PHP_VERSION,
        'database'      => 'disconnected',
        'database_name' => DB_NAME,
        'message'       => 'PHP is active, but the MySQL database connection failed.',
        'timestamp'     => date('c')
    ]);
}

// Check if `customers` table exists and count records
$customerCount = 0;
$tableExists = false;
$result = $conn->query("SHOW TABLES LIKE 'customers'");
if ($result && $result->num_rows > 0) {
    $tableExists = true;
    $countResult = $conn->query("SELECT COUNT(*) AS total FROM customers");
    if ($countResult) {
        $row = $countResult->fetch_assoc();
        $customerCount = (int) $row['total'];
    }
}

$conn->close();

sendJsonResponse(200, [
    'status'          => 'ok',
    'service'         => 'OmniOS API',
    'php_version'     => PHP_VERSION,
    'database'        => 'connected',
    'database_name'   => DB_NAME,
    'table_ready'     => $tableExists,
    'customers_count' => $customerCount,
    'timestamp'       => date('c')
]);
