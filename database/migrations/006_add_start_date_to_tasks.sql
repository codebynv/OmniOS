-- OmniOS Database Migration: 006_add_start_date_to_tasks.sql
-- Description: Adds an optional `start_date` column to the existing `tasks` table.
-- Version: 006
-- Target Database: omnios
--
-- Safety review (approved: backward-compatible and non-destructive):
--   * Uses ALTER TABLE ... ADD COLUMN only. No DROP, TRUNCATE, DELETE, RENAME,
--     table recreation, or data reset of any kind.
--   * The new column is NULLable with no default, so every existing row reads NULL
--     and existing INSERT/UPDATE statements that use explicit column lists
--     (see api/tasks.php) keep working unchanged.
--   * All existing task records and their `assigned_to` assignments are preserved.
--   * Type matches the existing date convention: `due_date` is VARCHAR(100) NULL,
--     so `start_date` is stored the same way for consistent date/date-time values.
--   * Idempotent: ADD COLUMN IF NOT EXISTS makes re-runs a no-op.
--   * No index or FK changes; existing indexes/constraints are untouched.
-- Note: MySQL/MariaDB DDL triggers implicit commit. A schema+data backup must be
--       taken before running this file (see database/backups/omnios_pre_start_date_*.sql).

USE `omnios`;

ALTER TABLE `tasks`
  ADD COLUMN IF NOT EXISTS `start_date` VARCHAR(100) NULL AFTER `created_by`;
