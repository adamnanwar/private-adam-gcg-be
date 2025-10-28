#!/bin/bash

# PM2 Restart Script for GCG Backend
# Usage: ./restart-pm2.sh

echo "🔄 Restarting GCG Backend with PM2..."

# Restart the process
pm2 restart gcg-backend

# Show status
echo "📊 PM2 Status:"
pm2 status

echo "✅ GCG Backend restarted successfully!"
