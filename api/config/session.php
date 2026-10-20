<?php
/**
 * OmniOS Session Management & Authentication Middleware
 * 
 * Configures secure HTTP cookies for local XAMPP and provides
 * authentication verification helpers for protected business endpoints.
 */

require_once __DIR__ . '/db.php';

/**
 * Initialize a secure session if not already active.
 */
function initOmniSession(): void {
    if (session_status() === PHP_SESSION_NONE) {
        // Enforce cookie security parameters
        ini_set('session.cookie_httponly', '1');
        ini_set('session.use_only_cookies', '1');
        ini_set('session.cookie_samesite', 'Lax');
        
        // Session name specific to OmniOS
        session_name('OMNIOS_SESSID');
        session_start();
    }
}

/**
 * Retrieve the currently authenticated user profile from the unified `users` table,
 * or null if unauthenticated, inactive, or invalid role.
 *
 * @param mysqli $conn
 * @return array|null
 */
function getCurrentUser(mysqli $conn): ?array {
    initOmniSession();

    $userId = $_SESSION['user_id'] ?? $_SESSION['owner_id'] ?? null;
    if (!$userId || !is_numeric($userId)) {
        return null;
    }

    $id = (int) $userId;
    $stmt = $conn->prepare('
        SELECT 
            u.id, 
            u.name, 
            u.email, 
            u.business_id, 
            u.company, 
            u.department, 
            u.role, 
            u.status,
            b.name AS business_name
        FROM users u
        INNER JOIN businesses b ON u.business_id = b.id
        WHERE u.id = ?
    ');
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('i', $id);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($user = $result->fetch_assoc()) {
        $stmt->close();

        // Enforce account active status and recognized roles
        if ($user['status'] !== 'active') {
            return null;
        }

        if (!in_array($user['role'], ['owner', 'team_member'], true)) {
            return null;
        }

        if (empty($user['business_id'])) {
            return null;
        }

        return [
            'id'            => (int) $user['id'],
            'name'          => $user['name'],
            'email'         => $user['email'],
            'business_id'   => (int) $user['business_id'],
            'business_name' => $user['business_name'],
            'company'       => $user['company'],
            'department'    => $user['department'],
            'role'          => $user['role'],
            'status'        => $user['status']
        ];
    }

    $stmt->close();
    return null;
}

/**
 * Backwards-compatible alias for getCurrentUser.
 *
 * @param mysqli $conn
 * @return array|null
 */
function getCurrentOwner(mysqli $conn): ?array {
    return getCurrentUser($conn);
}

/**
 * Enforce authentication on protected API endpoints.
 * Terminates with HTTP 401 if no valid user session exists.
 *
 * @param mysqli $conn
 * @return array Authenticated user profile
 */
function requireAuth(mysqli $conn): array {
    $user = getCurrentUser($conn);

    if (!$user) {
        sendJsonResponse(401, [
            'success' => false,
            'error'   => 'Authentication required. Please log in with a valid account.'
        ]);
    }

    return $user;
}

/**
 * Enforce role-based access control on protected API endpoints.
 * Terminates with HTTP 403 if the user lacks the required role.
 *
 * @param mysqli $conn
 * @param array $allowedRoles Array of permitted role strings (e.g. ['owner'])
 * @return array Authenticated user profile
 */
function requireRole(mysqli $conn, array $allowedRoles): array {
    $user = requireAuth($conn);

    if (!in_array($user['role'], $allowedRoles, true)) {
        sendJsonResponse(403, [
            'success' => false,
            'error'   => 'Access denied. You do not have permission to perform this operation.'
        ]);
    }

    return $user;
}

