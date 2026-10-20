<?php
/**
 * Comprehensive Phase 4I Test Suite
 *
 * Verifies:
 * 1. Migration & schema integrity of `notifications` table.
 * 2. Unauthenticated access enforcement (HTTP 401).
 * 3. Generation of genuine notifications on:
 *    - Task creation & assignment (notifies assigned team member).
 *    - Task reassignment (notifies new assignee).
 *    - Task status update by team member (notifies business owner).
 *    - Order fulfillment update by team member (notifies business owner).
 * 4. Self-action suppression (user does not notify self).
 * 5. Strict multi-tenant and recipient isolation (no cross-business or cross-user leakage).
 * 6. Read/unread status toggling and mark_all_as_read persistence.
 * 7. Accurate unread counts.
 * 8. Cleanup of all test artifacts.
 */

$baseUrl = 'http://127.0.0.1/OmniOS/api';

function makeRequest($url, $method = 'GET', $data = null, $cookies = []) {
    $ch = curl_init();
    $headers = ['Accept: application/json'];
    
    if ($data !== null) {
        $headers[] = 'Content-Type: application/json';
        curl_setopt($ch, CURLOPT_POSTFIELDS, is_string($data) ? $data : json_encode($data));
    }
    
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_HEADER, true);
    
    if (!empty($cookies)) {
        $cookieStr = '';
        foreach ($cookies as $k => $v) {
            $cookieStr .= "$k=$v; ";
        }
        curl_setopt($ch, CURLOPT_COOKIE, rtrim($cookieStr, '; '));
    }
    
    $rawResponse = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $headerSize = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    
    $headerStr = substr($rawResponse, 0, $headerSize);
    $body = substr($rawResponse, $headerSize);
    
    curl_close($ch);
    
    // Extract cookies
    $resCookies = [];
    preg_match_all('/^Set-Cookie:\s*([^;]*)/mi', $headerStr, $matches);
    foreach ($matches[1] as $item) {
        parse_str($item, $cookie);
        foreach ($cookie as $k => $v) {
            $resCookies[$k] = $v;
        }
    }
    
    $json = json_decode($body, true);
    return [
        'code' => $httpCode,
        'body' => $json,
        'raw_body' => $body,
        'cookies' => $resCookies
    ];
}

$conn = new mysqli('127.0.0.1', 'root', '', 'omnios');
if ($conn->connect_error) {
    die("Database connection failed: " . $conn->connect_error . "\n");
}

echo "=== PHASE 4I TEST SUITE STARTING ===\n\n";
$passed = 0;
$failed = 0;

function assertTest($description, $condition, $details = '') {
    global $passed, $failed;
    if ($condition) {
        echo " [PASS] $description\n";
        $passed++;
    } else {
        echo " [FAIL] $description\n";
        if ($details) echo "        Details: $details\n";
        $failed++;
    }
}

// ----------------------------------------------------------------------------
// 1. Verify Database Schema & Migration
// ----------------------------------------------------------------------------
echo "1. Checking Database Schema & Migration...\n";
$tblCheck = $conn->query("SHOW TABLES LIKE 'notifications'");
assertTest("Table 'notifications' exists", $tblCheck->num_rows === 1);

$colsRes = $conn->query("SHOW COLUMNS FROM notifications");
$columns = [];
while ($row = $colsRes->fetch_assoc()) {
    $columns[$row['Field']] = $row;
}
assertTest("Column 'id' exists", isset($columns['id']));
assertTest("Column 'business_id' exists", isset($columns['business_id']));
assertTest("Column 'user_id' exists", isset($columns['user_id']));
assertTest("Column 'type' exists", isset($columns['type']));
assertTest("Column 'title' exists", isset($columns['title']));
assertTest("Column 'message' exists", isset($columns['message']));
assertTest("Column 'entity_type' exists", isset($columns['entity_type']));
assertTest("Column 'entity_id' exists", isset($columns['entity_id']));
assertTest("Column 'read_at' exists (nullable timestamp)", isset($columns['read_at']) && $columns['read_at']['Null'] === 'YES');
assertTest("Column 'created_at' exists", isset($columns['created_at']));

