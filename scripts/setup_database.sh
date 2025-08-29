#!/bin/bash

echo "🚀 Setting up GCG Database with KKA fields..."

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 -U postgres; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Run migration to add KKA fields
echo "🔄 Running migration to add KKA fields..."
npx knex migrate:latest

# Update assessment data with KKA information
echo "📝 Updating assessment data with KKA information..."
PGPASSWORD=admin123 psql -h localhost -U postgres -d gcg -f database/update_assessment_data.sql

echo "✅ Database setup completed successfully!"
echo "📊 You can now view assessments with KKA information in the frontend."
