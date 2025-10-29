/**
 * Migration: Fix target_type enum values
 * This fixes the "column factor does not exist" error by updating enum values
 */

exports.up = function(knex) {
  return knex.schema.raw(`
    -- Check if tables exist before updating
    DO $$
    BEGIN
      -- Update existing data to use new enum values (only if tables exist)
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pic_map') THEN
        UPDATE pic_map SET target_type = 'assessment_factor' WHERE target_type = 'factor';
        UPDATE pic_map SET target_type = 'assessment_parameter' WHERE target_type = 'parameter';
      END IF;
      
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'aoi') THEN
        UPDATE aoi SET target_type = 'assessment_factor' WHERE target_type = 'factor';
        UPDATE aoi SET target_type = 'assessment_parameter' WHERE target_type = 'parameter';
      END IF;
      
      IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'evidence') THEN
        UPDATE evidence SET target_type = 'assessment_factor' WHERE target_type = 'factor';
        UPDATE evidence SET target_type = 'assessment_parameter' WHERE target_type = 'parameter';
      END IF;
      
      -- Drop and recreate enum types with new values (only if enum exists)
      IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_type_enum') THEN
        ALTER TYPE target_type_enum RENAME TO target_type_enum_old;
        CREATE TYPE target_type_enum AS ENUM ('assessment_aspect', 'assessment_parameter', 'assessment_factor');
        
        -- Update columns to use new enum (only if tables exist)
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pic_map') THEN
          ALTER TABLE pic_map ALTER COLUMN target_type TYPE target_type_enum USING target_type::text::target_type_enum;
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'aoi') THEN
          ALTER TABLE aoi ALTER COLUMN target_type TYPE target_type_enum USING target_type::text::target_type_enum;
        END IF;
        
        IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'evidence') THEN
          ALTER TABLE evidence ALTER COLUMN target_type TYPE target_type_enum USING target_type::text::target_type_enum;
        END IF;
        
        -- Drop old enum
        DROP TYPE target_type_enum_old;
      END IF;
    END $$;
  `);
};

exports.down = function(knex) {
  return knex.schema.raw(`
    -- Revert data to old enum values
    UPDATE pic_map SET target_type = 'factor' WHERE target_type = 'assessment_factor';
    UPDATE pic_map SET target_type = 'parameter' WHERE target_type = 'assessment_parameter';
    
    UPDATE aoi SET target_type = 'factor' WHERE target_type = 'assessment_factor';
    UPDATE aoi SET target_type = 'parameter' WHERE target_type = 'assessment_parameter';
    
    UPDATE evidence SET target_type = 'factor' WHERE target_type = 'assessment_factor';
    UPDATE evidence SET target_type = 'parameter' WHERE target_type = 'assessment_parameter';
    
    -- Recreate old enum
    ALTER TYPE target_type_enum RENAME TO target_type_enum_new;
    CREATE TYPE target_type_enum AS ENUM ('parameter', 'factor');
    
    -- Update columns to use old enum
    ALTER TABLE pic_map ALTER COLUMN target_type TYPE target_type_enum USING target_type::text::target_type_enum;
    ALTER TABLE aoi ALTER COLUMN target_type TYPE target_type_enum USING target_type::text::target_type_enum;
    ALTER TABLE evidence ALTER COLUMN target_type TYPE target_type_enum USING target_type::text::target_type_enum;
    
    -- Drop new enum
    DROP TYPE target_type_enum_new;
  `);
};
