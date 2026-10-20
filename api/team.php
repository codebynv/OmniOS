<?php
/**
 * OmniOS Team Management API Endpoint
 *
 * Implements prepared statement queries for Owner-managed business team accounts:
 * - GET: List active/inactive Team Members in the authenticated Owner's business
 *        or retrieve single team member detail by ?id=
 * - POST: Create new Team Member (server-side password hashing, role enforcement, business scoping)
 * - PUT/PATCH: Update Team Member profile, reset password, or toggle active/inactive status
 */

// Handle CORS Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/session.php';

$conn = getDbConnection();

// 1. Enforce Authentication (HTTP 401 if unauthenticated)
$currentUser = requireAuth($conn);

// 2. Enforce Role: Only Owners can manage team members (HTTP 403 if team_member)
if ($currentUser['role'] !== 'owner') {
    sendJsonResponse(403, [
        'success' => false,
        'error'   => 'Access denied. Only business Owners have permission to manage team accounts.'
    ]);
}

// 3. Verify valid business context
$businessId = isset($currentUser['business_id']) ? (int) $currentUser['business_id'] : 0;
if ($businessId <= 0) {
    sendJsonResponse(403, [
        'success' => false,
        'error'   => 'Access denied. User is not associated with a valid business.'
    ]);
}

$ownerId = (int) $currentUser['id'];
$method  = $_SERVER['REQUEST_METHOD'];

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
        handleGet($conn, $currentUser, $businessId);
        break;

    case 'POST':
        handlePost($conn, $currentUser, $businessId, $ownerId);
        break;

    case 'PUT':
    case 'PATCH':
        handlePutOrPatch($conn, $currentUser, $businessId);
        break;

    default:
        sendJsonResponse(405, [
            'success' => false,
            'error'   => 'Method not allowed. Supported methods: GET, POST, PUT, PATCH.'
        ]);
        break;
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Handle GET requests (List or single member detail).
 */
