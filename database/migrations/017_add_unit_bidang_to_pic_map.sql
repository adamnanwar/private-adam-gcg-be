-- Add unit_bidang_id column to pic_map table
ALTER TABLE pic_map ADD COLUMN unit_bidang_id UUID REFERENCES unit_bidang(id);

-- Create index for better performance
CREATE INDEX idx_pic_map_unit_bidang_id ON pic_map(unit_bidang_id);

-- Update existing pic_map entries to use unit_bidang_id instead of pic_user_id
-- First, let's see what we have
-- UPDATE pic_map SET unit_bidang_id = (SELECT unit_bidang_id FROM users WHERE users.id = pic_map.pic_user_id) WHERE pic_user_id IS NOT NULL;

