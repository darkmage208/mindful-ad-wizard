#!/bin/bash

# Mindful Ad Wizard - Database Backup Script
# Usage: ./scripts/backup.sh [manual|auto] [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_TYPE=${1:-manual}  # manual or auto
ENV=${2:-prod}           # dev or prod
PROJECT_NAME="mindful-ad-wizard"
BACKUP_DIR="./backup"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backup_${DATE}.sql"
RETENTION_DAYS=7

echo -e "${BLUE}🗄️  Database Backup Script${NC}"
echo -e "${BLUE}Type: ${BACKUP_TYPE}, Environment: ${ENV}${NC}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Function to perform backup
perform_backup() {
    echo -e "${BLUE}📦 Creating database backup...${NC}"
    
    local compose_file="docker-compose.yml"
    if [ "$ENV" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
        db_name="mindful_ad_wizard_dev"
        db_password="dev_password"
    else
        compose_file="docker-compose.prod.yml"
        db_name="mindful_ad_wizard"
        # Get password from .env file
        if [ -f ".env" ]; then
            db_password=$(grep '^POSTGRES_PASSWORD=' .env | cut -d'=' -f2)
        else
            echo -e "${RED}❌ .env file not found${NC}"
            exit 1
        fi
    fi
    
    # Check if containers are running
    if ! docker-compose -f "$compose_file" ps postgres | grep -q "Up"; then
        echo -e "${RED}❌ PostgreSQL container is not running${NC}"
        exit 1
    fi
    
    # Create backup
    echo -e "${BLUE}Creating backup: ${BACKUP_FILE}${NC}"
    
    docker-compose -f "$compose_file" exec -T postgres pg_dump \
        -U mindful_user \
        -d "$db_name" \
        --verbose \
        --clean \
        --create \
        --if-exists > "${BACKUP_DIR}/${BACKUP_FILE}"
    
    # Compress backup
    echo -e "${BLUE}🗜️  Compressing backup...${NC}"
    gzip "${BACKUP_DIR}/${BACKUP_FILE}"
    COMPRESSED_FILE="${BACKUP_FILE}.gz"
    
    # Verify backup
    if [ -f "${BACKUP_DIR}/${COMPRESSED_FILE}" ]; then
        file_size=$(du -h "${BACKUP_DIR}/${COMPRESSED_FILE}" | cut -f1)
        echo -e "${GREEN}✅ Backup created successfully: ${COMPRESSED_FILE} (${file_size})${NC}"
    else
        echo -e "${RED}❌ Backup failed${NC}"
        exit 1
    fi
}

# Function to clean old backups
cleanup_old_backups() {
    echo -e "${BLUE}🧹 Cleaning up old backups...${NC}"
    
    # Remove backups older than retention days
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -mtime +$RETENTION_DAYS -delete
    
    # List remaining backups
    echo -e "${BLUE}📋 Remaining backups:${NC}"
    ls -la "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
}

# Function to upload to cloud storage (optional)
upload_to_cloud() {
    # Check if AWS CLI is available and configured
    if command -v aws &> /dev/null; then
        echo -e "${BLUE}☁️  Uploading to AWS S3...${NC}"
        
        # Get S3 bucket from environment or use default
        S3_BUCKET=${S3_BACKUP_BUCKET:-"mindful-ad-wizard-backups"}
        
        # Upload backup
        if aws s3 cp "${BACKUP_DIR}/${COMPRESSED_FILE}" "s3://${S3_BUCKET}/database/" --quiet; then
            echo -e "${GREEN}✅ Uploaded to S3: s3://${S3_BUCKET}/database/${COMPRESSED_FILE}${NC}"
        else
            echo -e "${YELLOW}⚠️  S3 upload failed (bucket might not exist or no permissions)${NC}"
        fi
    fi
    
    # Check if Google Cloud SDK is available
    if command -v gcloud &> /dev/null; then
        echo -e "${BLUE}☁️  Uploading to Google Cloud Storage...${NC}"
        
        # Get GCS bucket from environment
        GCS_BUCKET=${GCS_BACKUP_BUCKET:-"mindful-ad-wizard-backups"}
        
        # Upload backup
        if gsutil cp "${BACKUP_DIR}/${COMPRESSED_FILE}" "gs://${GCS_BUCKET}/database/" 2>/dev/null; then
            echo -e "${GREEN}✅ Uploaded to GCS: gs://${GCS_BUCKET}/database/${COMPRESSED_FILE}${NC}"
        else
            echo -e "${YELLOW}⚠️  GCS upload failed (bucket might not exist or no permissions)${NC}"
        fi
    fi
}

# Function to send backup notification
send_notification() {
    local status="$1"
    local message="$2"
    
    # Send email notification if configured
    if [ -n "$BACKUP_EMAIL" ]; then
        echo -e "${BLUE}📧 Sending email notification...${NC}"
        # This would require a mail command or service
        # echo "$message" | mail -s "Backup $status - Mindful Ad Wizard" "$BACKUP_EMAIL"
    fi
    
    # Send webhook notification if configured
    if [ -n "$BACKUP_WEBHOOK_URL" ]; then
        echo -e "${BLUE}🔗 Sending webhook notification...${NC}"
        curl -X POST "$BACKUP_WEBHOOK_URL" \
             -H "Content-Type: application/json" \
             -d "{\"status\":\"$status\",\"message\":\"$message\",\"environment\":\"$ENV\"}" \
             --silent > /dev/null || echo -e "${YELLOW}⚠️  Webhook notification failed${NC}"
    fi
}

# Function to list available backups
list_backups() {
    echo -e "${BLUE}📋 Available backups:${NC}"
    
    if [ -d "$BACKUP_DIR" ]; then
        ls -la "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null | while read -r line; do
            echo -e "${GREEN}  $line${NC}"
        done
    else
        echo -e "${YELLOW}No backup directory found${NC}"
    fi
}

# Function to restore from backup (interactive)
restore_backup() {
    echo -e "${RED}⚠️  DANGER: This will replace the current database!${NC}"
    echo -e "${RED}Make sure you have a recent backup before proceeding.${NC}"
    
    read -p "Are you sure you want to restore? (type 'yes' to confirm): " -r
    if [ "$REPLY" != "yes" ]; then
        echo -e "${YELLOW}Restore cancelled${NC}"
        exit 0
    fi
    
    list_backups
    echo ""
    read -p "Enter backup filename (without path): " -r backup_filename
    
    if [ ! -f "${BACKUP_DIR}/${backup_filename}" ]; then
        echo -e "${RED}❌ Backup file not found: ${backup_filename}${NC}"
        exit 1
    fi
    
    echo -e "${BLUE}🔄 Restoring from backup: ${backup_filename}${NC}"
    
    local compose_file="docker-compose.yml"
    if [ "$ENV" = "dev" ]; then
        compose_file="docker-compose.dev.yml"
    else
        compose_file="docker-compose.prod.yml"
    fi
    
    # Decompress if needed
    if [[ "$backup_filename" == *.gz ]]; then
        echo -e "${BLUE}🗜️  Decompressing backup...${NC}"
        gunzip -c "${BACKUP_DIR}/${backup_filename}" | \
        docker-compose -f "$compose_file" exec -T postgres psql -U mindful_user
    else
        docker-compose -f "$compose_file" exec -T postgres psql -U mindful_user < "${BACKUP_DIR}/${backup_filename}"
    fi
    
    echo -e "${GREEN}✅ Database restored successfully${NC}"
}

# Main function
main() {
    case "$BACKUP_TYPE" in
        "manual")
            perform_backup
            cleanup_old_backups
            upload_to_cloud
            send_notification "SUCCESS" "Manual backup completed successfully: $COMPRESSED_FILE"
            ;;
        "auto")
            perform_backup
            cleanup_old_backups
            upload_to_cloud
            send_notification "SUCCESS" "Automated backup completed: $COMPRESSED_FILE"
            ;;
        "list")
            list_backups
            ;;
        "restore")
            restore_backup
            ;;
        *)
            echo -e "${RED}❌ Invalid backup type. Use: manual, auto, list, or restore${NC}"
            exit 1
            ;;
    esac
}

# Error handling
trap 'echo -e "${RED}❌ Backup failed!${NC}"; send_notification "FAILED" "Backup process failed"; exit 1' ERR

# Check if running from correct directory
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}❌ Please run this script from the project root directory${NC}"
    exit 1
fi

# Run main function
main

echo -e "${GREEN}🎉 Backup process completed!${NC}"