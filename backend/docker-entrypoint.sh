#!/bin/sh

# Exit on any error
set -e

echo "🔄 Running database migrations..."
npx prisma migrate deploy

echo "✅ Migrations completed!"

echo "🚀 Starting application..."
exec "$@"
