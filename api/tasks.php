<?php
/**
 * OmniOS Tasks Management API Endpoint
 *
 * Implements prepared statement queries for multi-tenant Kanban task workflows:
 * - GET: List tasks (Owners see all business tasks; Team Members see only their assigned tasks)
 * - POST: Create new task (Owner only; validates active same-business Team Member assignee)
 * - PUT/PATCH: Update task (Owner can edit all fields; Team Member can ONLY update status of assigned tasks)
 * - DELETE: Delete task (Owner only, strictly scoped to business)
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

switch ($method) {
    case 'GET':
        handleGet($conn, $currentUser, $businessId, $currentUserId, $currentRole);
        break;

    case 'POST':
        handlePost($conn, $currentUser, $businessId, $currentUserId, $currentRole);
        break;

    case 'PUT':
    case 'PATCH':
        handlePutOrPatch($conn, $currentUser, $businessId, $currentUserId, $currentRole);
        break;

    case 'DELETE':
        handleDelete($conn, $currentUser, $businessId, $currentRole);
        break;

    default:
        sendJsonResponse(405, [
            'success' => false,
            'error'   => 'Method not allowed. Supported methods: GET, POST, PUT, PATCH, DELETE.'
        ]);
        break;
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Handle GET requests (List or single task detail).
 */
