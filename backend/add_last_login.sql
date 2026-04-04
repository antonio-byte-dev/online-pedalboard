-- Migration: add last_login to users
-- Run once against your PostgreSQL database.
-- Safe to run multiple times (uses IF NOT EXISTS).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ DEFAULT NULL;
