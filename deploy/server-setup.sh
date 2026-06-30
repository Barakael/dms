#!/usr/bin/env bash
# Run on the server as a user with sudo, from /var/www/dms
set -euo pipefail

APP_ROOT="/var/www/dms"
DOMAIN="dms.teratech.co.tz"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"
PHP_SOCK="php8.3-fpm.sock"

if [[ ! -d "${APP_ROOT}/backend" ]]; then
  echo "Expected project at ${APP_ROOT}. Clone the repo there first."
  exit 1
fi

echo "==> Backend dependencies"
cd "${APP_ROOT}/backend"
composer install --no-dev --optimize-autoloader

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "Created .env — edit ${APP_ROOT}/backend/.env before continuing."
  exit 1
fi

php artisan key:generate --force
php artisan migrate --force
php artisan storage:link
php artisan config:cache
php artisan route:cache
php artisan view:cache

echo "==> Frontend build"
cd "${APP_ROOT}/frontend"
npm ci
npm run build

echo "==> Permissions"
sudo chown -R www-data:www-data "${APP_ROOT}/backend/storage" "${APP_ROOT}/backend/bootstrap/cache"
sudo chmod -R ug+rwx "${APP_ROOT}/backend/storage" "${APP_ROOT}/backend/bootstrap/cache"

echo "==> Nginx site"
if [[ ! -S "/var/run/php/${PHP_SOCK}" ]]; then
  echo "Warning: /var/run/php/${PHP_SOCK} not found. Update deploy/nginx/${DOMAIN}.conf"
fi

sudo cp "${APP_ROOT}/deploy/nginx/${DOMAIN}.conf" "${NGINX_SITE}"
sudo ln -sf "${NGINX_SITE}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done. Open http://${DOMAIN}/"
echo "Optional: sudo certbot --nginx -d ${DOMAIN}"
