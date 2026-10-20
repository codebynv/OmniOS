-- OmniOS Database Migration: 003_create_tasks_table.sql
-- Purpose: Create persistent `tasks` table supporting multi-tenant Kanban workflows,
--          scoped by business_id, with assignees (Team Members) and creators (Owners).
-- Note: MySQL/MariaDB DDL triggers implicit commit.

USE `omnios`;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `business_id` INT NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NULL,
  `status` ENUM('todo', 'in-progress', 'done') NOT NULL DEFAULT 'todo',
  `priority` ENUM('Low', 'Medium', 'High') NOT NULL DEFAULT 'Medium',
  `assigned_to` INT NOT NULL,
  `created_by` INT NOT NULL,
  `due_date` VARCHAR(100) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_tasks_business_id` (`business_id`),
  KEY `idx_tasks_assigned_to` (`assigned_to`),
  KEY `idx_tasks_created_by` (`created_by`),
  KEY `idx_tasks_business_status` (`business_id`, `status`),
  CONSTRAINT `fk_tasks_business_id` FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_assigned_to` FOREIGN KEY (`assigned_to`) REFERENCES `users` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `fk_tasks_created_by` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
