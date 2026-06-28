-- Migration 0001: add agi_curve column and backfill from fixed-year columns
-- Run this against the existing production DB: npm run db:migrate:0001
-- Fresh DBs (created from schema.sql) already include agi_curve; skip this migration for them.

ALTER TABLE estimates ADD COLUMN agi_curve TEXT;

-- Backfill: build a JSON anchor array from non-null fixed-year columns.
-- Rows where all four agi_YYYY columns are null will get an empty array JSON.
UPDATE estimates
SET agi_curve = (
  SELECT json_group_array(json_object('year', year, 'p', p))
  FROM (
    SELECT 2030 AS year, agi_2030 AS p WHERE agi_2030 IS NOT NULL
    UNION ALL
    SELECT 2035, agi_2035 WHERE agi_2035 IS NOT NULL
    UNION ALL
    SELECT 2040, agi_2040 WHERE agi_2040 IS NOT NULL
    UNION ALL
    SELECT 2045, agi_2045 WHERE agi_2045 IS NOT NULL
  )
)
WHERE agi_curve IS NULL;
