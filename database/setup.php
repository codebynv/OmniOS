<?php
/**
 * OmniOS Database Full Setup Script
 *
 * Run this via browser: http://localhost/OmniOS/database/setup.php
 *
 * Creates:
 *   1. customers table (if not exists)
 *   2. owners table (if not exists)
 *   3. Seeds two demo owner accounts
 *   4. Inserts sample Indian business customers
 */

// Prevent any accidental caching
header('Cache-Control: no-store');
header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/../api/config/db.php';

$conn = getDbConnection(true);

$results = [];

if (!$conn) {
    echo "<h2 style='color:red'>❌ Database connection failed.</h2>";
    echo "<p>Ensure XAMPP MySQL is running and the <code>omnios</code> database exists.</p>";
    echo "<p>Run: <code>CREATE DATABASE IF NOT EXISTS \`omnios\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;</code></p>";
    exit;
}

// ─────────────────────────────────────────────
// 1. Ensure customers table exists
// ─────────────────────────────────────────────
$customersTableSql = "CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `company` VARCHAR(100) DEFAULT '',
  `phone` VARCHAR(20) DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `uk_customer_email` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if ($conn->query($customersTableSql)) {
    $results[] = ['status' => 'ok', 'msg' => 'customers table ready'];
} else {
    $results[] = ['status' => 'error', 'msg' => 'customers table error: ' . $conn->error];
}

// ─────────────────────────────────────────────
// 2. Ensure owners table exists
// ─────────────────────────────────────────────
$ownersTableSql = "CREATE TABLE IF NOT EXISTS `owners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `company` VARCHAR(150) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'owner',
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `uk_owner_email` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if ($conn->query($ownersTableSql)) {
    $results[] = ['status' => 'ok', 'msg' => 'owners table ready'];
} else {
    $results[] = ['status' => 'error', 'msg' => 'owners table error: ' . $conn->error];
}

// ─────────────────────────────────────────────
// 3. Seed demo owner accounts
// ─────────────────────────────────────────────
// Passwords must be provided via DEMO_OWNER1_PASS and DEMO_OWNER2_PASS environment variables.
// In local development, set these before running the script.
// Example: DEMO_OWNER1_PASS=yourpass DEMO_OWNER2_PASS=yourpass php setup.php
$demoOwner1Pass = getenv('DEMO_OWNER1_PASS');
$demoOwner2Pass = getenv('DEMO_OWNER2_PASS');

if ($demoOwner1Pass === false || $demoOwner1Pass === '' || $demoOwner2Pass === false || $demoOwner2Pass === '') {
    $results[] = [
        'status' => 'error',
        'msg' => 'Required environment variables DEMO_OWNER1_PASS and DEMO_OWNER2_PASS must be set. ' .
                 'Please set them before running the setup script.'
    ];
} else {
    $owners = [
        [
            'name'     => 'Nirav Vala',
            'email'    => 'nirav.vala@omnios.local',
            'company'  => 'Sharma Office Supplies',
            'password' => $demoOwner1Pass
        ],
        [
            'name'     => 'Rajesh Sharma',
            'email'    => 'rajesh@sharmatraders.in',
            'company'  => 'Sharma Office Supplies',
            'password' => $demoOwner2Pass
        ]
    ];
}

if (isset($owners)) {
    $ownerStmt = $conn->prepare(
        "INSERT INTO `owners` (`name`, `email`, `company`, `role`, `password_hash`)
         VALUES (?, ?, ?, 'owner', ?)
         ON DUPLICATE KEY UPDATE
           `name`          = VALUES(`name`),
           `company`       = VALUES(`company`),
           `password_hash` = VALUES(`password_hash`)"
    );

    if ($ownerStmt) {
        foreach ($owners as $owner) {
            $hash = password_hash($owner['password'], PASSWORD_DEFAULT);
            $ownerStmt->bind_param('ssss', $owner['name'], $owner['email'], $owner['company'], $hash);
            if ($ownerStmt->execute()) {
                $results[] = ['status' => 'ok', 'msg' => "Owner seeded: {$owner['name']} ({$owner['email']})"];
            } else {
                $results[] = ['status' => 'error', 'msg' => "Owner seed error: " . $ownerStmt->error];
            }
        }
        $ownerStmt->close();
    } else {
        $results[] = ['status' => 'error', 'msg' => 'Owner statement prep failed: ' . $conn->error];
    }
}

