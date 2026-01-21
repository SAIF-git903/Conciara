# PowerShell script to create PostgreSQL user and database
# Make sure PostgreSQL is running before executing this script

Write-Host "Creating PostgreSQL user and database for ConversaTree..." -ForegroundColor Cyan
Write-Host ""

# Prompt for new user details
$newUser = Read-Host "Enter new PostgreSQL username (default: conversatree_user)"
if ([string]::IsNullOrWhiteSpace($newUser)) {
    $newUser = "conversatree_user"
}

$newPassword = Read-Host "Enter password for new user" -AsSecureString
$passwordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword)
)

$dbName = Read-Host "Enter database name (default: conversatree)"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    $dbName = "conversatree"
}

# Try to connect as postgres user
Write-Host ""
Write-Host "Attempting to connect to PostgreSQL as 'postgres' user..." -ForegroundColor Yellow
Write-Host "You may be prompted for the postgres user password." -ForegroundColor Yellow
Write-Host ""

# Create SQL commands for user and database creation
$sqlCommands1 = @"
-- Create user
CREATE USER $newUser WITH PASSWORD '$passwordPlain';

-- Create database
CREATE DATABASE $dbName;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $dbName TO $newUser;

-- Make user owner
ALTER DATABASE $dbName OWNER TO $newUser;
"@

# Create SQL commands for schema privileges (must be run while connected to the database)
$sqlCommands2 = @"
-- Grant privileges on the public schema
GRANT ALL ON SCHEMA public TO $newUser;

-- Grant privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $newUser;

-- Grant privileges on all existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $newUser;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $newUser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO $newUser;
"@

# Save to temp files
$tempFile1 = [System.IO.Path]::GetTempFileName() + ".sql"
$tempFile2 = [System.IO.Path]::GetTempFileName() + ".sql"
$sqlCommands1 | Out-File -FilePath $tempFile1 -Encoding UTF8
$sqlCommands2 | Out-File -FilePath $tempFile2 -Encoding UTF8

Write-Host "Executing SQL commands..." -ForegroundColor Green
Write-Host ""

# Execute psql commands
try {
    # Step 1: Create user and database
    Write-Host "Creating user and database..." -ForegroundColor Cyan
    psql -U postgres -f $tempFile1
    
    if ($LASTEXITCODE -eq 0) {
        # Step 2: Grant schema privileges (connect to the new database)
        Write-Host "Granting schema privileges..." -ForegroundColor Cyan
        psql -U postgres -d $dbName -f $tempFile2
        
        if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "✅ Successfully created user '$newUser' and database '$dbName'!" -ForegroundColor Green
        Write-Host ""
        Write-Host "Update your .env file with:" -ForegroundColor Cyan
        Write-Host "DATABASE_URL=postgresql://$newUser`:$passwordPlain@localhost:5432/$dbName" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "Or use individual variables:" -ForegroundColor Cyan
        Write-Host "DB_USER=$newUser" -ForegroundColor Yellow
        Write-Host "DB_PASSWORD=$passwordPlain" -ForegroundColor Yellow
        Write-Host "DB_HOST=localhost" -ForegroundColor Yellow
        Write-Host "DB_PORT=5432" -ForegroundColor Yellow
        Write-Host "DB_NAME=$dbName" -ForegroundColor Yellow
        } else {
            Write-Host ""
            Write-Host "⚠️ User and database created, but failed to grant schema privileges." -ForegroundColor Yellow
            Write-Host "You can run this manually:" -ForegroundColor Yellow
            Write-Host "psql -U postgres -d $dbName -f grant_schema_privileges.sql" -ForegroundColor Cyan
        }
    } else {
        Write-Host ""
        Write-Host "❌ Failed to create user/database. Check the error messages above." -ForegroundColor Red
    }
} catch {
    Write-Host ""
    Write-Host "❌ Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Make sure PostgreSQL is installed and 'psql' is in your PATH." -ForegroundColor Yellow
}

# Clean up temp files
Remove-Item $tempFile1 -ErrorAction SilentlyContinue
Remove-Item $tempFile2 -ErrorAction SilentlyContinue
