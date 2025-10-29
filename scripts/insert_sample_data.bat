@echo off
echo 🚀 Inserting Sample Data to GCG Database...

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

REM Check if database exists
echo 🔍 Checking if database 'gcg' exists...
psql -h localhost -U postgres -lqt | findstr "gcg" >nul
if %errorlevel% neq 0 (
    echo ❌ Database 'gcg' does not exist. Creating it...
    createdb -h localhost -U postgres gcg
    echo ✅ Database 'gcg' created successfully!
)

REM Run migration first (if not already done)
echo 🔄 Running migrations...
npx knex migrate:latest

REM Insert sample data
echo 📝 Inserting sample data...
set PGPASSWORD=admin123
psql -h localhost -U postgres -d gcg -f database/insert_sample_data.sql

echo ✅ Sample data inserted successfully!
echo 📊 Database now contains:
echo    - 5 users (admin, assessors, PIC, viewer)
echo    - 5 KKA records
echo    - 15 assessment records with KKA information
echo.
echo 🔍 You can verify the data by running:
echo    PGPASSWORD=admin123 psql -h localhost -U postgres -d gcg -c "SELECT COUNT(*) FROM assessment;"
pause