function handleGet(mysqli $conn, array $currentUser, int $businessId, int $currentUserId, string $currentRole): void {
    // 1. Single Task Request: ?id=
    if (isset($_GET['id'])) {
        $idParam = $_GET['id'];
        if (!filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
            sendJsonResponse(400, [
                'success' => false,
                'error'   => 'Invalid task ID.'
            ]);
        }

        $id = (int) $idParam;

        if ($currentRole === 'owner') {
            $stmt = $conn->prepare('
                SELECT 
                    t.id, t.business_id, t.title, t.description, t.status, t.priority, 
                    t.assigned_to, t.created_by, t.due_date, t.start_date, t.created_at, t.updated_at,
                    u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_dept,
                    u_creator.name AS creator_name
                FROM tasks t
                INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
                INNER JOIN users u_creator ON t.created_by = u_creator.id
                WHERE t.id = ? AND t.business_id = ?
            ');
            $stmt->bind_param('ii', $id, $businessId);
        } else {
            // Team Member sees ONLY tasks assigned to themselves
            $stmt = $conn->prepare('
                SELECT 
                    t.id, t.business_id, t.title, t.description, t.status, t.priority, 
                    t.assigned_to, t.created_by, t.due_date, t.start_date, t.created_at, t.updated_at,
                    u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_dept,
                    u_creator.name AS creator_name
                FROM tasks t
                INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
                INNER JOIN users u_creator ON t.created_by = u_creator.id
                WHERE t.id = ? AND t.business_id = ? AND t.assigned_to = ?
            ');
            $stmt->bind_param('iii', $id, $businessId, $currentUserId);
        }

        if (!$stmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        if ($task = $result->fetch_assoc()) {
            $stmt->close();
            sendJsonResponse(200, [
                'success' => true,
                'data'    => formatTaskRow($task)
            ]);
        } else {
            $stmt->close();
            sendJsonResponse(404, [
                'success' => false,
                'error'   => 'Task not found.'
            ]);
        }
    }

    // 2. List Tasks
    if ($currentRole === 'owner') {
        // Owner sees all tasks in their business
        $stmt = $conn->prepare('
            SELECT 
                t.id, t.business_id, t.title, t.description, t.status, t.priority, 
                t.assigned_to, t.created_by, t.due_date, t.start_date, t.created_at, t.updated_at,
                u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_dept,
                u_creator.name AS creator_name
            FROM tasks t
            INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
            INNER JOIN users u_creator ON t.created_by = u_creator.id
            WHERE t.business_id = ?
            ORDER BY t.id ASC
        ');
        $stmt->bind_param('i', $businessId);
    } else {
        // Team Member sees only their assigned tasks within their business
        $stmt = $conn->prepare('
            SELECT 
                t.id, t.business_id, t.title, t.description, t.status, t.priority, 
                t.assigned_to, t.created_by, t.due_date, t.start_date, t.created_at, t.updated_at,
                u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_dept,
                u_creator.name AS creator_name
            FROM tasks t
            INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
            INNER JOIN users u_creator ON t.created_by = u_creator.id
            WHERE t.business_id = ? AND t.assigned_to = ?
            ORDER BY t.id ASC
        ');
        $stmt->bind_param('ii', $businessId, $currentUserId);
    }

    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }

    $stmt->execute();
    $result = $stmt->get_result();

    $tasks = [];
    while ($row = $result->fetch_assoc()) {
        $tasks[] = formatTaskRow($row);
    }
    $stmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'data'    => $tasks,
        'total'   => count($tasks)
    ]);
}

/**
 * Handle POST requests (Create Task — Owner only).
 */
function handlePost(mysqli $conn, array $currentUser, int $businessId, int $currentUserId, string $currentRole): void {
    if ($currentRole !== 'owner') {
        sendJsonResponse(403, [
            'success' => false,
            'error'   => 'Access denied. Only business Owners have permission to create tasks.'
        ]);
    }

    $payload = getRequestPayload();

    $title       = isset($payload['title']) ? trim((string)$payload['title']) : '';
    $description = isset($payload['description']) ? trim((string)$payload['description']) : (isset($payload['desc']) ? trim((string)$payload['desc']) : '');
    $priority    = isset($payload['priority']) ? trim((string)$payload['priority']) : 'Medium';
    $dueDate     = isset($payload['due_date']) ? trim((string)$payload['due_date']) : (isset($payload['dueDate']) ? trim((string)$payload['dueDate']) : '');
    $startDate   = isset($payload['start_date']) ? trim((string)$payload['start_date']) : (isset($payload['startDate']) ? trim((string)$payload['startDate']) : '');
    $assignedTo  = isset($payload['assigned_to']) ? (int)$payload['assigned_to'] : (isset($payload['assignee_id']) ? (int)$payload['assignee_id'] : 0);

    // Validation
    $errors = [];
    if ($title === '') {
        $errors[] = 'Task title is required.';
    } elseif (mb_strlen($title) < 2) {
        $errors[] = 'Task title must be at least 2 characters.';
    } elseif (mb_strlen($title) > 255) {
        $errors[] = 'Task title cannot exceed 255 characters.';
    }

    if (!in_array($priority, ['Low', 'Medium', 'High'], true)) {
        $errors[] = 'Priority must be Low, Medium, or High.';
    }

    if (mb_strlen($dueDate) > 100) {
        $errors[] = 'Due date cannot exceed 100 characters.';
    }

    if (mb_strlen($startDate) > 100) {
        $errors[] = 'Start date cannot exceed 100 characters.';
    }

    if ($assignedTo <= 0) {
        $errors[] = 'A valid Team Member must be assigned to the task.';
    }

    if (!empty($errors)) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => implode(' ', $errors),
            'errors'  => $errors
        ]);
    }

    // Validate that assignee is an active Team Member of the SAME business
    $assigneeCheck = validateAssignee($conn, $assignedTo, $businessId);
    if (!$assigneeCheck['valid']) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => $assigneeCheck['error']
        ]);
    }

    // Insert task and its assignment notification inside one transaction
    $conn->begin_transaction();

    $stmt = $conn->prepare('
        INSERT INTO tasks (business_id, title, description, status, priority, assigned_to, created_by, due_date, start_date)
        VALUES (?, ?, ?, "todo", ?, ?, ?, ?, ?)
    ');
    if (!$stmt) {
        $conn->rollback();
        sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
    }

    $stmt->bind_param('isssiiss', $businessId, $title, $description, $priority, $assignedTo, $currentUserId, $dueDate, $startDate);

    if (!$stmt->execute()) {
        $stmt->close();
        $conn->rollback();
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to create task record.'
        ]);
    }

    $newId = (int)$stmt->insert_id;
    $stmt->close();

    // Notify assigned team member (same transaction — rolls back with the task on failure)
    if ($assignedTo > 0 && $assignedTo !== $currentUserId) {
        $notified = createNotification(
            $conn,
            $businessId,
            $assignedTo,
            'task_assigned',
            'New Task Assigned',
            "You have been assigned to task '{$title}'.",
            'task',
            $newId
        );
        if (!$notified) {
            $conn->rollback();
            sendJsonResponse(500, [
                'success' => false,
                'error'   => 'Failed to create task record.'
            ]);
        }
    }

    $conn->commit();

    // Fetch and return populated task record
    $fetchStmt = $conn->prepare('
        SELECT 
            t.id, t.business_id, t.title, t.description, t.status, t.priority, 
            t.assigned_to, t.created_by, t.due_date, t.start_date, t.created_at, t.updated_at,
            u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_dept,
            u_creator.name AS creator_name
        FROM tasks t
        INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
        INNER JOIN users u_creator ON t.created_by = u_creator.id
        WHERE t.id = ?
    ');
    $fetchStmt->bind_param('i', $newId);
    $fetchStmt->execute();
    $savedTask = $fetchStmt->get_result()->fetch_assoc();
    $fetchStmt->close();

    sendJsonResponse(201, [
        'success' => true,
        'message' => 'Task created successfully.',
        'data'    => formatTaskRow($savedTask)
    ]);
}

