-- OmniOS Authentication Schema & Demo Owners
-- Course: IBSIT-304P | Units II & III (Authentication with Sessions & MySQL)

USE `omnios`;

-- Table structure for Company Owners (Authentication)
CREATE TABLE IF NOT EXISTS `owners` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `company` VARCHAR(150) NOT NULL,
  `role` VARCHAR(50) NOT NULL DEFAULT 'owner',
  `password_hash` VARCHAR(255) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `uk_owner_email` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Ensure customers table has Indian business data matching the original prototype
INSERT INTO `customers` (`name`, `email`, `company`, `phone`) VALUES
('Rajesh Sharma', 'rajesh@sharmatraders.in', 'Sharma Traders', '+91 98200 11223'),
('Priya Patel', 'priya.p@apexglobal.com', 'Apex Global Logistics', '+91 98765 43210'),
('Amit Desai', 'amit@desaitech.com', 'Desai Tech Solutions', '+91 99099 88776'),
('Sunita Mehta', 'sunita@mehtagroup.org', 'Mehta Group', '+91 98450 33445'),
('Ananya Rao', 'ananya@zenithenterprise.com', 'Zenith Enterprise', '+91 97123 55667'),
('Rohan Gupta', 'rohan.g@guptaretail.in', 'Gupta Retailers', '+91 98111 22334')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`), `company` = VALUES(`company`), `phone` = VALUES(`phone`);
