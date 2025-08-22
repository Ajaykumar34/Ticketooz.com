#!/bin/bash

# Auto-deployment script for continuous deployment
# This script can be triggered by GitHub webhooks or run as a cron job

set -e

# Configuration
PROJECT_NAME="ticketooz"
DEPLOY_PATH="/var/www/$PROJECT_NAME"
LOG_FILE="/var/log/$PROJECT_NAME-deploy.log"
HEALTHCHECK_URL="https://ticketooz.com"

# Logging function
log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# Health check function
health_check() {
    local url=$1
    local max_attempts=5
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" > /dev/null; then
            log "✓ Health check passed for $url"
            return 0
        fi
        
        log "⚠ Health check attempt $attempt failed for $url"
        sleep 5
        ((attempt++))
    done
    
    log "✗ Health check failed after $max_attempts attempts"
    return 1
}

# Rollback function
rollback() {
    log "🔄 Initiating rollback..."
    
    # Find latest backup
    latest_backup=$(find /var/backups/$PROJECT_NAME -name "backup-*" -type d | sort -r | head -n1)
    
    if [ -n "$latest_backup" ]; then
        log "Rolling back to: $latest_backup"
        rm -rf "$DEPLOY_PATH"
        cp -r "$latest_backup" "$DEPLOY_PATH"
        
        # Restart web server
        if command -v nginx &> /dev/null; then
            systemctl reload nginx
        elif command -v apache2 &> /dev/null; then
            systemctl reload apache2
        fi
        
        log "✓ Rollback completed"
    else
        log "✗ No backup found for rollback"
        return 1
    fi
}

# Main deployment function
deploy() {
    log "🚀 Starting auto-deployment for $PROJECT_NAME"
    
    cd "$DEPLOY_PATH"
    
    # Check for changes
    git fetch origin main
    local_commit=$(git rev-parse HEAD)
    remote_commit=$(git rev-parse origin/main)
    
    if [ "$local_commit" = "$remote_commit" ]; then
        log "📋 No new changes to deploy"
        exit 0
    fi
    
    log "📦 New changes detected, deploying..."
    log "Local: $local_commit"
    log "Remote: $remote_commit"
    
    # Create backup before deployment
    backup_name="backup-$(date +%Y%m%d_%H%M%S)"
    backup_path="/var/backups/$PROJECT_NAME/$backup_name"
    mkdir -p "/var/backups/$PROJECT_NAME"
    cp -r "$DEPLOY_PATH" "$backup_path"
    log "📋 Backup created: $backup_name"
    
    # Pull latest changes
    git pull origin main
    
    # Install/update dependencies
    log "📦 Installing dependencies..."
    npm ci --production=false
    
    # Build application
    log "🔨 Building application..."
    npm run build
    
    # Set permissions
    chown -R www-data:www-data "$DEPLOY_PATH"
    chmod -R 755 "$DEPLOY_PATH"
    
    # Reload web server
    if command -v nginx &> /dev/null; then
        nginx -t && systemctl reload nginx
        log "🔄 Nginx reloaded"
    elif command -v apache2 &> /dev/null; then
        apache2ctl configtest && systemctl reload apache2
        log "🔄 Apache reloaded"
    fi
    
    # Wait a moment for server to restart
    sleep 5
    
    # Health check
    if health_check "$HEALTHCHECK_URL"; then
        log "✅ Deployment successful!"
        
        # Clean up old backups (keep last 5)
        find "/var/backups/$PROJECT_NAME" -name "backup-*" -type d | sort -r | tail -n +6 | xargs rm -rf
        log "🧹 Old backups cleaned up"
    else
        log "❌ Health check failed, initiating rollback"
        rollback
        
        if health_check "$HEALTHCHECK_URL"; then
            log "✅ Rollback successful"
        else
            log "❌ Rollback failed - manual intervention required"
            # Send alert (email, Slack, etc.)
        fi
    fi
}

# Error handling
trap 'log "❌ Deployment failed with error"; rollback' ERR

# Run deployment
deploy

log "📊 Deployment completed at $(date)"