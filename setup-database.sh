#!/bin/bash

# Setup database for Mindful Ad Wizard
echo "🔧 Setting up database for Mindful Ad Wizard..."

# Check if we can connect to PostgreSQL
if ! command -v psql &> /dev/null; then
    echo "❌ PostgreSQL client (psql) not found. Please install PostgreSQL."
    exit 1
fi

# Database configuration
DB_NAME="mindful_ad_wizard"
DB_USER="mindful_user"
DB_PASS="secure_password_change_in_production"

echo "📋 Database Configuration:"
echo "   Database: $DB_NAME"
echo "   User: $DB_USER"
echo ""

# Try to connect as postgres user (common default)
echo "🔗 Attempting to create database and user..."

# Create the setup SQL
cat > /tmp/mindful_setup.sql << EOF
-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '$DB_USER') THEN
        CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS';
    END IF;
END
\$\$;

-- Create database if not exists
SELECT 'CREATE DATABASE $DB_NAME OWNER $DB_USER'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME')\gexec

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
ALTER USER $DB_USER CREATEDB;
EOF

# Try different connection methods
echo "🔍 Trying to connect to PostgreSQL..."

# Method 1: Try as current user
if sudo -u postgres psql -f /tmp/mindful_setup.sql > /dev/null 2>&1; then
    echo "✅ Database setup completed successfully!"
    NEW_DATABASE_URL="postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME"
    echo ""
    echo "📝 Update your backend/.env file with:"
    echo "DATABASE_URL=\"$NEW_DATABASE_URL\""
    echo ""
    echo "🚀 Next steps:"
    echo "1. Update DATABASE_URL in backend/.env"
    echo "2. Run: cd backend && npx prisma migrate dev"
    echo "3. Run: cd backend && npm run dev"
else
    echo "❌ Could not connect to PostgreSQL as postgres user."
    echo ""
    echo "🔧 Manual setup required:"
    echo "1. Connect to PostgreSQL as admin user:"
    echo "   sudo -u postgres psql"
    echo ""
    echo "2. Run these commands:"
    echo "   CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
    echo "   CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo "   GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
    echo "   ALTER USER $DB_USER CREATEDB;"
    echo "   \q"
    echo ""
    echo "3. Update backend/.env with:"
    echo "   DATABASE_URL=\"postgresql://$DB_USER:$DB_PASS@localhost:5432/$DB_NAME\""
fi

# Clean up
rm -f /tmp/mindful_setup.sql

echo ""
echo "🎯 Once database is ready, test the connection:"
echo "   cd backend && node test-db.js"