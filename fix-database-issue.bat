@echo off
chcp 65001 >nul
echo ============================================
echo   Fix Database Tables Already Exist Issue  
echo ============================================
echo.

echo Checking for PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: psql command not found
    echo.
    echo Solutions:
    echo 1. Use pgAdmin GUI interface
    echo 2. Add PostgreSQL to PATH
    echo 3. Use full path to psql.exe
    echo.
    echo Example with full path:
    echo "C:\Program Files\PostgreSQL\15\bin\psql.exe" -U postgres -d orders_management -f database\reset-database.sql
    echo.
    pause
    exit /b 1
)

echo PostgreSQL found!
echo.

echo Step 1: Reset database tables...
psql -U postgres -d orders_management -f database\reset-database.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to reset database
    echo Make sure:
    echo - PostgreSQL service is running
    echo - You have correct permissions
    echo - orders_management database exists
    pause
    exit /b 1
)

echo Step 2: Create fresh tables...
psql -U postgres -d orders_management -f database\orders-system-postgresql.sql
if %ERRORLEVEL% EQU 0 (
    echo.
    echo SUCCESS! Database setup completed.
    echo.
    echo Login credentials:
    echo Manager: manager@example.com / password123
    echo Rep: rep@example.com / password123
    echo Accountant: accountant@example.com / password123
    echo.
    echo Now you can run: npm run dev
    echo Then visit: http://localhost:3000/orders
) else (
    echo ERROR: Failed to create tables
    echo Please check the error messages above
)

echo.
pause