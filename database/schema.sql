-- OmniOS Database Schema
-- Database: omnios
-- Purpose: Customer directory persistence for OmniOS business operating system

CREATE DATABASE IF NOT EXISTS `omnios`
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

USE `omnios`;

-- Table structure for table `customers`
CREATE TABLE IF NOT EXISTS `customers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(150) NOT NULL,
  `company` VARCHAR(100) NOT NULL DEFAULT '',
  `phone` VARCHAR(20) NOT NULL DEFAULT '',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `uk_customer_email` UNIQUE (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Realistic business seed records
INSERT INTO `customers` (`name`, `email`, `company`, `phone`) VALUES
('Sarah Jenkins', 's.jenkins@acmecorp.com', 'Acme Corporation', '+1 (555) 234-5678'),
('Raj Patel', 'raj.patel@apexdigital.in', 'Apex Digital Systems', '+91 98765 43210'),
('Elena Rostova', 'elena@novalabs.io', 'Nova Labs Global', '+44 20 7946 0912'),
('Marcus Vance', 'mvance@vanceindustries.com', 'Vance Industries', '+1 (555) 876-5432'),
('Ananya Sharma', 'ananya.s@cloudpeak.tech', 'CloudPeak Technologies', '+91 98220 12345'),
('David Chen', 'dchen@summitlogistics.com', 'Summit Logistics', '+1 (555) 345-6789')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);
