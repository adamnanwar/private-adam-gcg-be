@echo off
echo 🚀 Setting up GCG Database with KKA fields...

REM Navigate to backend directory
cd /d "%~dp0\.."

REM Check if PostgreSQL is running
echo 📊 Checking PostgreSQL connection...
pg_isready -h localhost -p 5432 -U postgres
if %errorlevel% neq 0 (
    echo ❌ PostgreSQL is not running. Please start PostgreSQL first.
    pause
    exit /b 1
)

REM Run migration to add KKA fields
echo 🔄 Running migration to add KKA fields...
npx knex migrate:latest

REM Update assessment data with KKA information
echo 📝 Updating assessment data with KKA information...
set PGPASSWORD=admin123
psql -h localhost -U postgres -d gcg -f database/update_assessment_data.sql

echo ✅ Database setup completed successfully!
echo 📊 You can now view assessments with KKA information in the frontend.
pause
