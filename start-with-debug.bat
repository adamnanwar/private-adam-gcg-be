@echo off
echo 🚀 Starting Backend with Debug Mode...

REM Navigate to backend directory
cd /d "%~dp0"

REM Check if .env exists
if not exist ".env" (
    echo 📝 Creating .env file...
    copy "env.example" ".env"
)

REM Start backend with nodemon for debugging
echo 📡 Starting backend server with nodemon...
npx nodemon src/index.js

pause

