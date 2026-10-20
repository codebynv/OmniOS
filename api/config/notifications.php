<?php
/**
 * OmniOS Notifications Helper Module
 *
 * Provides reusable functions for creating and formatting genuine business notifications.
 */

require_once __DIR__ . '/db.php';

/**
 * Creates a notification record for a specific user within a business.
 */
function createNotification(
    mysqli $conn,
    int $businessId,
    int $recipientUserId,
    string $type,
    string $title,
    string $message,
    ?string $entityType = null,
    ?int $entityId = null
): bool {
    if ($businessId <= 0 || $recipientUserId <= 0) {
        return false;
    }

    // Verify recipient belongs to the same business
    $stmt = $conn->prepare("SELECT id FROM users WHERE id = ? AND business_id = ? AND status = 'active' LIMIT 1");
    if (!$stmt) return false;
    $stmt->bind_param("ii", $recipientUserId, $businessId);
    $stmt->execute();
    $valid = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$valid) {
        return false;
    }

    $insStmt = $conn->prepare("
        INSERT INTO notifications (business_id, user_id, type, title, message, entity_type, entity_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    if (!$insStmt) return false;

    $insStmt->bind_param("iissssi", $businessId, $recipientUserId, $type, $title, $message, $entityType, $entityId);
    $success = $insStmt->execute();
    $insStmt->close();

    return $success;
}

/**
 * Finds the primary active Owner user ID for a given business.
 */
function getBusinessOwnerId(mysqli $conn, int $businessId): ?int {
    $stmt = $conn->prepare("SELECT id FROM users WHERE business_id = ? AND role = 'owner' AND status = 'active' ORDER BY id ASC LIMIT 1");
    if (!$stmt) return null;
    $stmt->bind_param("i", $businessId);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ? (int) $row['id'] : null;
}

/**
 * Formats a notification row for JSON API responses.
 */
function formatNotificationRow(array $row): array {
    $type = $row['type'] ?? '';
    $icon = '🔔';
    if (strpos($type, 'task') !== false) {
        $icon = '📋';
    } elseif (strpos($type, 'order') !== false) {
        $icon = '📦';
    }

    $createdAt = $row['created_at'];
    $timestamp = strtotime($createdAt);
    $diffSecs = time() - $timestamp;

    if ($diffSecs < 60) {
        $timeStr = 'Just now';
    } elseif ($diffSecs < 3600) {
        $mins = floor($diffSecs / 60);
        $timeStr = "$mins min" . ($mins === 1 ? '' : 's') . ' ago';
    } elseif ($diffSecs < 86400) {
        $hours = floor($diffSecs / 3600);
        $timeStr = "$hours hour" . ($hours === 1 ? '' : 's') . ' ago';
    } else {
        $timeStr = date('d M Y, h:i A', $timestamp);
    }

    $isUnread = empty($row['read_at']);

    return [
        'id'          => (int) $row['id'],
        'business_id' => (int) $row['business_id'],
        'user_id'     => (int) $row['user_id'],
        'type'        => $row['type'],
        'title'       => $row['title'],
        'message'     => $row['message'],
        'desc'        => $row['message'],
        'icon'        => $icon,
        'entity_type' => $row['entity_type'] ?? null,
        'entity_id'   => $row['entity_id'] ? (int) $row['entity_id'] : null,
        'unread'      => $isUnread,
        'read_at'     => $row['read_at'] ?? null,
        'created_at'  => $row['created_at'],
        'time'        => $timeStr
    ];
}
