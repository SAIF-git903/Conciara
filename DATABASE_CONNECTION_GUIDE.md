# Database Connection Guide

## Connection Methods

### 1. Using psql (PostgreSQL Command Line)

The simplest way to connect to your local database:

```bash
# Basic connection (will prompt for password)
psql -U postgres -d conversatree

# Or with password in command (less secure)
psql -U postgres -d conversatree -W

# Or specify host and port
psql -h localhost -p 5432 -U postgres -d conversatree
```

**Common psql commands:**
```sql
-- List all databases
\l

-- Connect to a database
\c conversatree

-- List all tables
\dt

-- Describe a table
\d user_profiles
\d user_memory

-- Run a SQL file
\i check_user_data.sql

-- Exit
\q
```

### 2. Using Connection String

Based on your `.env` file, you can connect using:

```bash
# If you have DATABASE_URL set
psql $DATABASE_URL

# Or build it manually
psql postgresql://postgres:your_password@localhost:5432/conversatree
```

### 3. Using GUI Tools

#### **pgAdmin** (Most Popular)
1. Download from: https://www.pgadmin.org/
2. Install and open pgAdmin
3. Right-click "Servers" → "Create" → "Server"
4. Fill in:
   - **Name**: ConversaTree Local
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: conversatree
   - **Username**: postgres
   - **Password**: (your password)

#### **DBeaver** (Free, Cross-platform)
1. Download from: https://dbeaver.io/
2. Install and open DBeaver
3. Click "New Database Connection"
4. Select "PostgreSQL"
5. Fill in:
   - **Host**: localhost
   - **Port**: 5432
   - **Database**: conversatree
   - **Username**: postgres
   - **Password**: (your password)

#### **TablePlus** (Mac/Windows, Paid)
1. Download from: https://tableplus.com/
2. Click "Create a new connection"
3. Select "PostgreSQL"
4. Fill in connection details

#### **Postico** (Mac only, Paid)
1. Download from: https://eggerapps.at/postico/
2. Create new favorite with connection details

### 4. Check Your Current Database Configuration

To see what database settings your app is using:

```bash
cd backend
cat .env | grep DB_
# or
cat .env | grep DATABASE_URL
```

### 5. Common Connection Issues

#### Issue: "Connection refused"
**Solution**: Make sure PostgreSQL is running:
```bash
# Mac (using Homebrew)
brew services start postgresql@14
# or
pg_ctl -D /usr/local/var/postgres start

# Linux
sudo systemctl start postgresql

# Windows
# Check Services → PostgreSQL
```

#### Issue: "Database does not exist"
**Solution**: Create the database:
```bash
# Connect to default postgres database
psql -U postgres

# Create database
CREATE DATABASE conversatree;

# Exit
\q
```

#### Issue: "Password authentication failed"
**Solution**: 
1. Check your `.env` file for correct password
2. Or reset PostgreSQL password:
```bash
# Connect as postgres user
sudo -u postgres psql

# Change password
ALTER USER postgres PASSWORD 'new_password';
```

### 6. Quick Database Queries

Once connected, try these queries:

```sql
-- Check user profiles
SELECT * FROM user_profiles WHERE user_id = 'testing';

-- Check user memories
SELECT id, user_id, memory_type, content, created_at 
FROM user_memory 
WHERE user_id = 'testing' 
ORDER BY created_at DESC 
LIMIT 10;

-- Check conversation sessions
SELECT id, user_id, tree_id, created_at 
FROM conversation_sessions 
WHERE user_id = 'testing' 
ORDER BY created_at DESC 
LIMIT 5;

-- Count memories by type
SELECT memory_type, COUNT(*) as count
FROM user_memory
WHERE user_id = 'testing'
GROUP BY memory_type;

-- Check all tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public';
```

### 7. Environment Variables

Your `.env` file should have one of these configurations:

**Option 1: Using DATABASE_URL**
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/conversatree
```

**Option 2: Using Individual Variables**
```env
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=conversatree
```

### 8. Test Connection from Terminal

```bash
# Test if PostgreSQL is running
pg_isready -h localhost -p 5432

# Test connection with psql
psql -h localhost -p 5432 -U postgres -d conversatree -c "SELECT version();"
```

### 9. Useful SQL Scripts

You can create custom SQL scripts to check user data. Example:

```sql
-- Check user profiles
SELECT * FROM user_profiles WHERE user_id = 'your_user_id';

-- Check user memories
SELECT * FROM user_memory WHERE user_id = 'your_user_id' ORDER BY created_at DESC;

-- Check conversation sessions
SELECT * FROM conversation_sessions WHERE user_id = 'your_user_id';
```

## Quick Start

1. **Check if PostgreSQL is running:**
   ```bash
   pg_isready
   ```

2. **Connect to database:**
   ```bash
   psql -U postgres -d conversatree
   ```

3. **Check user data:**
   ```sql
   SELECT * FROM user_profiles;
   SELECT * FROM user_memory ORDER BY created_at DESC LIMIT 10;
   ```

## Need Help?

If you're having connection issues:
1. Check PostgreSQL is running
2. Verify your `.env` file has correct credentials
3. Make sure the database `conversatree` exists
4. Check firewall/network settings

