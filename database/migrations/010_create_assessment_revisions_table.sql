-- Migration: Create assessment_revisions table
-- Date: 2025-01-09
-- Description: Table to store revision notes when assessment is rejected during verification

CREATE TABLE IF NOT EXISTS assessment_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id UUID NOT NULL REFERENCES assessment(id) ON DELETE CASCADE,
    reason VARCHAR(255),
    notes TEXT,
    requested_by UUID REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_assessment_revisions_assessment_id ON assessment_revisions(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_revisions_status ON assessment_revisions(status);
