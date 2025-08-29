@echo off
echo 🚀 Setting up GCG Database manually...

REM Navigate to backend directory
cd /d "%~dp0"

REM Check if .env exists
if not exist ".env" (
    echo 📝 Creating .env file...
    copy "env.example" ".env"
)

REM Run migration
echo 🔄 Running database migration...
npx knex migrate:latest

REM Insert sample data manually
echo 📝 Inserting sample data...
set PGPASSWORD=admin123
psql -h localhost -U postgres -d gcg -f database/complete_setup.sql

echo ✅ Database setup completed manually!
echo 📊 You can now start the backend server with: npm start
pause

