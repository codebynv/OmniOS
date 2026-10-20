<?php
/**
 * OmniOS User Profile API Endpoint
 *
 * Implements prepared statement queries for authenticated users to manage their own profile:
 * - GET: Fetch current user profile (name, email, department, role, business)
 * - PUT/PATCH: Update own profile (name, email, department)
 * - POST: Change password with current-password verification, secure hashing, and session regeneration
 *
 * Enforces strict tenant and user isolation (users cannot modify other users' profiles).
 * Never permits changing role, business_id, or account permissions.
 */

// Handle CORS Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    $origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '*';
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Allow-Methods: GET, PUT, PATCH, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config/db.php';
require_once __DIR__ . '/config/session.php';

$conn = getDbConnection();

// 1. Enforce Authentication (HTTP 401 if unauthenticated)
$currentUser = requireAuth($conn);

$currentUserId = (int) $currentUser['id'];
$businessId = (int) $currentUser['business_id'];
$method = $_SERVER['REQUEST_METHOD'];

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
 * Validate profile update fields.
 * @param array $data
 * @return array Array of validation error messages (empty if valid)
 */
function validateProfileData(array $data): array {
    $errors = [];

    // Name validation
    if (isset($data['name'])) {
        $name = trim((string) $data['name']);
        if ($name === '') {
            $errors[] = 'Name cannot be empty.';
        } elseif (mb_strlen($name) < 2) {
            $errors[] = 'Name must be at least 2 characters.';
        } elseif (mb_strlen($name) > 100) {
            $errors[] = 'Name cannot exceed 100 characters.';
        }
    }

    // Email validation
    if (isset($data['email'])) {
        $email = trim((string) $data['email']);
        if ($email === '') {
            $errors[] = 'Email cannot be empty.';
        } elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $errors[] = 'Please provide a valid email address.';
        } elseif (mb_strlen($email) > 150) {
            $errors[] = 'Email cannot exceed 150 characters.';
        }
    }

    // Department validation (optional)
    if (isset($data['department']) && mb_strlen(trim((string) $data['department'])) > 100) {
        $errors[] = 'Department cannot exceed 100 characters.';
    }

    return $errors;
}

/**
 * Validate password change fields.
 * @param array $data
 * @return array Array of validation error messages (empty if valid)
 */
function validatePasswordChange(array $data): array {
    $errors = [];

    if (!isset($data['current_password']) || $data['current_password'] === '') {
        $errors[] = 'Current password is required.';
    }

    if (!isset($data['new_password']) || $data['new_password'] === '') {
        $errors[] = 'New password is required.';
    } elseif (strlen($data['new_password']) < 8) {
        $errors[] = 'New password must be at least 8 characters.';
    } elseif (strlen($data['new_password']) > 128) {
        $errors[] = 'New password cannot exceed 128 characters.';
    }

    if (!isset($data['confirm_password']) || $data['confirm_password'] === '') {
        $errors[] = 'Please confirm your new password.';
    } elseif ($data['new_password'] !== $data['confirm_password']) {
        $errors[] = 'New password and confirmation do not match.';
    }

    return $errors;
}

// ============================================================================
// METHOD DISPATCHING
// ============================================================================

switch ($method) {
    case 'GET':
        handleGet($conn, $currentUserId, $businessId);
        break;

    case 'PUT':
    case 'PATCH':
        handleUpdateProfile($conn, $currentUserId, $businessId);
        break;

    case 'POST':
        handleChangePassword($conn, $currentUserId, $businessId);
        break;

    default:
        sendJsonResponse(405, [
            'success' => false,
            'error'   => 'Method not allowed. Supported methods: GET, PUT, PATCH, POST.'
        ]);
        break;
}

// ============================================================================
// HANDLERS
// ============================================================================

/**
 * Handle GET request (Fetch current user profile).
 */
