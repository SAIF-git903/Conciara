-- Script to grant schema privileges on the ConversaTree database
-- Run this script AFTER creating the user and database
-- Connect to the database first: psql -U postgres -d conversatree -f grant_schema_privileges.sql
-- Or run: psql -U postgres -d conversatree < grant_schema_privileges.sql
-- Replace 'conversatree_user' with your actual username

-- Grant privileges on the public schema
GRANT ALL ON SCHEMA public TO conversatree_user;

-- Grant privileges on all existing tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO conversatree_user;

-- Grant privileges on all existing sequences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO conversatree_user;

-- Set default privileges for future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO conversatree_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO conversatree_user;
