#!/usr/bin/env bash
# Enable HTTPS for dms.teratech.co.tz (after certificate exists)
set -euo pipefail

DOMAIN="dms.teratech.co.tz"
APP_ROOT="/var/www/dms"
NGINX_SITE="/etc/nginx/sites-available/${DOMAIN}"
CERT_DIR="/etc/letsencrypt/live/${DOMAIN}"

if [[ ! -f "${CERT_DIR}/fullchain.pem" ]]; then
  echo "Certificate not found at ${CERT_DIR}/"
  echo "Run first:"
  echo "  sudo cp ${APP_ROOT}/deploy/nginx/${DOMAIN}.http.conf ${NGINX_SITE}"
  echo "  sudo nginx -t && sudo systemctl reload nginx"
  echo "  sudo certbot certonly --nginx -d ${DOMAIN}"
  exit 1
fi

echo "==> Installing HTTPS nginx config for ${DOMAIN}"
sudo cp "${APP_ROOT}/deploy/nginx/${DOMAIN}.conf" "${NGINX_SITE}"
sudo ln -sf "${NGINX_SITE}" "/etc/nginx/sites-enabled/${DOMAIN}"

echo "==> Testing nginx"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Verifying"
if curl -sf "https://${DOMAIN}/" | grep -q "Company DMS"; then
  echo "HTTPS OK — Company DMS is being served."
else
  echo "WARNING: HTTPS may still be serving the wrong site."
  echo "Check: sudo nginx -T | grep -A2 'server_name ${DOMAIN}'"
  echo "Another default_server on port 443 may be taking precedence."
fi

echo ""
echo "Update backend .env:"
echo "  APP_URL=https://${DOMAIN}"
echo "  SANCTUM_STATEFUL_DOMAINS=${DOMAIN}"
echo "Then: cd ${APP_ROOT}/backend && php artisan config:cache"
