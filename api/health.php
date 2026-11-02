<?php
/**
 * OmniOS System & Database Health Check Endpoint.
 * Returns 200 only when the database and required health-check table are available.
 */

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';

$conn = getDbConnection(true);
if (!$conn) {
    sendJsonResponse(503, [
        'status' => 'degraded',
        'service' => 'OmniOS API',
        'database' => 'disconnected',
        'message' => 'The database connection is unavailable.',
        'timestamp' => date('c'),
    ]);
}

$result = $conn->query("SHOW TABLES LIKE 'customers'");
if (!$result) {
    $conn->close();
    sendJsonResponse(503, [
        'status' => 'degraded',
        'service' => 'OmniOS API',
        'database' => 'connected',
        'table_ready' => false,
        'message' => 'The database schema health check failed.',
        'timestamp' => date('c'),
    ]);
}

$tableExists = $result->num_rows > 0;
if (!$tableExists) {
    $conn->close();
    sendJsonResponse(503, [
        'status' => 'degraded',
        'service' => 'OmniOS API',
        'database' => 'connected',
        'table_ready' => false,
        'message' => 'The required customers table is unavailable.',
        'timestamp' => date('c'),
    ]);
}

$countResult = $conn->query('SELECT COUNT(*) AS total FROM customers');
if (!$countResult) {
    $conn->close();
    sendJsonResponse(503, [
        'status' => 'degraded',
        'service' => 'OmniOS API',
        'database' => 'connected',
        'table_ready' => true,
        'message' => 'The customers table could not be queried.',
        'timestamp' => date('c'),
    ]);
}

$customerCount = (int) $countResult->fetch_assoc()['total'];
$conn->close();

sendJsonResponse(200, [
    'status' => 'ok',
    'service' => 'OmniOS API',
    'database' => 'connected',
    'table_ready' => true,
    'customers_count' => $customerCount,
    'timestamp' => date('c'),
]);
