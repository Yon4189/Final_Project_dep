#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Running Composer ---"
composer install --no-dev --optimize-autoloader --no-interaction

echo "--- Caching Config ---"
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "--- Running Migrations ---"
# The --force flag is required for production
php artisan migrate --force

echo "--- Build Finished ---"
