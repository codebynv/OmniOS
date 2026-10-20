<?php
/**
 * OmniOS Orders Management API Endpoint
 *
 * Implements prepared statement queries for multi-tenant Order workflows:
 * - GET: List orders scoped strictly to authenticated user's business_id. Supports ?id=X, ?status=X, ?search=X. (Both roles: read-only inspection.)
 * - POST: Create order (Team Member only; Owner is read-only). Validates same-business customer; server-calculates totals from line items; notifies Owner.
 * - PUT/PATCH: Update fulfillment status (Team Member only; Owner is read-only and receives HTTP 403).
 * - DELETE: Cancel/delete order (Team Member only; defaults to status-based cancellation to preserve audit trail; notifies Owner).
 */

// Handle CORS Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
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
$currentRole   = $currentUser['role'];
$method        = $_SERVER['REQUEST_METHOD'];

/**
 * Helper to parse request payload (supports JSON body and standard form data).
 */
function getRequestPayload(): array {
    $rawInput = file_get_contents('php://input');
    $jsonData = json_decode($rawInput, true);
    if (is_array($jsonData)) {
        return $jsonData;
    }
    return is_array($_POST) ? $_POST : [];
}

/**
 * Helper to format an order row for consistent client consumption.
 */
function formatOrderRow(array $row, array $items = []): array {
    $orderDateFormatted = $row['order_date'] ? date('d M Y', strtotime($row['order_date'])) : '';
    $totalAmount = (float) $row['total_amount'];

    return [
        'id'             => (int) $row['id'],
        'order_number'   => $row['order_number'],
        'orderNumber'    => $row['order_number'],
        'business_id'    => (int) $row['business_id'],
        'customer_id'    => (int) $row['customer_id'],
        'customer'       => $row['customer_name'] ?? '',
        'company'        => $row['customer_company'] ?? '',
        'customer_email' => $row['customer_email'] ?? '',
        'customer_phone' => $row['customer_phone'] ?? '',
        'item'           => $row['item_summary'],
        'item_summary'   => $row['item_summary'],
        'status'         => $row['status'],
        'payment_method' => $row['payment_method'],
        'method'         => $row['payment_method'],
        'amount'         => $totalAmount,
        'total_amount'   => $totalAmount,
        'date'           => $orderDateFormatted,
        'order_date'     => $row['order_date'],
        'delivery_date'  => $row['delivery_date'] ?? null,
        'notes'          => $row['notes'] ?? '',
        'created_by'     => $row['created_by'] ? (int) $row['created_by'] : null,
        'creator_name'   => $row['creator_name'] ?? null,
        'items'          => $items,
        'created_at'     => $row['created_at'],
        'updated_at'     => $row['updated_at']
    ];
}

