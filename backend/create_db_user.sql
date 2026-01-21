-- Script to create a new PostgreSQL user and database for ConversaTree
-- Run this script as a PostgreSQL superuser (usually 'postgres')
-- Replace 'conversatree_user', 'your_password', and 'conversatree' with your desired values

-- Step 1: Create a new user
CREATE USER conversatree_user WITH PASSWORD 'your_password';

-- Step 2: Create the database
CREATE DATABASE conversatree;

-- Step 3: Grant all privileges on the database to the new user
GRANT ALL PRIVILEGES ON DATABASE conversatree TO conversatree_user;

-- Step 4: Make the user the owner of the database (optional but recommended)
ALTER DATABASE conversatree OWNER TO conversatree_user;
