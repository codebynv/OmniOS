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
 * Retrieve the currently authenticated owner profile, or null if unauthenticated.
 *
 * @param mysqli $conn
 * @return array|null
 */
function getCurrentOwner(mysqli $conn): ?array {
    initOmniSession();

    if (!isset($_SESSION['owner_id']) || !is_numeric($_SESSION['owner_id'])) {
        return null;
    }

    $ownerId = (int) $_SESSION['owner_id'];
    $stmt = $conn->prepare('SELECT id, name, email, company, role FROM owners WHERE id = ?');
    if (!$stmt) {
        return null;
    }

    $stmt->bind_param('i', $ownerId);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($owner = $result->fetch_assoc()) {
        $stmt->close();
        return $owner;
    }

    $stmt->close();
    return null;
}

/**
 * Enforce authentication on protected API endpoints.
 * Terminates with HTTP 401 if no valid owner session exists.
 *
 * @param mysqli $conn
 * @return array Authenticated owner profile
 */
function requireAuth(mysqli $conn): array {
    $owner = getCurrentOwner($conn);

    if (!$owner) {
        sendJsonResponse(401, [
            'success' => false,
            'error'   => 'Authentication required. Please log in as an authorized company owner.'
        ]);
    }

    return $owner;
}
