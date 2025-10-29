#!/bin/bash

echo "🚀 Inserting Sample Data to GCG Database..."

# Navigate to backend directory
cd "$(dirname "$0")/.."

# Check if PostgreSQL is running
echo "📊 Checking PostgreSQL connection..."
if ! pg_isready -h localhost -p 5432 -U postgres; then
    echo "❌ PostgreSQL is not running. Please start PostgreSQL first."
    exit 1
fi

# Check if database exists
echo "🔍 Checking if database 'gcg' exists..."
if ! psql -h localhost -U postgres -lqt | cut -d \| -f 1 | grep -qw gcg; then
    echo "❌ Database 'gcg' does not exist. Creating it..."
    createdb -h localhost -U postgres gcg
    echo "✅ Database 'gcg' created successfully!"
fi

# Run migration first (if not already done)
echo "🔄 Running migrations..."
npx knex migrate:latest

# Insert sample data
echo "📝 Inserting sample data..."
PGPASSWORD=admin123 psql -h localhost -U postgres -d gcg -f database/insert_sample_data.sql

echo "✅ Sample data inserted successfully!"
echo "📊 Database now contains:"
echo "   - 5 users (admin, assessors, PIC, viewer)"
echo "   - 5 KKA records"
echo "   - 15 assessment records with KKA information"
echo ""
echo "🔍 You can verify the data by running:"
echo "   PGPASSWORD=admin123 psql -h localhost -U postgres -d gcg -c \"SELECT COUNT(*) FROM assessment;\""