function handleGet(mysqli $conn, array $currentUser, int $businessId): void {
    // 1. Single Member Detail Request: ?id=
    if (isset($_GET['id'])) {
        $idParam = $_GET['id'];
        if (!filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
            sendJsonResponse(400, [
                'success' => false,
                'error'   => 'Invalid team member ID.'
            ]);
        }

        $id = (int) $idParam;
        $stmt = $conn->prepare('
            SELECT id, name, email, company, department, role, status, created_by, created_at, updated_at 
            FROM users 
            WHERE id = ? AND business_id = ? AND role = "team_member"
        ');
        if (!$stmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
        }

        $stmt->bind_param('ii', $id, $businessId);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($member = $result->fetch_assoc()) {
            $stmt->close();
            sendJsonResponse(200, [
                'success' => true,
                'data'    => formatMemberProfile($member)
            ]);
        } else {
            $stmt->close();
            // Non-disclosing 404 for cross-business or nonexistent member
            sendJsonResponse(404, [
                'success' => false,
                'error'   => 'Team member not found.'
            ]);
        }
    }

    // 2. List Team Members in the Authenticated Business
    $stmt = $conn->prepare('
        SELECT id, name, email, company, department, role, status, created_by, created_at, updated_at 
        FROM users 
        WHERE business_id = ? AND role = "team_member" 
        ORDER BY id ASC
    ');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }

    $stmt->bind_param('i', $businessId);
    $stmt->execute();
    $result = $stmt->get_result();

    $members       = [];
    $activeCount   = 0;
    $inactiveCount = 0;

    while ($row = $result->fetch_assoc()) {
        $formatted = formatMemberProfile($row);
        $members[] = $formatted;
        if ($formatted['status'] === 'active') {
            $activeCount++;
        } else {
            $inactiveCount++;
        }
    }
    $stmt->close();

    sendJsonResponse(200, [
        'success'        => true,
        'data'           => $members,
        'total'          => count($members),
        'active_count'   => $activeCount,
        'inactive_count' => $inactiveCount
    ]);
}

/**
 * Handle POST requests (Create Team Member).
 */
function handlePost(mysqli $conn, array $currentUser, int $businessId, int $ownerId): void {
    $payload = getRequestPayload();

    $name       = isset($payload['name']) ? trim((string)$payload['name']) : '';
    $email      = isset($payload['email']) ? trim((string)$payload['email']) : '';
    $department = isset($payload['department']) && trim((string)$payload['department']) !== '' 
                    ? trim((string)$payload['department']) 
                    : 'General';
    $password   = isset($payload['password']) ? (string)$payload['password'] : '';

    $errors = [];

    // Validation
    if ($name === '') {
        $errors[] = 'Team member name is required.';
    } elseif (mb_strlen($name) < 2) {
        $errors[] = 'Name must be at least 2 characters.';
    } elseif (mb_strlen($name) > 100) {
        $errors[] = 'Name cannot exceed 100 characters.';
    }

    if ($email === '') {
        $errors[] = 'Email address is required.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please provide a valid email address.';
    } elseif (mb_strlen($email) > 150) {
        $errors[] = 'Email cannot exceed 150 characters.';
    }

    if (mb_strlen($department) > 100) {
        $errors[] = 'Department cannot exceed 100 characters.';
    }

    if ($password === '') {
        $errors[] = 'Initial password is required.';
    } elseif (strlen($password) < 8) {
        $errors[] = 'Initial password must be at least 8 characters.';
    }

    if (!empty($errors)) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => implode(' ', $errors),
            'errors'  => $errors
        ]);
    }

    // Email Uniqueness Check (against unified users table)
    $checkStmt = $conn->prepare('SELECT id FROM users WHERE email = ?');
    if ($checkStmt) {
        $checkStmt->bind_param('s', $email);
        $checkStmt->execute();
        if ($checkStmt->get_result()->num_rows > 0) {
            $checkStmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'A user account with this email address already exists.'
            ]);
        }
        $checkStmt->close();
    }

    // Hash password with PHP password_hash()
    $passwordHash = password_hash($password, PASSWORD_DEFAULT);
    $company      = !empty($currentUser['business_name']) ? $currentUser['business_name'] : $currentUser['company'];

    // Insert new team member (strictly server-assigned business_id, role, status, creator)
    $stmt = $conn->prepare('
        INSERT INTO users (name, email, business_id, company, department, role, status, password_hash, created_by)
        VALUES (?, ?, ?, ?, ?, "team_member", "active", ?, ?)
    ');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
    }

    $stmt->bind_param('ssisssi', $name, $email, $businessId, $company, $department, $passwordHash, $ownerId);

    if (!$stmt->execute()) {
        if ($stmt->errno === 1062) {
            $stmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'A user account with this email address already exists.'
            ]);
        }
        $stmt->close();
        sendJsonResponse(500, [
            'success' => false,
            'error'   => 'Failed to create team member record.'
        ]);
    }

    $newId = (int)$stmt->insert_id;
    $stmt->close();

    sendJsonResponse(201, [
        'success' => true,
        'message' => 'Team member created successfully.',
        'data'    => [
            'id'          => $newId,
            'name'        => $name,
            'email'       => $email,
            'business_id' => $businessId,
            'company'     => $company,
            'department'  => $department,
            'role'        => 'team_member',
            'status'      => 'active',
            'created_by'  => $ownerId,
            'created_at'  => date('Y-m-d H:i:s')
        ]
    ]);
}

/**
 * Handle PUT/PATCH requests (Update profile, reset password, activate/deactivate).
 */
