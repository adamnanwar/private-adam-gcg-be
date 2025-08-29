@echo off
echo 🚀 Setting up GCG Database...

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

REM Run seeds
echo 🌱 Running database seeds...
npx knex seed:run

echo ✅ Database setup completed!
echo 📊 You can now start the backend server with: npm start
pause

