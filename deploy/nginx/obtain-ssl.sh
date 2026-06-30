#!/usr/bin/env bash
# Obtain Let's Encrypt certificate for dms.teratech.co.tz
# Order: HTTP config → certbot → HTTPS config
set -euo pipefail

DOMAIN="dms.teratech.co.tz"
EMAIL="${CERTBOT_EMAIL:-admin@teratech.co.tz}"
APP_ROOT="/var/www/dms"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"

if ! command -v certbot >/dev/null 2>&1; then
  echo "Install certbot first: sudo apt install certbot python3-certbot-nginx"
  exit 1
fi

echo "==> Step 1: HTTP-only nginx (required before certificate exists)"
sudo cp "${APP_ROOT}/deploy/nginx/${DOMAIN}.http.conf" "${NGINX_SITE}"
sudo ln -sf "${NGINX_SITE}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Step 2: Request certificate"
sudo certbot certonly \
  --nginx \
  -d "${DOMAIN}" \
  --agree-tos \
  -m "${EMAIL}" \
  --non-interactive \
  --keep-until-expiring

echo "==> Step 3: HTTPS nginx config"
sudo cp "${APP_ROOT}/deploy/nginx/${DOMAIN}.conf" "${NGINX_SITE}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Done. Open https://${DOMAIN}/"
echo "Update backend .env: APP_URL=https://${DOMAIN}"
echo "Then: cd ${APP_ROOT}/backend && php artisan config:cache"