function handlePutOrPatch(mysqli $conn, array $currentUser, int $businessId): void {
    $payload = getRequestPayload();

    $idParam = $_GET['id'] ?? ($payload['id'] ?? null);
    if (!$idParam || !filter_var($idParam, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]])) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => 'Invalid or missing team member ID.'
        ]);
    }

    $id = (int)$idParam;

    // Verify member exists in the Owner's business and has role team_member
    $checkStmt = $conn->prepare('
        SELECT id, name, email, department, status, company, created_by, created_at 
        FROM users 
        WHERE id = ? AND business_id = ? AND role = "team_member"
    ');
    if (!$checkStmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }
    $checkStmt->bind_param('ii', $id, $businessId);
    $checkStmt->execute();
    $result = $checkStmt->get_result();
    $existing = $result->fetch_assoc();
    $checkStmt->close();

    if (!$existing) {
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'Team member not found.'
        ]);
    }

    // Determine updated field values
    $name       = isset($payload['name']) ? trim((string)$payload['name']) : $existing['name'];
    $email      = isset($payload['email']) ? trim((string)$payload['email']) : $existing['email'];
    $department = isset($payload['department']) ? trim((string)$payload['department']) : $existing['department'];
    $status     = isset($payload['status']) ? trim((string)$payload['status']) : $existing['status'];
    $action     = isset($payload['action']) ? trim((string)$payload['action']) : '';

    if ($action === 'activate') {
        $status = 'active';
    } elseif ($action === 'deactivate') {
        $status = 'inactive';
    }

    // Validation
    $errors = [];
    if ($name === '') {
        $errors[] = 'Team member name cannot be empty.';
    } elseif (mb_strlen($name) < 2) {
        $errors[] = 'Name must be at least 2 characters.';
    } elseif (mb_strlen($name) > 100) {
        $errors[] = 'Name cannot exceed 100 characters.';
    }

    if ($email === '') {
        $errors[] = 'Email cannot be empty.';
    } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Please provide a valid email address.';
    } elseif (mb_strlen($email) > 150) {
        $errors[] = 'Email cannot exceed 150 characters.';
    }

    if (mb_strlen($department) > 100) {
        $errors[] = 'Department cannot exceed 100 characters.';
    }

    if (!in_array($status, ['active', 'inactive'], true)) {
        $errors[] = 'Status must be either active or inactive.';
    }

    $password = isset($payload['password']) ? (string)$payload['password'] : '';
    if ($password !== '' && strlen($password) < 8) {
        $errors[] = 'New password must be at least 8 characters.';
    }

    if (!empty($errors)) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => implode(' ', $errors),
            'errors'  => $errors
        ]);
    }

    // Email uniqueness check (if changed)
    if ($email !== $existing['email']) {
        $dupStmt = $conn->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
        if ($dupStmt) {
            $dupStmt->bind_param('si', $email, $id);
            $dupStmt->execute();
            if ($dupStmt->get_result()->num_rows > 0) {
                $dupStmt->close();
                sendJsonResponse(409, [
                    'success' => false,
                    'error'   => 'Another user account with this email address already exists.'
                ]);
            }
            $dupStmt->close();
        }
    }

    // Execute update
    if ($password !== '') {
        $newHash = password_hash($password, PASSWORD_DEFAULT);
        $stmt = $conn->prepare('
            UPDATE users 
            SET name = ?, email = ?, department = ?, status = ?, password_hash = ? 
            WHERE id = ? AND business_id = ? AND role = "team_member"
        ');
        if (!$stmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
        }
        $stmt->bind_param('sssssii', $name, $email, $department, $status, $newHash, $id, $businessId);
    } else {
        $stmt = $conn->prepare('
            UPDATE users 
            SET name = ?, email = ?, department = ?, status = ? 
            WHERE id = ? AND business_id = ? AND role = "team_member"
        ');
        if (!$stmt) {
            sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
        }
        $stmt->bind_param('ssssii', $name, $email, $department, $status, $id, $businessId);
    }

    if (!$stmt->execute()) {
        if ($stmt->errno === 1062) {
            $stmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'Another user account with this email address already exists.'
            ]);
        }
        $stmt->close();
        sendJsonResponse(500, ['success' => false, 'error' => 'Failed to update team member record.']);
    }
    $stmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'message' => 'Team member updated successfully.',
        'data'    => [
            'id'          => $id,
            'name'        => $name,
            'email'       => $email,
            'business_id' => $businessId,
            'company'     => $existing['company'],
            'department'  => $department,
            'role'        => 'team_member',
            'status'      => $status,
            'created_by'  => (int)$existing['created_by']
        ]
    ]);
}

/**
 * Format sanitized team member profile array (NEVER includes password_hash).
 */
function formatMemberProfile(array $row): array {
    return [
        'id'          => (int)$row['id'],
        'name'        => $row['name'],
        'email'       => $row['email'],
        'company'     => $row['company'],
        'department'  => $row['department'],
        'role'        => $row['role'],
        'status'      => $row['status'],
        'created_by'  => $row['created_by'] !== null ? (int)$row['created_by'] : null,
        'created_at'  => $row['created_at'],
        'updated_at'  => $row['updated_at']
    ];
}