// ----------------------------------------------------------------------------
// GET: Fetch orders (list or single)
// ----------------------------------------------------------------------------
if ($method === 'GET') {
    $orderId = isset($_GET['id']) ? (int) $_GET['id'] : 0;

    if ($orderId > 0) {
        // Fetch single order strictly within the user's business
        $stmt = $conn->prepare("
            SELECT o.*, 
                   c.name AS customer_name, c.company AS customer_company, c.email AS customer_email, c.phone AS customer_phone,
                   u.name AS creator_name
            FROM orders o
            INNER JOIN customers c ON o.customer_id = c.id
            LEFT JOIN users u ON o.created_by = u.id
            WHERE o.id = ? AND o.business_id = ?
            LIMIT 1
        ");
        $stmt->bind_param("ii", $orderId, $businessId);
        $stmt->execute();
        $res = $stmt->get_result();
        $order = $res->fetch_assoc();
        $stmt->close();

        if (!$order) {
            sendJsonResponse(404, [
                'success' => false,
                'error'   => 'Order not found.'
            ]);
        }

        // Fetch line items
        $itemsStmt = $conn->prepare("
            SELECT id, order_id, item_name, quantity, unit_price, total_price, created_at
            FROM order_items
            WHERE order_id = ?
            ORDER BY id ASC
        ");
        $itemsStmt->bind_param("i", $orderId);
        $itemsStmt->execute();
        $itemsRes = $itemsStmt->get_result();
        $items = [];
        while ($itemRow = $itemsRes->fetch_assoc()) {
            $items[] = [
                'id'          => (int) $itemRow['id'],
                'order_id'    => (int) $itemRow['order_id'],
                'item_name'   => $itemRow['item_name'],
                'quantity'    => (int) $itemRow['quantity'],
                'unit_price'  => (float) $itemRow['unit_price'],
                'total_price' => (float) $itemRow['total_price']
            ];
        }
        $itemsStmt->close();

        sendJsonResponse(200, [
            'success' => true,
            'data'    => formatOrderRow($order, $items)
        ]);
    }

    // List orders for the business
    $statusFilter = isset($_GET['status']) ? trim($_GET['status']) : '';
    $search       = isset($_GET['search']) ? trim($_GET['search']) : '';

    $sql = "
        SELECT o.*, 
               c.name AS customer_name, c.company AS customer_company, c.email AS customer_email, c.phone AS customer_phone,
               u.name AS creator_name
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.business_id = ?
    ";
    $params = [$businessId];
    $types  = "i";

    if ($statusFilter !== '' && strtolower($statusFilter) !== 'all') {
        $sql .= " AND LOWER(o.status) = LOWER(?)";
        $params[] = $statusFilter;
        $types   .= "s";
    }

    if ($search !== '') {
        $searchWildcard = "%$search%";
        $sql .= " AND (
            o.order_number LIKE ? OR
            o.item_summary LIKE ? OR
            c.name LIKE ? OR
            c.company LIKE ?
        )";
        $params[] = $searchWildcard;
        $params[] = $searchWildcard;
        $params[] = $searchWildcard;
        $params[] = $searchWildcard;
        $types   .= "ssss";
    }

    $sql .= " ORDER BY o.order_date DESC, o.id DESC";

    $stmt = $conn->prepare($sql);
    if (!empty($params)) {
        $stmt->bind_param($types, ...$params);
    }
    $stmt->execute();
    $result = $stmt->get_result();

    $orders = [];
    while ($row = $result->fetch_assoc()) {
        $orders[] = formatOrderRow($row);
    }
    $stmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'count'   => count($orders),
        'data'    => $orders
    ]);
}