function handleGet(mysqli $conn, int $currentUserId, int $businessId): void {
    $stmt = $conn->prepare('
        SELECT 
            u.id, u.name, u.email, u.business_id, u.company, u.department, u.role, u.status,
            b.name AS business_name
        FROM users u
        INNER JOIN businesses b ON u.business_id = b.id
        WHERE u.id = ? AND u.business_id = ?
    ');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }

    $stmt->bind_param('ii', $currentUserId, $businessId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        $stmt->close();
        sendJsonResponse(200, [
            'success' => true,
            'data'    => [
                'id'            => (int) $user['id'],
                'name'          => $user['name'],
                'email'         => $user['email'],
                'business_id'   => (int) $user['business_id'],
                'business_name' => $user['business_name'],
                'company'       => $user['company'],
                'department'    => $user['department'],
                'role'          => $user['role'],
                'status'        => $user['status']
            ]
        ]);
    } else {
        $stmt->close();
        sendJsonResponse(404, [
            'success' => false,
            'error'   => 'User profile not found.'
        ]);
    }
}

/**
 * Handle PUT/PATCH request (Update own profile).
 * Users can update: name, email, department
 * Users CANNOT change: role, business_id, company, permissions, status
 */
function handleUpdateProfile(mysqli $conn, int $currentUserId, int $businessId): void {
    $payload = getRequestPayload();

    $errors = validateProfileData($payload);
    if (!empty($errors)) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => implode(' ', $errors),
            'errors'  => $errors
        ]);
    }

    // Fetch current user to verify existing email
    $checkStmt = $conn->prepare('SELECT email FROM users WHERE id = ? AND business_id = ?');
    if (!$checkStmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }
    $checkStmt->bind_param('ii', $currentUserId, $businessId);
    $checkStmt->execute();
    $existing = $checkStmt->get_result()->fetch_assoc();
    $checkStmt->close();

    if (!$existing) {
        sendJsonResponse(404, ['success' => false, 'error' => 'User not found.']);
    }

    $name       = isset($payload['name']) ? trim((string) $payload['name']) : $existing['name'];
    $email      = isset($payload['email']) ? trim((string) $payload['email']) : $existing['email'];
    $department = isset($payload['department']) ? trim((string) $payload['department']) : '';

    // Email uniqueness check (if changed)
    if ($email !== $existing['email']) {
        $dupStmt = $conn->prepare('SELECT id FROM users WHERE email = ? AND id != ?');
        if ($dupStmt) {
            $dupStmt->bind_param('si', $email, $currentUserId);
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

    // Execute update (only allowed fields: name, email, department)
    $stmt = $conn->prepare('
        UPDATE users 
        SET name = ?, email = ?, department = ? 
        WHERE id = ? AND business_id = ?
    ');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
    }

    $stmt->bind_param('sssii', $name, $email, $department, $currentUserId, $businessId);

    if (!$stmt->execute()) {
        if ($stmt->errno === 1062) {
            $stmt->close();
            sendJsonResponse(409, [
                'success' => false,
                'error'   => 'Another user account with this email address already exists.'
            ]);
        }
        $stmt->close();
        sendJsonResponse(500, ['success' => false, 'error' => 'Failed to update profile.']);
    }
    $stmt->close();

    // Fetch updated profile
    $fetchStmt = $conn->prepare('
        SELECT 
            u.id, u.name, u.email, u.business_id, u.company, u.department, u.role, u.status,
            b.name AS business_name
        FROM users u
        INNER JOIN businesses b ON u.business_id = b.id
        WHERE u.id = ? AND u.business_id = ?
    ');
    $fetchStmt->bind_param('ii', $currentUserId, $businessId);
    $fetchStmt->execute();
    $updated = $fetchStmt->get_result()->fetch_assoc();
    $fetchStmt->close();

    sendJsonResponse(200, [
        'success' => true,
        'message' => 'Profile updated successfully.',
        'data'    => [
            'id'            => (int) $updated['id'],
            'name'          => $updated['name'],
            'email'         => $updated['email'],
            'business_id'   => (int) $updated['business_id'],
            'business_name' => $updated['business_name'],
            'company'       => $updated['company'],
            'department'    => $updated['department'],
            'role'          => $updated['role'],
            'status'        => $updated['status']
        ]
    ]);
}

/**
 * Handle POST request (Change password).
 * Requires current password verification, then securely hashes new password
 * and regenerates session to protect against session fixation.
 */
function handleChangePassword(mysqli $conn, int $currentUserId, int $businessId): void {
    $payload = getRequestPayload();

    $errors = validatePasswordChange($payload);
    if (!empty($errors)) {
        sendJsonResponse(400, [
            'success' => false,
            'error'   => implode(' ', $errors),
            'errors'  => $errors
        ]);
    }

    $currentPassword = $payload['current_password'];
    $newPassword     = $payload['new_password'];

    // Fetch current password hash
    $stmt = $conn->prepare('SELECT password_hash FROM users WHERE id = ? AND business_id = ?');
    if (!$stmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Query preparation failed.']);
    }
    $stmt->bind_param('ii', $currentUserId, $businessId);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();
    $stmt->close();

    if (!$user) {
        sendJsonResponse(404, ['success' => false, 'error' => 'User not found.']);
    }

    // Verify current password
    if (!password_verify($currentPassword, $user['password_hash'])) {
        sendJsonResponse(401, [
            'success' => false,
            'error'   => 'Current password is incorrect.'
        ]);
    }

    // Hash new password with PHP password_hash()
    $newHash = password_hash($newPassword, PASSWORD_DEFAULT);

    // Update password hash
    $upStmt = $conn->prepare('UPDATE users SET password_hash = ? WHERE id = ? AND business_id = ?');
    if (!$upStmt) {
        sendJsonResponse(500, ['success' => false, 'error' => 'Database query preparation failed.']);
    }
    $upStmt->bind_param('sii', $newHash, $currentUserId, $businessId);

    if (!$upStmt->execute()) {
        $upStmt->close();
        sendJsonResponse(500, ['success' => false, 'error' => 'Failed to update password.']);
    }
    $upStmt->close();

    // Regenerate session ID to protect against session fixation after password change
    session_regenerate_id(true);

    sendJsonResponse(200, [
        'success' => true,
        'message' => 'Password changed successfully. Please log in again with your new password.'
    ]);
}