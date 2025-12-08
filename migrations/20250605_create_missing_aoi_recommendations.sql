-- Migration: Create missing AOI recommendations for existing AOI monitoring records
-- Date: 2025-06-05
-- Description: For any AOI monitoring record that has no recommendations, 
--              create a default recommendation based on the source assessment type

-- Insert default recommendations for AOI records that don't have any
DO $$
DECLARE
    aoi_record RECORD;
    rec_id UUID;
BEGIN
    -- Find all AOI monitoring records without recommendations
    FOR aoi_record IN 
        SELECT am.id, am.source_type, am.periode, am.created_at
        FROM aoi_monitoring am
        LEFT JOIN aoi_monitoring_recommendation amr ON am.id = amr.aoi_monitoring_id
        WHERE amr.id IS NULL
    LOOP
        -- Generate new UUID for recommendation
        rec_id := gen_random_uuid();
        
        -- Insert a default recommendation
        INSERT INTO aoi_monitoring_recommendation (
            id,
            aoi_monitoring_id,
            section,
            recommendation,
            action_plan,
            timeline,
            status,
            sort,
            created_at,
            updated_at
        ) VALUES (
            rec_id,
            aoi_record.id,
            'Tindak Lanjut',
            CASE 
                WHEN aoi_record.source_type = 'sk16' THEN 'Tindak lanjut dari hasil assessment SK16 periode ' || COALESCE(aoi_record.periode, 'tidak diketahui')
                WHEN aoi_record.source_type = 'pugki' THEN 'Tindak lanjut dari hasil assessment PUGKI periode ' || COALESCE(aoi_record.periode, 'tidak diketahui')
                WHEN aoi_record.source_type = 'acgs' THEN 'Tindak lanjut dari hasil assessment ACGS periode ' || COALESCE(aoi_record.periode, 'tidak diketahui')
                ELSE 'Tindak lanjut AOI'
            END,
            'Silakan isi rencana aksi',
            'Silakan isi target waktu',
            'pending',
            1,
            COALESCE(aoi_record.created_at, NOW()),
            NOW()
        );
        
        RAISE NOTICE 'Created default recommendation % for AOI %', rec_id, aoi_record.id;
    END LOOP;
END $$;

-- Verify results
SELECT 
    am.id as aoi_id,
    am.source_type,
    am.periode,
    COUNT(amr.id) as recommendation_count
FROM aoi_monitoring am
LEFT JOIN aoi_monitoring_recommendation amr ON am.id = amr.aoi_monitoring_id
GROUP BY am.id, am.source_type, am.periode
ORDER BY am.created_at DESC
LIMIT 20;

SELECT 'Migration completed! Check above for AOI records and their recommendation counts.' as status;