// ----------------------------------------------------------------------------
// POST: Create a new order
// ----------------------------------------------------------------------------
if ($method === 'POST') {
    // Owner accounts have read-only access to the order ledger.
    if ($currentRole === 'owner') {
        sendJsonResponse(403, [
            'success' => false,
            'error'   => 'Access denied. Owners have read-only access to orders. Order creation is performed by Team Members.'
        ]);
    }

    $payload = getRequestPayload();

    $customerId = isset($payload['customer_id']) ? (int) $payload['customer_id'] : 0;
    if ($customerId <= 0) {
        sendJsonResponse(422, [
            'success' => false,
            'error'   => 'A valid customer_id is required.'
        ]);
    }

    // Validate customer exists and belongs to the same business
    $custStmt = $conn->prepare("SELECT id, name, company FROM customers WHERE id = ? AND business_id = ? LIMIT 1");
    $custStmt->bind_param("ii", $customerId, $businessId);
    $custStmt->execute();
    $custRow = $custStmt->get_result()->fetch_assoc();
    $custStmt->close();

    if (!$custRow) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Referenced customer does not exist or does not belong to your business.'
        ]);
    }

    // Determine order number
    $orderNumber = isset($payload['order_number']) ? trim($payload['order_number']) : '';
    if ($orderNumber === '') {
        // Auto-generate sequential order number
        $cntStmt = $conn->prepare("SELECT COUNT(*) AS total FROM orders WHERE business_id = ?");
        $cntStmt->bind_param("i", $businessId);
        $cntStmt->execute();
        $orderCount = (int) $cntStmt->get_result()->fetch_assoc()['total'];
        $cntStmt->close();

        $candidateSeq = $orderCount + 1;
        do {
            $candidateNum = sprintf("ORD-%04d", $candidateSeq);
            $checkStmt = $conn->prepare("SELECT id FROM orders WHERE business_id = ? AND order_number = ? LIMIT 1");
            $checkStmt->bind_param("is", $businessId, $candidateNum);
            $checkStmt->execute();
            $exists = $checkStmt->get_result()->fetch_assoc();
            $checkStmt->close();
            if (!$exists) {
                $orderNumber = $candidateNum;
                break;
            }
            $candidateSeq++;
        } while (true);
    } else {
        // Check uniqueness
        $dupStmt = $conn->prepare("SELECT id FROM orders WHERE business_id = ? AND order_number = ? LIMIT 1");
        $dupStmt->bind_param("is", $businessId, $orderNumber);
        $dupStmt->execute();
        $dup = $dupStmt->get_result()->fetch_assoc();
        $dupStmt->close();

        if ($dup) {
            sendJsonResponse(422, [
                'success' => false,
                'error'   => "Order number '$orderNumber' already exists in your business."
            ]);
        }
    }

    // Dates
    $orderDate = isset($payload['order_date']) && trim($payload['order_date']) !== '' 
        ? date('Y-m-d', strtotime($payload['order_date'])) 
        : date('Y-m-d');
    $deliveryDate = isset($payload['delivery_date']) && trim($payload['delivery_date']) !== '' 
        ? date('Y-m-d', strtotime($payload['delivery_date'])) 
        : null;

    // Status
    $allowedStatuses = ['Pending', 'Processing', 'Delivered', 'Cancelled'];
    $status = isset($payload['status']) ? trim($payload['status']) : 'Pending';
    if (!in_array($status, $allowedStatuses, true)) {
        $status = 'Pending';
    }

    // Payment method
    $paymentMethod = isset($payload['payment_method']) && trim($payload['payment_method']) !== '' 
        ? trim($payload['payment_method']) 
        : (isset($payload['method']) ? trim($payload['method']) : 'Pending');

    $notes = isset($payload['notes']) ? trim($payload['notes']) : null;

    // Process line items & calculate total amount server-side
    $lineItems = [];
    $totalAmount = 0.0;
    $itemSummary = isset($payload['item_summary']) ? trim($payload['item_summary']) : (isset($payload['item']) ? trim($payload['item']) : '');

    if (isset($payload['items']) && is_array($payload['items']) && !empty($payload['items'])) {
        $itemNames = [];
        foreach ($payload['items'] as $item) {
            $name  = isset($item['item_name']) ? trim($item['item_name']) : (isset($item['name']) ? trim($item['name']) : 'Item');
            $qty   = isset($item['quantity']) ? max(1, (int) $item['quantity']) : 1;
            $price = isset($item['unit_price']) ? max(0.0, (float) $item['unit_price']) : 0.0;
            $lineTotal = round($qty * $price, 2);

            $lineItems[] = [
                'item_name'   => $name,
                'quantity'    => $qty,
                'unit_price'  => $price,
                'total_price' => $lineTotal
            ];
            $totalAmount += $lineTotal;
            $itemNames[] = $name . ($qty > 1 ? " ×$qty" : '');
        }
        if ($itemSummary === '' && !empty($itemNames)) {
            $itemSummary = implode(', ', $itemNames);
        }
    } else {
        // Direct amount fallback
        $directAmount = isset($payload['total_amount']) ? (float) $payload['total_amount'] : (isset($payload['amount']) ? (float) $payload['amount'] : 0.0);
        if ($directAmount < 0) {
            $directAmount = 0.0;
        }
        $totalAmount = round($directAmount, 2);
        if ($itemSummary === '') {
            $itemSummary = 'Standard Commercial Supply Order';
        }
        $lineItems[] = [
            'item_name'   => $itemSummary,
            'quantity'    => 1,
            'unit_price'  => $totalAmount,
            'total_price' => $totalAmount
        ];
    }

    if (strlen($itemSummary) > 255) {
        $itemSummary = substr($itemSummary, 0, 252) . '...';
    }

    // Begin database transaction for atomic order + items insertion
    $conn->begin_transaction();
    try {
        $insStmt = $conn->prepare("
            INSERT INTO orders (business_id, order_number, customer_id, item_summary, status, payment_method, total_amount, order_date, delivery_date, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $insStmt->bind_param(
            "isisssdsssi",
            $businessId,
            $orderNumber,
            $customerId,
            $itemSummary,
            $status,
            $paymentMethod,
            $totalAmount,
            $orderDate,
            $deliveryDate,
            $notes,
            $currentUserId
        );
        $insStmt->execute();
        $newOrderId = (int) $conn->insert_id;
        $insStmt->close();

        // Insert line items
        $insItemStmt = $conn->prepare("
            INSERT INTO order_items (order_id, item_name, quantity, unit_price, total_price)
            VALUES (?, ?, ?, ?, ?)
        ");
        foreach ($lineItems as &$li) {
            $insItemStmt->bind_param("isidd", $newOrderId, $li['item_name'], $li['quantity'], $li['unit_price'], $li['total_price']);
            $insItemStmt->execute();
            $li['id'] = (int) $conn->insert_id;
            $li['order_id'] = $newOrderId;
        }
        $insItemStmt->close();

        // Notify the business Owner that a Team Member placed a new order
        $ownerId = getBusinessOwnerId($conn, $businessId);
        if ($ownerId && $ownerId !== $currentUserId) {
            $actorName = !empty($currentUser['name']) ? $currentUser['name'] : 'A team member';
            $notified = createNotification(
                $conn,
                $businessId,
                $ownerId,
                'order_created',
                'New Order Placed',
                "{$actorName} created order {$orderNumber} for '{$itemSummary}'.",
                'order',
                $newOrderId
            );
            if (!$notified) {
                throw new Exception('Failed to record order notification.');
            }
        }

        $conn->commit();
    } catch (Exception $e) {
        $conn->rollback();
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to save order to database: ' . $e->getMessage()
        ]);
    }

    // Fetch the created record for clean response
    $fetchStmt = $conn->prepare("
        SELECT o.*, 
               c.name AS customer_name, c.company AS customer_company, c.email AS customer_email, c.phone AS customer_phone,
               u.name AS creator_name
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.id = ?
        LIMIT 1
    ");
    $fetchStmt->bind_param("i", $newOrderId);
    $fetchStmt->execute();
    $createdRow = $fetchStmt->get_result()->fetch_assoc();
    $fetchStmt->close();

    sendJsonResponse(201, [
        'success' => true,
        'message' => 'Order created successfully.',
        'data'    => formatOrderRow($createdRow, $lineItems)
    ]);
}

// ----------------------------------------------------------------------------
// PUT/PATCH: Update existing order
// ----------------------------------------------------------------------------
if ($method === 'PUT' || $method === 'PATCH') {
    // Owner accounts have read-only access to the order ledger.
    if ($currentRole === 'owner') {
        sendJsonResponse(403, [
            'success' => false,
            'error'   => 'Access denied. Owners have read-only access to orders. Order updates are performed by Team Members.'
        ]);
    }

    $orderId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    $payload = getRequestPayload();
    if ($orderId <= 0 && isset($payload['id'])) {
        $orderId = (int) $payload['id'];
    }

    if ($orderId <= 0) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing order ID.'
        ]);
    }

    // Fetch target order strictly within current user's business
    $stmt = $conn->prepare("SELECT * FROM orders WHERE id = ? AND business_id = ? LIMIT 1");
    $stmt->bind_param("ii", $orderId, $businessId);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$existing) {
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Order not found.'
        ]);
    }

    $allowedStatuses = ['Pending', 'Processing', 'Delivered', 'Cancelled'];

    // Authorization: only Team Members reach this point (Owner is rejected with 403 above).
    // Team Members can ONLY update fulfillment status.
    {
        // Disallow modifications to customer, pricing, order_number, etc.
        $disallowedFields = ['customer_id', 'total_amount', 'amount', 'order_number', 'order_date', 'items', 'created_by', 'business_id'];
        foreach ($disallowedFields as $df) {
            if (isset($payload[$df])) {
                sendJsonResponse(403, [
                    'success' => false,
                    'error'   => 'Access denied. Team Members are only permitted to update order fulfillment status.'
                ]);
            }
        }

        if (!isset($payload['status'])) {
            sendJsonResponse(400, [
                'success' => false,
                'error'   => 'Missing status field for fulfillment update.'
            ]);
        }

        $newStatus = trim($payload['status']);
        if (!in_array($newStatus, $allowedStatuses, true)) {
            sendJsonResponse(422, [
                'success' => false,
                'error'   => 'Invalid status value. Allowed: Pending, Processing, Delivered, Cancelled.'
            ]);
        }

        $conn->begin_transaction();

        $upStmt = $conn->prepare("UPDATE orders SET status = ? WHERE id = ? AND business_id = ?");
        $upStmt->bind_param("sii", $newStatus, $orderId, $businessId);
        if (!$upStmt->execute()) {
            $upStmt->close();
            $conn->rollback();
            sendJsonResponse(500, [
                'success' => false,
                'error'   => 'Failed to update order fulfillment status.'
            ]);
        }
        $upStmt->close();

        // Notify business Owner only when the fulfillment status actually changed
        if ($newStatus !== $existing['status']) {
            $ownerId = getBusinessOwnerId($conn, $businessId);
            if ($ownerId && $ownerId !== $currentUserId) {
                $actorName = !empty($currentUser['name']) ? $currentUser['name'] : 'A team member';
                $orderNum = !empty($existing['order_number']) ? $existing['order_number'] : ('#' . $orderId);
                $notified = createNotification(
                    $conn,
                    $businessId,
                    $ownerId,
                    'order_status_changed',
                    'Order Status Updated',
                    "{$actorName} updated order {$orderNum} to '{$newStatus}'.",
                    'order',
                    $orderId
                );
                if (!$notified) {
                    $conn->rollback();
                    sendJsonResponse(500, [
                        'success' => false,
                        'error'   => 'Failed to update order fulfillment status.'
                    ]);
                }
            }
        }

        $conn->commit();
    }

    // Return updated record
    $fetchStmt = $conn->prepare("
        SELECT o.*, 
               c.name AS customer_name, c.company AS customer_company, c.email AS customer_email, c.phone AS customer_phone,
               u.name AS creator_name
        FROM orders o
        INNER JOIN customers c ON o.customer_id = c.id
        LEFT JOIN users u ON o.created_by = u.id
        WHERE o.id = ?
        LIMIT 1
    ");
    $fetchStmt->bind_param("i", $orderId);
    $fetchStmt->execute();
    $updatedRow = $fetchStmt->get_result()->fetch_assoc();
    $fetchStmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'message' => 'Order updated successfully.',
        'data'    => formatOrderRow($updatedRow)
    ]);
}