/**
 * Handle PUT/PATCH requests (Update Task).
 * - Owner: can update details, priority, due date, assignee, and status.
 * - Team Member: can update ONLY the status of tasks assigned to them.
 */
function handlePutOrPatch(mysqli $conn, array $currentUser, int $businessId, int $currentUserId, string $currentRole): void {
    $payload = getRequestPayload();

    $idParam = $_GET['id'] ?? ($payload['id'] ?? null);
    if (!$idParam || !filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing task ID.'
        ]);
    }

    $id = (int)$idParam;

    // Check task existence and retrieve current record
    $checkStmt = $conn->prepare('
        SELECT id, business_id, title, description, status, priority, assigned_to, created_by, due_date, start_date 
        FROM tasks 
        WHERE id = ?
    ');
    if (!$checkStmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }
    $checkStmt->bind_param('i', $id);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $existing = $result->fetch_assoc();
    $checkStmt->close();

    if (!$existing || (int)$existing['business_id'] !== $businessId) {
        // Non-disclosing 404 for cross-business or nonexistent tasks
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Task not found.'
        ]);
    }

    // ─────────────────────────────────────────────────────────────
    // TEAM MEMBER UPDATE LOGIC (Status only, strictly own tasks)
    // ─────────────────────────────────────────────────────────────
    if ($currentRole === 'team_member') {
        if ((int)$existing['assigned_to'] !== $currentUserId) {
            sendJsonResponse(403, [
                'success' => false,
                'error'   => 'Access denied. You cannot modify tasks assigned to another team member.'
            ]);
        }

        // Verify that Team Member is NOT trying to alter protected fields
        $disallowedFields = ['title', 'description', 'desc', 'priority', 'due_date', 'dueDate', 'start_date', 'startDate', 'assigned_to', 'assignee_id', 'business_id', 'created_by'];
        foreach ($disallowedFields as $field) {
            if (isset($payload[$field])) {
                // Check if value actually differs from existing
                $existingVal = $field === 'desc' ? $existing['description'] : ($field === 'dueDate' ? $existing['due_date'] : ($field === 'assignee_id' ? $existing['assigned_to'] : ($existing[$field] ?? null)));
                if ((string)$payload[$field] !== (string)$existingVal) {
                    sendJsonResponse(403, [
                        'success' => false,
                        'error'   => 'Access denied. Team Members are only permitted to update the status of their assigned tasks.'
                    ]);
                }
            }
        }

        // Validate new status
        $newStatus = isset($payload['status']) ? trim((string)$payload['status']) : $existing['status'];
        if (!in_array($newStatus, ['todo', 'in-progress', 'done'], true)) {
            sendJsonResponse(400, [
                'success' => false,
                'error'   => 'Invalid status. Status must be todo, in-progress, or done.'
            ]);
        }

        $conn->begin_transaction();

        $stmt = $conn->prepare('
            UPDATE tasks 
            SET status = ? 
            WHERE id = ? AND business_id = ? AND assigned_to = ?
        ');
        if (!$stmt) {
            $conn->rollback();
            sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
        }
        $stmt->bind_param('siii', $newStatus, $id, $businessId, $currentUserId);
        if (!$stmt->execute()) {
            $stmt->close();
            $conn->rollback();
            sendJsonResponse(500, ['success' => false, 'error' => 'Failed to update task status.']);
        }
        $stmt->close();

        // Notify business Owner only when the status actually changed
        if ($newStatus !== $existing['status']) {
            $ownerId = getBusinessOwnerId($conn, $businessId);
            if ($ownerId && $ownerId !== $currentUserId) {
                $actorName = !empty($currentUser['name']) ? $currentUser['name'] : 'A team member';
                $notified = createNotification(
                    $conn,
                    $businessId,
                    $ownerId,
                    'task_status_changed',
                    'Task Status Updated',
                    "{$actorName} updated task '{$existing['title']}' to '{$newStatus}'.",
                    'task',
                    $id
                );
                if (!$notified) {
                    $conn->rollback();
                    sendJsonResponse(500, ['success' => false, 'error' => 'Failed to update task status.']);
                }
            }
        }

        $conn->commit();
    } 
    // ─────────────────────────────────────────────────────────────
    // OWNER UPDATE LOGIC (Full task editing & re-assignment)
    // ─────────────────────────────────────────────────────────────
    else {
        $title       = isset($payload['title']) ? trim((string)$payload['title']) : $existing['title'];
        $description = isset($payload['description']) ? trim((string)$payload['description']) : (isset($payload['desc']) ? trim((string)$payload['desc']) : $existing['description']);
        $status      = isset($payload['status']) ? trim((string)$payload['status']) : $existing['status'];
        $priority    = isset($payload['priority']) ? trim((string)$payload['priority']) : $existing['priority'];
        $dueDate     = isset($payload['due_date']) ? trim((string)$payload['due_date']) : (isset($payload['dueDate']) ? trim((string)$payload['dueDate']) : $existing['due_date']);
        $startDate   = isset($payload['start_date']) ? trim((string)$payload['start_date']) : (isset($payload['startDate']) ? trim((string)$payload['startDate']) : $existing['start_date']);
        $assignedTo  = isset($payload['assigned_to']) ? (int)$payload['assigned_to'] : (isset($payload['assignee_id']) ? (int)$payload['assignee_id'] : (int)$existing['assigned_to']);

        // Validation
        $errors = [];
        if ($title === '') {
            $errors[] = 'Task title cannot be empty.';
        } elseif (mb_strlen($title) < 2) {
            $errors[] = 'Task title must be at least 2 characters.';
        } elseif (mb_strlen($title) > 255) {
            $errors[] = 'Task title cannot exceed 255 characters.';
        }

        if (!in_array($status, ['todo', 'in-progress', 'done'], true)) {
            $errors[] = 'Invalid status. Status must be todo, in-progress, or done.';
        }

        if (!in_array($priority, ['Low', 'Medium', 'High'], true)) {
            $errors[] = 'Priority must be Low, Medium, or High.';
        }

if (mb_strlen($dueDate) > 100) {
        $errors[] = 'Due date cannot exceed 100 characters.';
    }

    if (mb_strlen($startDate) > 100) {
        $errors[] = 'Start date cannot exceed 100 characters.';
    }

    if ($assignedTo <= 0) {
            $errors[] = 'A valid Team Member must be assigned to the task.';
        }

        if (!empty($errors)) {
            sendJsonResponse(400, [
                'success' => false,
                'error'   => implode(' ', $errors),
                'errors'  => $errors
            ]);
        }

        // Revalidate assignee if assignment changed
        if ($assignedTo !== (int)$existing['assigned_to']) {
            $assigneeCheck = validateAssignee($conn, $assignedTo, $businessId);
            if (!$assigneeCheck['valid']) {
                sendJsonResponse(400, [
                    'success' => false,
                    'error'   => $assigneeCheck['error']
                ]);
            }
        }

        $conn->begin_transaction();

        $stmt = $conn->prepare('
            UPDATE tasks 
            SET title = ?, description = ?, status = ?, priority = ?, assigned_to = ?, due_date = ?, start_date = ? 
            WHERE id = ? AND business_id = ?
        ');
        if (!$stmt) {
            $conn->rollback();
            sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
        }
        $stmt->bind_param('ssssisiii', $title, $description, $status, $priority, $assignedTo, $dueDate, $startDate, $id, $businessId);
        if (!$stmt->execute()) {
            $stmt->close();
            $conn->rollback();
            sendJsonResponse(500, ['success' => false, 'error' => 'Failed to update task record.']);
        }
        $stmt->close();

        // Notify the new assignee only when the task was actually reassigned
        if ($assignedTo !== (int)$existing['assigned_to'] && $assignedTo !== $currentUserId) {
            $notified = createNotification(
                $conn,
                $businessId,
                $assignedTo,
                'task_reassigned',
                'Task Reassigned',
                "You have been assigned to task '{$title}'.",
                'task',
                $id
            );
            if (!$notified) {
                $conn->rollback();
                sendJsonResponse(500, ['success' => false, 'error' => 'Failed to update task record.']);
            }
        }

        $conn->commit();
    }

    // Fetch updated record with joins
    $fetchStmt = $conn->prepare('
        SELECT 
            t.id, t.business_id, t.title, t.description, t.status, t.priority, 
            t.assigned_to, t.created_by, t.due_date, t.start_date, t.created_at, t.updated_at,
            u_assignee.name AS assignee_name, u_assignee.email AS assignee_email, u_assignee.department AS assignee_dept,
            u_creator.name AS creator_name
        FROM tasks t
        INNER JOIN users u_assignee ON t.assigned_to = u_assignee.id
        INNER JOIN users u_creator ON t.created_by = u_creator.id
        WHERE t.id = ?
    ');
    $fetchStmt->bind_param('i', $id);
    $fetchStmt->execute();
    $updatedTask = $fetchStmt->get_result()->fetch_assoc();
    $fetchStmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'message' => 'Task updated successfully.',
        'data'    => formatTaskRow($updatedTask)
    ]);
}

