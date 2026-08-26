-- Migration: Add rag_planned_status column to assessments table
-- Created: 2026-08-26
-- Description: Adds support for planned AI taxonomy alongside current taxonomy

-- Add new column to assessments table
ALTER TABLE public.assessments 
ADD COLUMN IF NOT EXISTS rag_planned_status TEXT;

-- Set default to null for existing rows
UPDATE public.assessments 
SET rag_planned_status = NULL 
WHERE rag_planned_status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.assessments.rag_planned_status 
IS 'Planned AI and Assessment taxonomy status (Red/Amber/Green). Represents the future target state for the assessment.';