// ----------------------------------------------------------------------------
// DELETE: Cancel or remove order (Owner only)
// ----------------------------------------------------------------------------
if ($method === 'DELETE') {
    // Owner accounts have read-only access to the order ledger.
    if ($currentRole === 'owner') {
        sendJsonResponse(403, [
            'success' => false,
            'error'   => 'Access denied. Owners have read-only access to orders. Order cancellation is performed by Team Members.'
        ]);
    }

    $orderId = isset($_GET['id']) ? (int) $_GET['id'] : 0;
    if ($orderId <= 0) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing order ID.'
        ]);
    }

    $stmt = $conn->prepare("SELECT id, order_number FROM orders WHERE id = ? AND business_id = ? LIMIT 1");
    $stmt->bind_param("ii", $orderId, $businessId);
    $stmt->execute();
    $existing = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$existing) {
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Order not found.'
        ]);
    }

    $hardDelete = isset($_GET['hard']) && ($_GET['hard'] === 'true' || $_GET['hard'] === '1');

    // Notify the business Owner about the Team Member's order action (non-fatal on failure).
    $notifyOwner = function (string $type, string $title, string $body) use ($conn, $businessId, $currentUserId, $currentUser, $orderId, $existing) {
        $ownerId = getBusinessOwnerId($conn, $businessId);
        if ($ownerId && $ownerId !== $currentUserId) {
            $actorName = !empty($currentUser['name']) ? $currentUser['name'] : 'A team member';
            $orderNum = !empty($existing['order_number']) ? $existing['order_number'] : ('#' . $orderId);
            createNotification($conn, $businessId, $ownerId, $type, $title, str_replace('{actor}', $actorName, str_replace('{order}', $orderNum, $body)), 'order', $orderId);
        }
    };

    if ($hardDelete) {
        // Hard deletion (for testing/cleanup)
        $delStmt = $conn->prepare("DELETE FROM orders WHERE id = ? AND business_id = ?");
        $delStmt->bind_param("ii", $orderId, $businessId);
        $delStmt->execute();
        $delStmt->close();

        $notifyOwner(
            'order_deleted',
            'Order Removed',
            "{actor} permanently removed order {order}."
        );

        sendJsonResponse(200, [
            'success' => true,
            'message' => 'Order permanently deleted.',
            'id'      => $orderId
        ]);
    } else {
        // Soft cancellation preserves business audit history
        $cancelStmt = $conn->prepare("UPDATE orders SET status = 'Cancelled' WHERE id = ? AND business_id = ?");
        $cancelStmt->bind_param("ii", $orderId, $businessId);
        $cancelStmt->execute();
        $cancelStmt->close();

        $notifyOwner(
            'order_cancelled',
            'Order Cancelled',
            "{actor} cancelled order {order}."
        );

        sendJsonResponse(200, [
            'success' => true,
            'message' => 'Order cancelled successfully.',
            'id'      => $orderId,
            'status'  => 'Cancelled'
        ]);
    }
}

sendJsonResponse(405, [
    'success' => false,
    'error'   => "HTTP method $method is not supported."
]);
