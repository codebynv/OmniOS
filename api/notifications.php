<?php
/**
 * OmniOS Notifications Management API Endpoint
 *
 * Implements prepared statement queries for multi-tenant notification workflows:
 * - GET: Fetch notifications for authenticated user (newest first, bounded to 50 records).
 *        Supports ?unread_only=1 and ?action=count.
 * - PATCH: Mark a specific notification as read (?id=X) or mark all as read (?action=mark_all_read).
 * - Enforces strict tenant and recipient isolation (users cannot see or modify other users' alerts).
 */

// Handle CORS Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/session.php';
require_once __DIR__ . '/config/notifications.php';

$conn = getDbConnection();

// 1. Enforce Authentication (HTTP 401 if unauthenticated)
$currentUser = requireAuth($conn);

// 2. Verify valid business context
$businessId = isset($currentUser['business_id']) ? (int) $currentUser['business_id'] : 0;
if ($businessId <= 0) {
    sendJsonResponse(403, [
        'success' => false,
        'error'   => 'Access denied. User is not associated with a valid business.'
    ]);
}

$currentUserId = (int) $currentUser['id'];
$method        = $_SERVER['REQUEST_METHOD'];

// ----------------------------------------------------------------------------
// GET: Fetch notifications or unread count
// ----------------------------------------------------------------------------
if ($method === 'GET') {
    $action = isset($_GET['action']) ? trim($_GET['action']) : '';

    // Quick unread count query
    $cntStmt = $conn->prepare("
        SELECT COUNT(*) AS unread_total 
        FROM notifications 
        WHERE business_id = ? AND user_id = ? AND read_at IS NULL
    ");
    $cntStmt->bind_param("ii", $businessId, $currentUserId);
    $cntStmt->execute();
    $unreadTotal = (int) $cntStmt->get_result()->fetch_assoc()['unread_total'];
    $cntStmt->close();

    if ($action === 'count') {
        sendJsonResponse(200, [
            'success'      => true,
            'unread_count' => $unreadTotal
        ]);
    }

    $unreadOnly = isset($_GET['unread_only']) && ($_GET['unread_only'] === '1' || $_GET['unread_only'] === 'true');

    // Bounded pagination (defaults: 50 records, offset 0)
    $limit  = isset($_GET['limit']) && is_numeric($_GET['limit']) ? (int) $_GET['limit'] : 50;
    $offset = isset($_GET['offset']) && is_numeric($_GET['offset']) ? (int) $_GET['offset'] : 0;
    $limit  = max(1, min(100, $limit));
    $offset = max(0, $offset);

    $sql = "
        SELECT id, business_id, user_id, type, title, message, entity_type, entity_id, read_at, created_at
        FROM notifications
        WHERE business_id = ? AND user_id = ?
    ";
    if ($unreadOnly) {
        $sql .= " AND read_at IS NULL";
    }
    $sql .= " ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param("iiii", $businessId, $currentUserId, $limit, $offset);
    $stmt->execute();
    $result = $stmt->get_result();

    $notifications = [];
    while ($row = $result->fetch_assoc()) {
        $notifications[] = formatNotificationRow($row);
    }
    $stmt->close();

    sendJsonResponse(200, [
        'success'      => true,
        'unread_count' => $unreadTotal,
        'count'        => count($notifications),
        'limit'        => $limit,
        'offset'       => $offset,
        'data'         => $notifications
    ]);
}

// ----------------------------------------------------------------------------
// PATCH: Mark notification(s) as read
// ----------------------------------------------------------------------------
if ($method === 'PATCH') {
    $rawInput = file_get_contents('php://input');
    $body = json_decode($rawInput, true);
    if (!is_array($body)) {
        $body = [];
    }

    // Action may arrive as a query parameter or inside the JSON body
    $action = isset($_GET['action']) && trim($_GET['action']) !== ''
        ? trim($_GET['action'])
        : (isset($body['action']) ? trim((string) $body['action']) : '');

    // Action: Mark all notifications as read for current authenticated user
    if ($action === 'mark_all_read') {
        $upStmt = $conn->prepare("
            UPDATE notifications 
            SET read_at = CURRENT_TIMESTAMP 
            WHERE business_id = ? AND user_id = ? AND read_at IS NULL
        ");
        $upStmt->bind_param("ii", $businessId, $currentUserId);
        $upStmt->execute();
        $affected = $upStmt->affected_rows;
        $upStmt->close();

        sendJsonResponse(200, [
            'success'      => true,
            'message'      => 'All notifications marked as read.',
            'marked_count' => $affected,
            'unread_count' => 0
        ]);
    }

    // Action: Mark single notification by ID (query param or body)
    $notifId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($notifId <= 0 && isset($body['id'])) {
        $notifId = (int) $body['id'];
    }

    if ($notifId <= 0) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Missing or invalid notification ID.'
        ]);
    }

    // Verify target notification exists and strictly belongs to authenticated user and business
    $chkStmt = $conn->prepare("
        SELECT id, business_id, user_id, type, title, message, entity_type, entity_id, read_at, created_at
        FROM notifications
        WHERE id = ? AND business_id = ? AND user_id = ?
        LIMIT 1
    ");
    $chkStmt->bind_param("iii", $notifId, $businessId, $currentUserId);
    $chkStmt->execute();
    $existing = $chkStmt->get_result()->fetch_assoc();
    $chkStmt->close();

    if (!$existing) {
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Notification not found.'
        ]);
    }

    $isToggle = ($action === 'toggle');
    if ($isToggle && !empty($existing['read_at'])) {
        // Toggle back to unread
        $upStmt = $conn->prepare("UPDATE notifications SET read_at = NULL WHERE id = ? AND business_id = ? AND user_id = ?");
        $upStmt->bind_param("iii", $notifId, $businessId, $currentUserId);
        $upStmt->execute();
        $upStmt->close();
        $existing['read_at'] = null;
    } else {
        // Mark as read (also the fallback for a plain mark_read action)
        $upStmt = $conn->prepare("UPDATE notifications SET read_at = CURRENT_TIMESTAMP WHERE id = ? AND business_id = ? AND user_id = ?");
        $upStmt->bind_param("iii", $notifId, $businessId, $currentUserId);
        $upStmt->execute();
        $upStmt->close();
        $existing['read_at'] = date('Y-m-d H:i:s');
    }

    // Get fresh unread count
    $cntStmt = $conn->prepare("
        SELECT COUNT(*) AS unread_total 
        FROM notifications 
        WHERE business_id = ? AND user_id = ? AND read_at IS NULL
    ");
    $cntStmt->bind_param("ii", $businessId, $currentUserId);
    $cntStmt->execute();
    $unreadTotal = (int) $cntStmt->get_result()->fetch_assoc()['unread_total'];
    $cntStmt->close();

    sendJsonResponse(200, [
        'success'      => true,
        'message'      => 'Notification updated successfully.',
        'unread_count' => $unreadTotal,
        'data'         => formatNotificationRow($existing)
    ]);
}

sendJsonResponse(405, [
    'success' => false,
    'error'   => "HTTP method $method is not supported."
]);
