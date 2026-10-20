-- OmniOS Database Migration: 004_create_orders_tables.sql
-- Description: Creates persistent business-isolated orders and order_items tables
-- Version: 004
-- Target Database: omnios

-- 1. Create orders table
CREATE TABLE IF NOT EXISTS `orders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `business_id` INT(11) NOT NULL,
  `order_number` VARCHAR(50) NOT NULL,
  `customer_id` INT(11) NOT NULL,
  `item_summary` VARCHAR(255) NOT NULL,
  `status` ENUM('Pending', 'Processing', 'Delivered', 'Cancelled') NOT NULL DEFAULT 'Pending',
  `payment_method` VARCHAR(50) NOT NULL DEFAULT 'Pending',
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `order_date` DATE NOT NULL,
  `delivery_date` DATE NULL,
  `notes` TEXT NULL,
  `created_by` INT(11) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Unique order number scoped to each business
  CONSTRAINT `uk_orders_biz_number` UNIQUE (`business_id`, `order_number`),

  -- Foreign key integrity constraints
  CONSTRAINT `fk_orders_business_id`
    FOREIGN KEY (`business_id`) REFERENCES `businesses` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  CONSTRAINT `fk_orders_customer_id`
    FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,

  CONSTRAINT `fk_orders_created_by`
    FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
    ON DELETE SET NULL ON UPDATE CASCADE,

  -- Performance indexes for querying and sales aggregations
  INDEX `idx_orders_business` (`business_id`),
  INDEX `idx_orders_customer` (`customer_id`),
  INDEX `idx_orders_biz_status` (`business_id`, `status`),
  INDEX `idx_orders_biz_date` (`business_id`, `order_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Create order_items table
CREATE TABLE IF NOT EXISTS `order_items` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT UNSIGNED NOT NULL,
  `item_name` VARCHAR(255) NOT NULL,
  `quantity` INT UNSIGNED NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_price` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT `fk_order_items_order_id`
    FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
    ON DELETE CASCADE ON UPDATE CASCADE,

  INDEX `idx_order_items_order` (`order_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
