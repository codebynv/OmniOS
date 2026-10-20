-- OmniOS Database Migration: 005_create_notifications_table.sql
-- Description: Creates persistent business-isolated notifications table
-- Version: 005
-- Target Database: omnios

CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` INT(11) NOT NULL,
  `user_id` INT(11) NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `message` TEXT NOT NULL,
  `entity_type` VARCHAR(50) NULL,
  `entity_id` INT UNSIGNED NULL,
  `read_at` TIMESTAMP NULL DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key constraints enforcing business and user integrity
  CONSTRAINT `fk_notifications_business_id`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_notifications_user_id`
    FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  -- Indexes for performant recipient filtering, unread counts, and chronological sorting
  INDEX `idx_notif_user_read` (`user_id`, `read_at`),
  INDEX `idx_notif_business` (`business_id`),
  INDEX `idx_notif_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
