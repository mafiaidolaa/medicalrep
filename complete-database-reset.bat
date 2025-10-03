@echo off
chcp 65001 >nul
echo ===============================================
echo     Complete Database Reset for Orders System    
echo ===============================================
echo.
echo WARNING: This will delete ALL data in the database!
echo Make sure you have backups if needed.
echo.
set /p confirm="Are you sure you want to continue? (Y/N): "
if /i not "%confirm%"=="Y" (
    echo Operation cancelled.
    pause
    exit /b 0
)

echo.
echo Checking for PostgreSQL...
where psql >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: psql command not found
    echo.
    echo Solutions:
    echo 1. Use pgAdmin GUI interface
    echo 2. Add PostgreSQL to PATH
    echo 3. Use Supabase instead
    echo.
    echo For pgAdmin:
    echo 1. Open pgAdmin
    echo 2. Connect to localhost server
    echo 3. Right-click orders_management database
    echo 4. Select Query Tool
    echo 5. Copy and paste content from database/complete-reset.sql
    echo 6. Execute the script
    echo 7. Copy and paste content from database/orders-system-postgresql.sql
    echo 8. Execute the script
    echo.
    pause
    exit /b 1
)

echo PostgreSQL found!
echo.

echo Step 1: Complete database reset...
echo This will drop ALL tables, views, functions, and types
psql -U postgres -d orders_management -f database\complete-reset.sql
if %ERRORLEVEL% NEQ 0 (
    echo ERROR: Failed to reset database
    echo.
    echo Trying alternative reset method...
    psql -U postgres -d orders_management -f database\reset-database.sql
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: Both reset methods failed
        echo Please use pgAdmin manually
        pause
        exit /b 1
    )
)

echo Step 2: Creating fresh database structure...
psql -U postgres -d orders_management -f database\orders-system-postgresql.sql
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo           SUCCESS!
    echo ========================================
    echo.
    echo Database has been completely reset and recreated!
    echo.
    echo Login credentials:
    echo - Manager: manager@example.com / password123
    echo - Medical Rep: rep@example.com / password123  
    echo - Accountant: accountant@example.com / password123
    echo - Admin: admin@example.com / password123
    echo.
    echo Next steps:
    echo 1. Run: npm run dev
    echo 2. Visit: http://localhost:3000/orders
    echo 3. Test the enhanced orders system
    echo.
    echo Features available:
    echo - Enhanced order form with credit limit checking
    echo - Smart inventory management with temporary reservations
    echo - Multi-level approval system
    echo - Comprehensive testing suite
    echo.
) else (
    echo ERROR: Failed to create database structure
    echo.
    echo Please check the error messages above.
    echo You may need to:
    echo 1. Check PostgreSQL service is running
    echo 2. Verify database permissions
    echo 3. Use pgAdmin for manual setup
)

echo.
pause