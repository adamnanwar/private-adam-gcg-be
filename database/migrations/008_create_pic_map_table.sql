-- Migration: Create pic_map table
-- Date: 2025-01-XX

-- Create pic_map table for PIC assignments
CREATE TABLE IF NOT EXISTS pic_map (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type VARCHAR(50) NOT NULL CHECK (target_type IN ('assessment_aspect', 'assessment_parameter', 'assessment_factor', 'aoi')),
    target_id UUID NOT NULL,
    pic_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_pic_map_target_type_target_id ON pic_map(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_pic_map_pic_user_id ON pic_map(pic_user_id);
CREATE INDEX IF NOT EXISTS idx_pic_map_created_at ON pic_map(created_at);

-- Create unique constraint to prevent duplicate assignments
CREATE UNIQUE INDEX IF NOT EXISTS idx_pic_map_unique_assignment ON pic_map(target_type, target_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_pic_map_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pic_map_updated_at
    BEFORE UPDATE ON pic_map
    FOR EACH ROW
    EXECUTE FUNCTION update_pic_map_updated_at();

-- Add comment to table
COMMENT ON TABLE pic_map IS 'Maps Person In Charge (PIC) users to assessment targets and AOI';
COMMENT ON COLUMN pic_map.target_type IS 'Type of target entity (assessment_aspect, assessment_parameter, assessment_factor, aoi)';
COMMENT ON COLUMN pic_map.target_id IS 'ID of the target entity';
COMMENT ON COLUMN pic_map.pic_user_id IS 'User ID assigned as PIC for the target';
