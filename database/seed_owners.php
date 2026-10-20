<?php
/**
 * OmniOS Owner Account Seeder
 * Creates exactly two company-owner demo accounts using PHP password_hash()
 */

require_once __DIR__ . '/../api/config/db.php';

$conn = getDbConnection();

// Create `owners` table if not exists
$createTableSql = "CREATE TABLE IF NOT EXISTS `owners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `company` VARCHAR(150) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'owner',
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `uk_owner_email` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;";

if (!$conn->query($createTableSql)) {
    die("Failed to create owners table: " . $conn->error . PHP_EOL);
}

// Passwords must be provided via DEMO_OWNER1_PASS and DEMO_OWNER2_PASS environment variables.
// In local development, set these before running the seeder.
$demoOwner1Pass = getenv('DEMO_OWNER1_PASS');
$demoOwner2Pass = getenv('DEMO_OWNER2_PASS');

if ($demoOwner1Pass === false || $demoOwner1Pass === '' || $demoOwner2Pass === false || $demoOwner2Pass === '') {
    die("Required environment variables DEMO_OWNER1_PASS and DEMO_OWNER2_PASS must be set. " .
        "Please set them before running the seeder." . PHP_EOL);
}

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

$stmt = $conn->prepare("INSERT INTO `owners` (`name`, `email`, `company`, `role`, `password_hash`) 
                        VALUES (?, ?, ?, 'owner', ?)
                        ON DUPLICATE KEY UPDATE 
                        `name` = VALUES(`name`),
                        `company` = VALUES(`company`),
                        `password_hash` = VALUES(`password_hash`)");

if (!$stmt) {
    die("Statement preparation failed: " . $conn->error . PHP_EOL);
}

foreach ($owners as $owner) {
    $hash = password_hash($owner['password'], PASSWORD_DEFAULT);
    $stmt->bind_param('ssss', $owner['name'], $owner['email'], $owner['company'], $hash);
    if ($stmt->execute()) {
        echo "Successfully seeded owner: {$owner['name']} ({$owner['email']})" . PHP_EOL;
    } else {
        echo "Error seeding owner: " . $stmt->error . PHP_EOL;
    }
}

$stmt->close();
$conn->close();
echo "Owner account setup complete." . PHP_EOL;
