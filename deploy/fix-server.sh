#!/usr/bin/env bash
# Emergency recovery for DMS on server — run from /var/www/dms
set -euo pipefail

APP_ROOT="/var/www/dms"
DOMAIN="dms.teratech.co.tz"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"

echo "==> 1. PHP 8.4 as default CLI"
if command -v php8.4 >/dev/null 2>&1; then
  sudo update-alternatives --set php /usr/bin/php8.4 2>/dev/null || true
fi
php -v

echo "==> 2. HTTP nginx config (safe if SSL cert missing)"
sudo cp "${APP_ROOT}/deploy/nginx/${DOMAIN}.http.conf" "${NGINX_SITE}"
sudo ln -sf "${NGINX_SITE}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> 3. Storage & cache permissions"
sudo chown -R www-data:www-data "${APP_ROOT}/backend/storage" "${APP_ROOT}/backend/bootstrap/cache"
sudo chmod -R ug+rwx "${APP_ROOT}/backend/storage" "${APP_ROOT}/backend/bootstrap/cache"

echo "==> 4. Backend dependencies"
cd "${APP_ROOT}/backend"
if [[ ! -f .env ]]; then
  cp .env.example .env
  php artisan key:generate
  echo "Created .env — edit DB settings then re-run this script."
  exit 1
fi

composer install --no-dev --optimize-autoloader
php artisan storage:link 2>/dev/null || true
php artisan migrate --force
php artisan config:cache
php artisan route:cache

echo "==> 5. Frontend build"
cd "${APP_ROOT}/frontend"
if [[ ! -d node_modules ]]; then
  npm ci
fi
npm run build

echo "==> 6. Health checks"
curl -sf "http://${DOMAIN}/up" && echo " OK /up" || echo " FAIL /up"
curl -sf -o /dev/null -w "HTTP %{http_code}\n" "http://${DOMAIN}/" || true

echo ""
echo "Site should work at: http://${DOMAIN}/"
echo "Login: admin@company.com / password"
echo ""
echo "For HTTPS after HTTP works:"
echo "  CERTBOT_EMAIL=you@teratech.co.tz ${APP_ROOT}/deploy/nginx/obtain-ssl.sh"
