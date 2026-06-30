#!/usr/bin/env bash
# Obtain Let's Encrypt certificate for dms.teratech.co.tz
# Run on server while the HTTP (port 80) site is already working.
set -euo pipefail

DOMAIN="dms.teratech.co.tz"
EMAIL="${CERTBOT_EMAIL:-admin@teratech.co.tz}"

if ! command -v certbot >/dev/null 2>&1; then
  echo "Install certbot first: sudo apt install certbot python3-certbot-nginx"
  exit 1
fi

echo "==> Requesting certificate for ${DOMAIN}"
sudo certbot certonly \
  --nginx \
  -d "${DOMAIN}" \
  --agree-tos \
  -m "${EMAIL}" \
  --non-interactive \
  --keep-until-expiring

echo "==> Installing SSL nginx config"
sudo cp "/var/www/dms/deploy/nginx/${DOMAIN}.conf" "/etc/nginx/sites-available/${DOMAIN}"
sudo ln -sf "/etc/nginx/sites-available/${DOMAIN}" "/etc/nginx/sites-enabled/${DOMAIN}"
sudo nginx -t
sudo systemctl reload nginx

echo "==> Certificate installed. Test: https://${DOMAIN}/"
echo "Renewal is automatic via certbot timer. Check: sudo certbot renew --dry-run"
