-- Migration: Create evidence table
-- Date: 2025-01-XX

-- Create evidence table
CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('assessment_aspect', 'assessment_parameter', 'assessment_factor', 'aoi')),
    target_id UUID NOT NULL,
    kind VARCHAR(20) NOT NULL DEFAULT 'document' CHECK (kind IN ('document', 'image', 'other')),
    uri TEXT NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    note TEXT,
    uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_evidence_target_type_target_id ON evidence(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_evidence_uploaded_by ON evidence(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_evidence_created_at ON evidence(created_at);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_evidence_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_evidence_updated_at
    BEFORE UPDATE ON evidence
    FOR EACH ROW
    EXECUTE FUNCTION update_evidence_updated_at();

-- Add comment to table
COMMENT ON TABLE evidence IS 'Stores uploaded evidence files for assessments, AOI, and other entities';
COMMENT ON COLUMN evidence.target_type IS 'Type of target entity (assessment_aspect, assessment_parameter, assessment_factor, aoi)';
COMMENT ON COLUMN evidence.target_id IS 'ID of the target entity';
COMMENT ON COLUMN evidence.kind IS 'Type of evidence (document, image, other)';
COMMENT ON COLUMN evidence.uri IS 'File path or URI to the uploaded file';
COMMENT ON COLUMN evidence.original_name IS 'Original filename of the uploaded file';
COMMENT ON COLUMN evidence.file_size IS 'Size of the file in bytes';
COMMENT ON COLUMN evidence.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN evidence.note IS 'Additional notes about the evidence';
COMMENT ON COLUMN evidence.uploaded_by IS 'User ID who uploaded the evidence';