/**
 * Handle DELETE requests (Delete Task — Owner only).
 */
function handleDelete(mysqli $conn, array $currentUser, int $businessId, string $currentRole): void {
    if ($currentRole !== 'owner') {
        sendJsonResponse(403, [
            'success' => false,
            'error'   => 'Access denied. Only business Owners have permission to delete tasks.'
        ]);
    }

    $payload = getRequestPayload();
    $idParam = $_GET['id'] ?? ($payload['id'] ?? null);

    if (!$idParam || !filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing task ID for deletion.'
        ]);
    }

    $id = (int)$idParam;

    // Check existence and business scoping
    $checkStmt = $conn->prepare('SELECT id FROM tasks WHERE id = ? AND business_id = ?');
    if (!$checkStmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }
    $checkStmt->bind_param('ii', $id, $businessId);
    $checkStmt->execute();
    if ($checkStmt->get_result()->num_rows === 0) {
        $checkStmt->close();
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Task not found.'
        ]);
    }
    $checkStmt->close();

    // Execute delete
    $stmt = $conn->prepare('DELETE FROM tasks WHERE id = ? AND business_id = ?');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
    }
    $stmt->bind_param('ii', $id, $businessId);
    if (!$stmt->execute()) {
        $stmt->close();
        sendJsonResponse(500, ['success' => false, 'error' => 'Failed to delete task.']);
    }
    $stmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'message' => 'Task deleted successfully.',
        'id'      => $id
    ]);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Validates that an assignee exists, is active, is a team_member, and belongs to the given business.
 */
