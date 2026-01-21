# pgAdmin Setup Guide - Create New Database and User

Follow these steps to create a new PostgreSQL user and database using pgAdmin.

## Step 1: Create a New User/Role

1. **Open pgAdmin** and connect to your PostgreSQL server (usually `localhost` or `127.0.0.1`)

2. **Navigate to Login/Group Roles:**
   - Expand your PostgreSQL server (e.g., `PostgreSQL 14` or `PostgreSQL 15`)
   - Expand `Login/Group Roles`
   - Right-click on `Login/Group Roles`
   - Select `Create` → `Login/Group Role...`

3. **Configure the User:**
   - **General Tab:**
     - **Name:** Enter your desired username (e.g., `conversatree_user`)
     - **Can login?** ✅ Check this box
     - **Password:** Enter a secure password
     - **Password expiration:** Leave blank (or set a date if needed)
   
   - **Privileges Tab:**
     - ✅ Check `Can login?`
     - ✅ Check `Create databases` (optional, but recommended)
     - ✅ Check `Create roles` (optional)
   
   - **Definition Tab:**
     - Leave defaults (unless you need specific settings)
   
   - **Click `Save`** to create the user

## Step 2: Create the Database

1. **Navigate to Databases:**
   - Expand your PostgreSQL server
   - Right-click on `Databases`
   - Select `Create` → `Database...`

2. **Configure the Database:**
   - **General Tab:**
     - **Database:** Enter your database name (e.g., `conversatree`)
     - **Owner:** Select the user you just created (e.g., `conversatree_user`)
     - **Template:** Leave as `template1` (default)
     - **Encoding:** Leave as `UTF8` (default)
   
   - **Definition Tab:**
     - Leave defaults
   
   - **Security Tab:**
     - Click `+` to add a new privilege
     - **Grantee:** Select your new user
     - **Privileges:** Check `ALL` or select specific privileges:
       - ✅ `CREATE`
       - ✅ `CONNECT`
       - ✅ `TEMPORARY`
       - ✅ `ALL PRIVILEGES` (recommended)
   
   - **Click `Save`** to create the database

## Step 3: Grant Schema Privileges (Important!)

After creating the database, you need to grant privileges on the schema:

1. **Connect to the new database:**
   - Expand `Databases`
   - Expand your new database (e.g., `conversatree`)
   - Expand `Schemas`
   - Expand `public`
   - Right-click on `public` schema
   - Select `Properties`

2. **Grant Schema Privileges:**
   - Go to the **Privileges** tab
   - Click `+` to add a new privilege
   - **Grantee:** Select your new user
   - **Privileges:** Check:
     - ✅ `CREATE`
     - ✅ `USAGE`
     - ✅ `ALL` (recommended)
   - Click `Save`

3. **Set Default Privileges (for future tables):**
   - Right-click on your database (e.g., `conversatree`)
   - Select `Query Tool`
   - Run these SQL commands (replace `conversatree_user` with your username):

```sql
-- Grant privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO conversatree_user;

-- Grant privileges on all existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO conversatree_user;

-- Set default privileges for future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO conversatree_user;

-- Set default privileges for future sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO conversatree_user;
```

4. **Click the Execute button** (or press F5) to run the SQL

## Step 4: Update Your .env File

After creating the user and database, update your `.env` file in the `backend` folder:

**Option 1: Using DATABASE_URL**
```env
DATABASE_URL=postgresql://conversatree_user:your_password@localhost:5432/conversatree
```

**Option 2: Using Individual Variables**
```env
DB_USER=conversatree_user
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=conversatree
```

**Important:** Replace:
- `conversatree_user` with your actual username
- `your_password` with your actual password
- `conversatree` with your actual database name

## Step 5: Test the Connection

1. **In pgAdmin:**
   - Right-click on your new database
   - Select `Query Tool`
   - Try running: `SELECT version();`
   - If it works, your database is ready!

2. **From your backend:**
   ```bash
   cd backend
   npm run dev
   ```
   You should see: `✅ Connected to PostgreSQL database`

## Troubleshooting

### Issue: "Permission denied" errors
**Solution:** Make sure you granted ALL privileges in Step 3, especially the default privileges for future tables.

### Issue: "Database does not exist"
**Solution:** Double-check the database name in your `.env` file matches what you created in pgAdmin.

### Issue: "Password authentication failed"
**Solution:** Verify the password in your `.env` file matches what you set in pgAdmin.

### Issue: Can't see the new database
**Solution:** Right-click on `Databases` and select `Refresh` to see the new database.

## Quick Reference

**Default PostgreSQL Connection:**
- **Host:** localhost
- **Port:** 5432
- **Username:** (your new user)
- **Password:** (the password you set)
- **Database:** (your new database name)
