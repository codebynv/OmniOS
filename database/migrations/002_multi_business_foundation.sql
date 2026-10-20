-- OmniOS Database Migration: 002_multi_business_foundation.sql
-- Purpose: Introduce multi-business foundation by creating `businesses` table,
--          associating users with their business, partitioning existing customer
--          records across businesses, and scoping customer email uniqueness to business_id.
-- Note: MySQL/MariaDB DDL statements trigger implicit commits.

USE `omnios`;

-- 1. Create `businesses` table
CREATE TABLE IF NOT EXISTS `businesses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uk_business_name` UNIQUE (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Seed initial approved businesses
INSERT INTO `businesses` (`id`, `name`) VALUES
  (1, 'Sharma Office Supplies'),
  (2, 'Sharma Traders')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 3. Add business_id column to users table
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND COLUMN_NAME = 'business_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `users` ADD COLUMN `business_id` INT NULL AFTER `email`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 4. Associate existing users with their approved businesses
UPDATE `users` SET `business_id` = 1 WHERE `id` = 1 AND (`business_id` IS NULL OR `business_id` = 1);
UPDATE `users` SET `business_id` = 2, `company` = 'Sharma Traders' WHERE `id` = 2 AND (`business_id` IS NULL OR `business_id` = 2);

-- 5. Enforce NOT NULL and foreign key constraint on users.business_id
ALTER TABLE `users` MODIFY COLUMN `business_id` INT NOT NULL;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'users' 
    AND CONSTRAINT_NAME = 'fk_users_business_id'
);
SET @sql := IF(@fk_exists = 0, 'ALTER TABLE `users` ADD CONSTRAINT `fk_users_business_id` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE RESTRICT', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 6. Add business_id column to customers table
SET @col_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'customers' 
    AND COLUMN_NAME = 'business_id'
);
SET @sql := IF(@col_exists = 0, 'ALTER TABLE `customers` ADD COLUMN `business_id` INT NULL AFTER `id`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 7. Assign demo customers to Business 1 (Sharma Office Supplies)
UPDATE `customers` 
SET `business_id` = 1 
WHERE `id` IN (8, 9, 10, 11, 12, 13) 
  AND (`business_id` IS NULL OR `business_id` = 1);

-- 8. Assign demo customers to Business 2 (Sharma Traders)
UPDATE `customers` 
SET `business_id` = 2 
WHERE `id` IN (25, 28, 29, 30, 31, 32) 
  AND (`business_id` IS NULL OR `business_id` = 2);

-- 9. Enforce NOT NULL and foreign key constraint on customers.business_id
ALTER TABLE `customers` MODIFY COLUMN `business_id` INT NOT NULL;

SET @fk_exists := (
  SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'customers' 
    AND CONSTRAINT_NAME = 'fk_customers_business_id'
);
SET @sql := IF(@fk_exists = 0, 'ALTER TABLE `customers` ADD CONSTRAINT `fk_customers_business_id` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 10. Drop old global unique index on email if present
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'customers' 
    AND INDEX_NAME = 'uk_customer_email'
);
SET @sql := IF(@idx_exists > 0, 'ALTER TABLE `customers` DROP INDEX `uk_customer_email`', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 11. Create composite unique index (business_id, email)
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS 
  WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'customers' 
    AND INDEX_NAME = 'uk_customer_business_email'
);
SET @sql := IF(@idx_exists = 0, 'ALTER TABLE `customers` ADD CONSTRAINT `uk_customer_business_email` UNIQUE (`business_id`, `email`)', 'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