function validateAssignee(mysqli $conn, int $assigneeId, int $businessId): array {
    $stmt = $conn->prepare('SELECT id, name, role, status, business_id FROM users WHERE id = ?');
    if (!$stmt) {
        return ['valid' => false, 'error' => 'Failed to verify assignee.'];
    }
    $stmt->bind_param('i', $assigneeId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if (!$user) {
        return ['valid' => false, 'error' => 'Assigned user does not exist.'];
    }

    if ((int)$user['business_id'] !== $businessId) {
        return ['valid' => false, 'error' => 'Assigned user does not belong to your business.'];
    }

    if ($user['role'] !== 'team_member') {
        return ['valid' => false, 'error' => 'Tasks can only be assigned to Team Members, not Owners.'];
    }

    if ($user['status'] !== 'active') {
        return ['valid' => false, 'error' => 'Tasks cannot be assigned to an inactive Team Member.'];
    }

    return ['valid' => true, 'user' => $user];
}

/**
 * Format a database task row with clean calculated fields (e.g. task_code, initials).
 */
function formatTaskRow(array $row): array {
    $assigneeName = $row['assignee_name'] ?? 'Unassigned';
    $parts = preg_split('/\s+/', trim($assigneeName));
    $initials = '';
    if (count($parts) >= 2) {
        $initials = strtoupper(mb_substr($parts[0], 0, 1) . mb_substr($parts[1], 0, 1));
    } else {
        $initials = strtoupper(mb_substr($assigneeName, 0, 2));
    }

    return [
        'id'             => (int) $row['id'],
        'task_code'      => 'TASK-' . str_pad((string)$row['id'], 2, '0', STR_PAD_LEFT),
        'business_id'    => (int) $row['business_id'],
        'title'          => $row['title'],
        'description'    => $row['description'] ?? '',
        'desc'           => $row['description'] ?? '', // alias for frontend compatibility
        'status'         => $row['status'],
        'priority'       => $row['priority'],
        'assigned_to'    => (int) $row['assigned_to'],
        'assignee'       => $assigneeName,
        'assignee_email' => $row['assignee_email'] ?? '',
        'assignee_dept'  => $row['assignee_dept'] ?? '',
        'initials'       => $initials ?: 'TM',
        'created_by'     => (int) $row['created_by'],
        'creator_name'   => $row['creator_name'] ?? '',
        'due_date'       => $row['due_date'] ?? '',
        'dueDate'        => $row['due_date'] ?? '', // alias for frontend compatibility
        'start_date'     => $row['start_date'] ?? '',
        'startDate'      => $row['start_date'] ?? '', // alias for frontend compatibility
        'created_at'     => $row['created_at'],
        'updated_at'     => $row['updated_at']
    ];
}
