-- OmniOS Database Migration: 001_create_users_table.sql
-- Purpose: Create unified `users` table supporting 'owner' and 'team_member' roles,
--          and migrate existing Owner accounts safely without modifying original tables.
-- Note: MySQL/MariaDB DDL statements (like CREATE TABLE) trigger an implicit commit.

USE `omnios`;

-- 1. Create unified users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `company` VARCHAR(150) NOT NULL DEFAULT 'Sharma Office Supplies',
  `department` VARCHAR(100) NOT NULL DEFAULT 'Management',
  `role` ENUM('owner', 'team_member') NOT NULL DEFAULT 'team_member',
  `status` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  `password_hash` VARCHAR(255) NOT NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `uk_user_email` UNIQUE (`email`),
  CONSTRAINT `fk_user_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Safely populate existing owners into users without destructive upsert
-- Only inserts when neither id nor email already exists in users.
INSERT INTO `users` (`id`, `name`, `email`, `company`, `department`, `role`, `status`, `password_hash`, `created_at`)
SELECT 
  o.`id`, 
  o.`name`, 
  o.`email`, 
  o.`company`, 
  'Management' AS `department`, 
  'owner' AS `role`, 
  'active' AS `status`, 
  o.`password_hash`, 
  o.`created_at`
FROM `owners` o
WHERE NOT EXISTS (
  SELECT 1 FROM `users` u WHERE u.`id` = o.`id` OR u.`email` = o.`email`
);
