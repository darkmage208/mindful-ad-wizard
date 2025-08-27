-- Database initialization script for Docker deployment
-- This runs when PostgreSQL container starts for the first time

-- Create database if it doesn't exist
SELECT 'CREATE DATABASE mindful_ad_wizard'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'mindful_ad_wizard')\gexec

-- Connect to the database
\c mindful_ad_wizard;

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE mindful_ad_wizard TO mindful_user;
GRANT ALL ON SCHEMA public TO mindful_user;