// ─────────────────────────────────────────────
// 4. Seed sample Indian business customers
// ─────────────────────────────────────────────
$sampleCustomers = [
    ['Rajesh Sharma',  'rajesh@sharmatraders.in',      'Sharma Traders',              '+91 98200 11223'],
    ['Priya Patel',    'priya.p@apexglobal.com',        'Apex Global Logistics',       '+91 98765 43210'],
    ['Amit Desai',     'amit@desaitech.com',            'Desai Tech Solutions',        '+91 99099 88776'],
    ['Sunita Mehta',   'sunita@mehtagroup.org',         'Mehta Group',                 '+91 98450 33445'],
    ['Vikram Verma',   'v.verma@horizonbuild.in',       'Horizon Builders',            '+91 93154 77821'],
    ['Ananya Rao',     'ananya@zenithenterprise.com',   'Zenith Enterprise',           '+91 97123 55667'],
    ['Rohan Gupta',    'rohan.g@guptaretail.in',        'Gupta Retailers',             '+91 98111 22334'],
    ['Neha Joshi',     'neha@joshiadvisors.in',         'Joshi Financial Advisors',    '+91 99024 66110'],
    ['Suresh Nair',    'suresh@nairindustries.com',     'Nair Industrial Parts',       '+91 90000 44312'],
    ['Pooja Kulkarni', 'pooja@kulkarnidesign.studio',   'Kulkarni Design Studio',      '+91 98202 87654'],
    ['Manish Chawla',  'manish@chawlasupply.com',       'Chawla Supplies Corp',        '+91 99870 12345'],
    ['Divya Iyer',     'divya@iyeranalytics.io',        'Iyer Data Labs',              '+91 98761 00987'],
];

$custStmt = $conn->prepare(
    "INSERT INTO `customers` (`name`, `email`, `company`, `phone`)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       `name`    = VALUES(`name`),
       `company` = VALUES(`company`),
       `phone`   = VALUES(`phone`)"
);

if ($custStmt) {
    foreach ($sampleCustomers as [$name, $email, $company, $phone]) {
        $custStmt->bind_param('ssss', $name, $email, $company, $phone);
        if ($custStmt->execute()) {
            $results[] = ['status' => 'ok', 'msg' => "Customer seeded: $name ($email)"];
        } else {
            $results[] = ['status' => 'error', 'msg' => "Customer seed error: " . $custStmt->error];
        }
    }
    $custStmt->close();
} else {
    $results[] = ['status' => 'error', 'msg' => 'Customer statement prep failed: ' . $conn->error];
}

$conn->close();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>OmniOS Database Setup</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 680px; margin: 40px auto; padding: 24px; color: #0f172a; }
  h1 { font-size: 1.5rem; margin-bottom: 20px; }
  .result { padding: 8px 14px; border-radius: 6px; margin: 6px 0; font-size: 0.9rem; }
  .ok { background: #dcfce7; color: #15803d; }
  .error { background: #fee2e2; color: #b91c1c; }
  .cta { margin-top: 28px; padding: 16px 20px; background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; }
  a { color: #d97706; text-decoration: underline; }
</style>
</head>
<body>
<h1>OmniOS — Database Setup Complete</h1>
<?php foreach ($results as $r): ?>
  <div class="result <?= $r['status'] ?>">
    <?= $r['status'] === 'ok' ? '✓' : '✗' ?> <?= htmlspecialchars($r['msg']) ?>
  </div>
<?php endforeach; ?>
<div class="cta">
  <strong>Next:</strong> Open the React app at <a href="http://localhost:5173" target="_blank">http://localhost:5173</a>
  and log in with one of the demo owner accounts.
</div>
</body>
</html>