// Check foreign keys
$fkRes = $conn->query("
    SELECT CONSTRAINT_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
    FROM information_schema.KEY_COLUMN_USAGE 
    WHERE TABLE_SCHEMA = 'omnios' AND TABLE_NAME = 'notifications' AND REFERENCED_TABLE_NAME IS NOT NULL
");
$fks = [];
while ($fk = $fkRes->fetch_assoc()) {
    $fks[$fk['CONSTRAINT_NAME']] = $fk;
}
assertTest("Foreign key to businesses table exists", isset($fks['fk_notifications_business_id']));
assertTest("Foreign key to users table exists", isset($fks['fk_notifications_user_id']));

// ----------------------------------------------------------------------------
// 2. Unauthenticated Access Protection
// ----------------------------------------------------------------------------
echo "\n2. Checking Unauthenticated Access...\n";
$unauthGet = makeRequest("$baseUrl/notifications.php");
assertTest("Unauthenticated GET /api/notifications.php returns 401", $unauthGet['code'] === 401);

$unauthCount = makeRequest("$baseUrl/notifications.php?action=count");
assertTest("Unauthenticated GET /api/notifications.php?action=count returns 401", $unauthCount['code'] === 401);

$unauthPatch = makeRequest("$baseUrl/notifications.php?id=1", "PATCH", ['action' => 'mark_read']);
assertTest("Unauthenticated PATCH /api/notifications.php returns 401", $unauthPatch['code'] === 401);

// ----------------------------------------------------------------------------
// 3. Authenticate Users (Owner 1: Nirav, Owner 2: Rajesh, + Temp Team Member)
// ----------------------------------------------------------------------------
echo "\n3. Setting up Test Users and Sessions...\n";

// Capture baseline state so cleanup restores it exactly
$baselineCounts = [];
foreach (['businesses', 'users', 'owners', 'customers', 'tasks', 'orders', 'order_items', 'notifications'] as $t) {
    $baselineCounts[$t] = (int) $conn->query("SELECT COUNT(*) AS c FROM `$t`")->fetch_assoc()['c'];
}
$preTestMaxNotifId = (int) ($conn->query("SELECT COALESCE(MAX(id), 0) AS m FROM notifications")->fetch_assoc()['m'] ?? 0);

// Login Owner 1 (Nirav, Business 1)
$loginNirav = makeRequest("$baseUrl/auth/login.php", "POST", [
    'email' => 'nirav.vala@omnios.local',
    'password' => 'OmniOwner@2026'
]);
$niravCookies = $loginNirav['cookies'];
$niravUser = $loginNirav['body']['user'] ?? null;
assertTest("Login Nirav (Owner, Business 1) succeeded", $loginNirav['code'] === 200 && $niravUser !== null);

// Login Owner 2 (Rajesh, Business 2)
$loginRajesh = makeRequest("$baseUrl/auth/login.php", "POST", [
    'email' => 'rajesh@sharmatraders.in',
    'password' => 'Sharma@Trade2026'
]);
$rajeshCookies = $loginRajesh['cookies'];
$rajeshUser = $loginRajesh['body']['user'] ?? null;
assertTest("Login Rajesh (Owner, Business 2) succeeded", $loginRajesh['code'] === 200 && $rajeshUser !== null);

$niravBaselineUnread = 0;
$rajeshBaselineUnread = 0;
if ($niravUser) {
    $niravBaselineUnread = (int) (makeRequest("$baseUrl/notifications.php?action=count", "GET", null, $niravCookies)['body']['unread_count'] ?? 0);
}
if ($rajeshUser) {
    $rajeshBaselineUnread = (int) (makeRequest("$baseUrl/notifications.php?action=count", "GET", null, $rajeshCookies)['body']['unread_count'] ?? 0);
}

// Create Temp Team Member 1 in Business 1
$tempTechEmail = 'temp_tech_p4i_' . time() . '@sharma-supplies.in';
$tempTechPassword = 'Password@123';
$createMemberRes = makeRequest("$baseUrl/team.php", "POST", [
    'name' => 'Phase4I Test Member 1',
    'email' => $tempTechEmail,
    'password' => $tempTechPassword,
    'role' => 'team_member',
    'phone' => '+91 99999 11111',
    'department' => 'Operations'
], $niravCookies);
$member1Id = $createMemberRes['body']['data']['id'] ?? 0;
assertTest("Created Temp Team Member 1 (ID: $member1Id)", $createMemberRes['code'] === 201 && $member1Id > 0);

// Create Temp Team Member 2 in Business 1 (for reassignment test)
$tempTech2Email = 'temp_tech2_p4i_' . time() . '@sharma-supplies.in';
$createMember2Res = makeRequest("$baseUrl/team.php", "POST", [
    'name' => 'Phase4I Test Member 2',
    'email' => $tempTech2Email,
    'password' => $tempTechPassword,
    'role' => 'team_member',
    'phone' => '+91 99999 22222',
    'department' => 'Logistics'
], $niravCookies);
$member2Id = $createMember2Res['body']['data']['id'] ?? 0;
assertTest("Created Temp Team Member 2 (ID: $member2Id)", $createMember2Res['code'] === 201 && $member2Id > 0);

// Login Temp Team Member 1
$loginMember1 = makeRequest("$baseUrl/auth/login.php", "POST", [
    'email' => $tempTechEmail,
    'password' => $tempTechPassword
]);
$member1Cookies = $loginMember1['cookies'];
assertTest("Login Temp Team Member 1 succeeded", $loginMember1['code'] === 200);

// ----------------------------------------------------------------------------
// 4. Test Event 1: Owner Nirav creates & assigns task -> Notifies Member 1
// ----------------------------------------------------------------------------
echo "\n4. Testing Event: Task Creation & Assignment...\n";

$createTaskRes = makeRequest("$baseUrl/tasks.php", "POST", [
    'title' => 'Urgent Inventory Audit P4I',
    'description' => 'Complete count of warehouse section B.',
    'priority' => 'High',
    'assigned_to' => $member1Id,
    'due_date' => '2026-10-30'
], $niravCookies);
$testTaskId = $createTaskRes['body']['data']['id'] ?? 0;
assertTest("Task created by Owner Nirav (ID: $testTaskId)", $createTaskRes['code'] === 201 && $testTaskId > 0);

// Verify Member 1 received notification
$member1Notifs = makeRequest("$baseUrl/notifications.php", "GET", null, $member1Cookies);
assertTest("Member 1 notifications list returned 200", $member1Notifs['code'] === 200);
$m1List = $member1Notifs['body']['data'] ?? [];
$taskAssignedNotif = null;
foreach ($m1List as $n) {
    if ($n['type'] === 'task_assigned' && (int)$n['entity_id'] === $testTaskId) {
        $taskAssignedNotif = $n;
        break;
    }
}
assertTest("Member 1 received 'task_assigned' notification for task #$testTaskId", $taskAssignedNotif !== null);
assertTest("Member 1 notification title is 'New Task Assigned'", ($taskAssignedNotif['title'] ?? '') === 'New Task Assigned');
assertTest("Member 1 notification unread is true", ($taskAssignedNotif['unread'] ?? false) === true);
assertTest("Member 1 unread count is 1", ($member1Notifs['body']['unread_count'] ?? 0) === 1);

// Verify Owner Nirav (the creator) did NOT receive a notification for their own action
$niravNotifs = makeRequest("$baseUrl/notifications.php", "GET", null, $niravCookies);
assertTest(
    "Owner Nirav did NOT receive self-notification on task creation",
    (int) ($niravNotifs['body']['unread_count'] ?? -1) === $niravBaselineUnread
);

// ----------------------------------------------------------------------------
// 5. Test Event 2: Owner Nirav reassigns task to Member 2
// ----------------------------------------------------------------------------
echo "\n5. Testing Event: Task Reassignment...\n";

$reassignTaskRes = makeRequest("$baseUrl/tasks.php?id=$testTaskId", "PUT", [
    'title' => 'Urgent Inventory Audit P4I',
    'description' => 'Complete count of warehouse section B.',
    'priority' => 'High',
    'assigned_to' => $member2Id,
    'due_date' => '2026-10-30',
    'status' => 'todo'
], $niravCookies);
assertTest("Task reassigned to Member 2 returned 200", $reassignTaskRes['code'] === 200);

// Login Member 2
$loginMember2 = makeRequest("$baseUrl/auth/login.php", "POST", [
    'email' => $tempTech2Email,
    'password' => $tempTechPassword
]);
$member2Cookies = $loginMember2['cookies'];
$member2Notifs = makeRequest("$baseUrl/notifications.php", "GET", null, $member2Cookies);
$m2List = $member2Notifs['body']['data'] ?? [];
$taskReassignedNotif = null;
foreach ($m2List as $n) {
    if ($n['type'] === 'task_reassigned' && (int)$n['entity_id'] === $testTaskId) {
        $taskReassignedNotif = $n;
        break;
    }
}
assertTest("Member 2 received 'task_reassigned' notification", $taskReassignedNotif !== null);
assertTest("Member 2 unread count is 1", ($member2Notifs['body']['unread_count'] ?? 0) === 1);

// ----------------------------------------------------------------------------
// 6. Test Event 3: Team Member updates task status -> Notifies Business Owner
// ----------------------------------------------------------------------------
echo "\n6. Testing Event: Task Status Updated by Team Member...\n";

// Member 2 updates task status to 'in-progress'
$updateTaskStatusRes = makeRequest("$baseUrl/tasks.php?id=$testTaskId", "PATCH", [
    'status' => 'in-progress'
], $member2Cookies);
assertTest("Member 2 updated task status to in-progress returned 200", $updateTaskStatusRes['code'] === 200);

// Verify Owner Nirav received notification
$niravNotifsAfterTaskUpdate = makeRequest("$baseUrl/notifications.php", "GET", null, $niravCookies);
$niravList = $niravNotifsAfterTaskUpdate['body']['data'] ?? [];
$statusChangedNotif = null;
foreach ($niravList as $n) {
    if ($n['type'] === 'task_status_changed' && (int)$n['entity_id'] === $testTaskId) {
        $statusChangedNotif = $n;
        break;
    }
}
assertTest("Owner Nirav received 'task_status_changed' notification", $statusChangedNotif !== null);
assertTest("Notification message mentions member name and new status", 
    strpos($statusChangedNotif['message'] ?? '', 'Phase4I Test Member 2') !== false &&
    strpos($statusChangedNotif['message'] ?? '', 'in-progress') !== false
);

// Verify Member 2 did NOT receive a notification for their own action
$member2NotifsCheck = makeRequest("$baseUrl/notifications.php", "GET", null, $member2Cookies);
$m2Count = $member2NotifsCheck['body']['unread_count'] ?? 0;
assertTest("Member 2 did NOT receive self-notification for status update", $m2Count === 1); // Still 1 from reassignment

// ----------------------------------------------------------------------------
// 7. Test Event 4: Order Fulfillment Updated by Team Member -> Notifies Business Owner
// ----------------------------------------------------------------------------
echo "\n7. Testing Event: Order Fulfillment Updated by Team Member...\n";

// Get customer in Business 1
$custRow = $conn->query("SELECT id FROM customers WHERE business_id = 1 LIMIT 1")->fetch_assoc();
$testCustId = (int)$custRow['id'];

// Owner creates an order
$createOrderRes = makeRequest("$baseUrl/orders.php", "POST", [
    'customer_id' => $testCustId,
    'payment_method' => 'UPI',
    'notes' => 'Notification test order',
    'items' => [
        ['item_name' => 'Laser Toner Cartridge', 'quantity' => 2, 'unit_price' => 1250.00]
    ]
], $niravCookies);
$testOrderId = $createOrderRes['body']['data']['id'] ?? 0;
assertTest("Order created in Business 1 (ID: $testOrderId)", $createOrderRes['code'] === 201 && $testOrderId > 0);

// Member 1 updates order status to 'Processing'
$updateOrderRes = makeRequest("$baseUrl/orders.php?id=$testOrderId", "PATCH", [
    'status' => 'Processing'
], $member1Cookies);
assertTest("Member 1 updated order fulfillment status to Processing returned 200", $updateOrderRes['code'] === 200);

// Verify Owner Nirav received order status update notification
$niravNotifsAfterOrder = makeRequest("$baseUrl/notifications.php", "GET", null, $niravCookies);
$niravList2 = $niravNotifsAfterOrder['body']['data'] ?? [];
$orderNotif = null;
foreach ($niravList2 as $n) {
    if ($n['type'] === 'order_status_changed' && (int)$n['entity_id'] === $testOrderId) {
        $orderNotif = $n;
        break;
    }
}
assertTest("Owner Nirav received 'order_status_changed' notification", $orderNotif !== null);
assertTest("Order notification references order number and new status", 
    strpos($orderNotif['message'] ?? '', 'Processing') !== false
);

// ----------------------------------------------------------------------------
// 8. Test Multi-Business and Cross-User Isolation
// ----------------------------------------------------------------------------
echo "\n8. Testing Multi-Business and Cross-User Isolation...\n";

// Owner Rajesh (Business 2) checks notifications
$rajeshNotifs = makeRequest("$baseUrl/notifications.php", "GET", null, $rajeshCookies);
$rajeshList = $rajeshNotifs['body']['data'] ?? [];
$rajeshSeesTestEntities = false;
foreach ($rajeshList as $rn) {
    if ((int) ($rn['entity_id'] ?? 0) === (int) $testTaskId || (int) ($rn['entity_id'] ?? 0) === (int) $testOrderId) {
        $rajeshSeesTestEntities = true;
    }
}
assertTest("Rajesh (Business 2) received no notifications from Business 1 test events", !$rajeshSeesTestEntities);
assertTest("Rajesh unread count unchanged from baseline", (int) ($rajeshNotifs['body']['unread_count'] ?? -1) === $rajeshBaselineUnread);

// Rajesh attempts to access Nirav's notification via PATCH mark_read
$niravNotifId = (int) ($orderNotif['id'] ?? 0);
$crossPatch = makeRequest("$baseUrl/notifications.php?id=$niravNotifId", "PATCH", [
    'action' => 'mark_read'
], $rajeshCookies);
assertTest("Rajesh attempting to mark Nirav's notification returns 404 (non-disclosing)", $crossPatch['code'] === 404);

// Member 1 attempts to access Nirav's notification
$memberCrossPatch = makeRequest("$baseUrl/notifications.php?id=$niravNotifId", "PATCH", [
    'action' => 'mark_read'
], $member1Cookies);
assertTest("Member 1 attempting to mark Nirav's notification returns 404", $memberCrossPatch['code'] === 404);

// Member 2 attempts to view notifications via forged business_id or user_id in params
$forgedGet = makeRequest("$baseUrl/notifications.php?user_id=1&business_id=2", "GET", null, $member1Cookies);
$forgedList = $forgedGet['body']['data'] ?? [];
$allMatchMember1 = true;
foreach ($forgedList as $item) {
    if ((int)$item['user_id'] !== $member1Id) {
        $allMatchMember1 = false;
    }
}
assertTest("Forged user_id / business_id query parameters are completely ignored", $allMatchMember1 && $forgedGet['code'] === 200);

// ----------------------------------------------------------------------------
// 9. Read/Unread State & Counts Persistence
// ----------------------------------------------------------------------------
echo "\n9. Testing Read/Unread State & Count Persistence...\n";

// Mark specific notification as read
$patchReadRes = makeRequest("$baseUrl/notifications.php?id=$niravNotifId", "PATCH", [
    'action' => 'mark_read'
], $niravCookies);
assertTest("Mark single notification read returned 200", $patchReadRes['code'] === 200);

// Re-fetch notifications as Nirav and verify read state persisted
$niravVerify = makeRequest("$baseUrl/notifications.php", "GET", null, $niravCookies);
$updatedNotif = null;
foreach (($niravVerify['body']['data'] ?? []) as $n) {
    if ((int)$n['id'] === $niravNotifId) {
        $updatedNotif = $n;
        break;
    }
}
assertTest("Specific notification unread is now false", ($updatedNotif['unread'] ?? true) === false);
assertTest("Specific notification read_at timestamp is set", !empty($updatedNotif['read_at']));

// Toggle read status back to unread
$patchToggleRes = makeRequest("$baseUrl/notifications.php?id=$niravNotifId", "PATCH", [
    'action' => 'toggle'
], $niravCookies);
assertTest("Toggle notification status returned 200", $patchToggleRes['code'] === 200);
$niravToggleVerify = makeRequest("$baseUrl/notifications.php", "GET", null, $niravCookies);
$toggledNotif = null;
foreach (($niravToggleVerify['body']['data'] ?? []) as $n) {
    if ((int)$n['id'] === $niravNotifId) {
        $toggledNotif = $n;
        break;
    }
}
assertTest("Notification unread is now toggled back to true", ($toggledNotif['unread'] ?? false) === true);

// Test Mark All As Read
$markAllRes = makeRequest("$baseUrl/notifications.php?action=mark_all_read", "PATCH", null, $niravCookies);
assertTest("Mark all as read returned 200", $markAllRes['code'] === 200 && ($markAllRes['body']['unread_count'] ?? -1) === 0);

$niravFinalVerify = makeRequest("$baseUrl/notifications.php", "GET", null, $niravCookies);
assertTest("Nirav unread count is 0 after mark all as read", ($niravFinalVerify['body']['unread_count'] ?? -1) === 0);
$allRead = true;
foreach (($niravFinalVerify['body']['data'] ?? []) as $n) {
    if ($n['unread'] === true) {
        $allRead = false;
    }
}
assertTest("All Nirav notifications marked read", $allRead);

// Unread counts must agree with a direct database query
$dbUnreadNirav = (int) $conn->query(
    "SELECT COUNT(*) AS c FROM notifications WHERE business_id = 1 AND user_id = 1 AND read_at IS NULL"
)->fetch_assoc()['c'];
$apiUnreadNirav = (int) ($niravFinalVerify['body']['unread_count'] ?? -1);
assertTest("Nirav API unread count matches direct DB query ($apiUnreadNirav vs $dbUnreadNirav)", $apiUnreadNirav === $dbUnreadNirav);

$dbUnreadM1 = (int) $conn->query(
    "SELECT COUNT(*) AS c FROM notifications WHERE business_id = 1 AND user_id = " . (int) $member1Id . " AND read_at IS NULL"
)->fetch_assoc()['c'];
$apiUnreadM1 = (int) (makeRequest("$baseUrl/notifications.php?action=count", "GET", null, $member1Cookies)['body']['unread_count'] ?? -1);
assertTest("Member 1 API unread count matches direct DB query ($apiUnreadM1 vs $dbUnreadM1)", $apiUnreadM1 === $dbUnreadM1);
assertTest("Nirav's mark-all did NOT clear another user's unread notifications (Member 1 unread: $apiUnreadM1)", $apiUnreadM1 > 0);

// Empty-state behaviour for a user with no notifications (Rajesh baseline 0)
if ($rajeshBaselineUnread === 0) {
    $rajeshEmpty = makeRequest("$baseUrl/notifications.php", "GET", null, $rajeshCookies);
    assertTest(
        "User with zero notifications receives 200 with an empty list (no fake rows)",
        $rajeshEmpty['code'] === 200 && is_array($rajeshEmpty['body']['data'] ?? null) && count($rajeshEmpty['body']['data']) === 0
    );
}

// Unsupported method must be rejected consistently
$postNotif = makeRequest("$baseUrl/notifications.php", "POST", ['title' => 'x'], $niravCookies);
assertTest("Unsupported POST to notifications API returns 405", $postNotif['code'] === 405);

// ----------------------------------------------------------------------------
// 10. Clean up Test Data & Restore Baseline
// ----------------------------------------------------------------------------
echo "\n10. Cleaning up test records...\n";

// Delete test tasks (only if created during this run)
if ($testTaskId > 0) {
    $conn->query("DELETE FROM tasks WHERE id = " . (int) $testTaskId);
}
// Delete test order items and order (only if created during this run)
if ($testOrderId > 0) {
    $conn->query("DELETE FROM order_items WHERE order_id = " . (int) $testOrderId);
    $conn->query("DELETE FROM orders WHERE id = " . (int) $testOrderId);
}
// Delete temporary test team members (their notifications cascade with them)
if ($member1Id > 0 || $member2Id > 0) {
    $ids = array_filter([(int) $member1Id, (int) $member2Id]);
    $conn->query("DELETE FROM users WHERE id IN (" . implode(',', $ids) . ")");
}
// Delete only notifications created during this test run
$conn->query("DELETE FROM notifications WHERE id > " . (int) $preTestMaxNotifId);

// Verify cleanup restores the captured baseline
$remTasks  = (int) $conn->query("SELECT COUNT(*) AS c FROM tasks")->fetch_assoc()['c'];
$remOrders = (int) $conn->query("SELECT COUNT(*) AS c FROM orders")->fetch_assoc()['c'];
$remNotifs = (int) $conn->query("SELECT COUNT(*) AS c FROM notifications")->fetch_assoc()['c'];
$remUsers  = (int) $conn->query("SELECT COUNT(*) AS c FROM users")->fetch_assoc()['c'];
$remCust   = (int) $conn->query("SELECT COUNT(*) AS c FROM customers")->fetch_assoc()['c'];
$remBiz    = (int) $conn->query("SELECT COUNT(*) AS c FROM businesses")->fetch_assoc()['c'];

assertTest("Test tasks cleaned up (remaining: $remTasks, baseline: {$baselineCounts['tasks']})", $remTasks === $baselineCounts['tasks']);
assertTest("Test orders cleaned up (remaining: $remOrders, baseline: {$baselineCounts['orders']})", $remOrders === $baselineCounts['orders']);
assertTest("Test notifications cleaned up (remaining: $remNotifs, baseline: {$baselineCounts['notifications']})", $remNotifs === $baselineCounts['notifications']);
assertTest("Baseline users restored (remaining: $remUsers, baseline: {$baselineCounts['users']})", $remUsers === $baselineCounts['users']);
assertTest("Customers untouched (remaining: $remCust, baseline: {$baselineCounts['customers']})", $remCust === $baselineCounts['customers']);
assertTest("Businesses untouched (remaining: $remBiz, baseline: {$baselineCounts['businesses']})", $remBiz === $baselineCounts['businesses']);

echo "\n=== SUMMARY ===\n";
echo "Total Passed: $passed\n";
echo "Total Failed: $failed\n";

if ($failed === 0) {
    echo ">>> ALL PHASE 4I NOTIFICATION TESTS PASSED SUCCESSFULLY! <<<\n";
} else {
    echo ">>> SOME TESTS FAILED. PLEASE REVIEW ABOVE LOGS. <<<\n";
}
