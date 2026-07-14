#!/usr/bin/env bash
# Detects your machine's LAN IP and updates apps/mobile/.env and apps/api/.env
# so physical devices on the same Wi-Fi can reach the API, Metro, and CORS is correct.
#
# Usage:
#   bash scripts/set-lan-ip.sh
#   API_PORT=6002 METRO_PORT=6001 ADMIN_PORT=3000 bash scripts/set-lan-ip.sh
#
# Runs automatically before:
#   - npm start  (apps/mobile)
#   - npm run dev (apps/api)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE_ENV="$REPO_ROOT/apps/mobile/.env"
MOBILE_ENV_EXAMPLE="$REPO_ROOT/apps/mobile/.env.example"
API_ENV="$REPO_ROOT/apps/api/.env"
API_ENV_EXAMPLE="$REPO_ROOT/apps/api/.env.example"
ADMIN_ENV="$REPO_ROOT/apps/admin/.env"
ADMIN_ENV_EXAMPLE="$REPO_ROOT/apps/admin/.env.example"
API_PORT="${API_PORT:-6002}"
METRO_PORT="${METRO_PORT:-6001}"
ADMIN_PORT="${ADMIN_PORT:-3000}"

get_lan_ip() {
  local ip=""

  if command -v ipconfig >/dev/null 2>&1; then
    for iface in en0 en1 en2 en3; do
      ip="$(ipconfig getifaddr "$iface" 2>/dev/null || true)"
      if [ -n "$ip" ]; then
        echo "$ip"
        return 0
      fi
    done
  fi

  if command -v hostname >/dev/null 2>&1; then
    ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
    if [ -n "$ip" ]; then
      echo "$ip"
      return 0
    fi
  fi

  ip="$(ifconfig 2>/dev/null | awk '/inet / && $2 != "127.0.0.1" { sub(/addr:/, "", $2); print $2; exit }' || true)"
  if [ -n "$ip" ]; then
    echo "$ip"
    return 0
  fi

  return 1
}

set_env_var() {
  local key="$1"
  local value="$2"
  local file="$3"

  if [ ! -f "$file" ]; then
    touch "$file"
  fi

  if grep -q "^${key}=" "$file" 2>/dev/null; then
    if [[ "$OSTYPE" == "darwin"* ]]; then
      sed -i '' "s|^${key}=.*|${key}=${value}|" "$file"
    else
      sed -i "s|^${key}=.*|${key}=${value}|" "$file"
    fi
  else
    echo "${key}=${value}" >> "$file"
  fi
}

ensure_env_file() {
  local target="$1"
  local example="$2"
  local label="$3"

  if [ ! -f "$target" ]; then
    if [ -f "$example" ]; then
      cp "$example" "$target"
      echo "[set-lan-ip] Created $label from .env.example"
    else
      touch "$target"
      echo "[set-lan-ip] Created empty $label"
    fi
  fi
}

LAN_IP="$(get_lan_ip || true)"

if [ -z "$LAN_IP" ]; then
  echo "[set-lan-ip] Could not detect LAN IP — keeping existing .env values."
  echo "[set-lan-ip] Connect to Wi-Fi and run again."
  exit 0
fi

ensure_env_file "$MOBILE_ENV" "$MOBILE_ENV_EXAMPLE" "apps/mobile/.env"
ensure_env_file "$API_ENV" "$API_ENV_EXAMPLE" "apps/api/.env"
ensure_env_file "$ADMIN_ENV" "$ADMIN_ENV_EXAMPLE" "apps/admin/.env"

API_URL="http://${LAN_IP}:${API_PORT}/api/v1"
API_BASE="http://${LAN_IP}:${API_PORT}"

# Expo / Metro (mobile)
set_env_var "EXPO_PUBLIC_API_URL" "$API_URL" "$MOBILE_ENV"
set_env_var "REACT_NATIVE_PACKAGER_HOSTNAME" "$LAN_IP" "$MOBILE_ENV"
set_env_var "EXPO_PUBLIC_DEV_PORT" "$METRO_PORT" "$MOBILE_ENV"

# Admin panel (Next.js) — same-origin proxy avoids browser CORS/CORP issues
set_env_var "NEXT_PUBLIC_API_URL" "/backend/api/v1" "$ADMIN_ENV"
set_env_var "NEXT_PUBLIC_CAMPUS_ID" "iitj" "$ADMIN_ENV"
set_env_var "API_PROXY_TARGET" "http://127.0.0.1:${API_PORT}" "$ADMIN_ENV"

# API server — bind all interfaces, public URL, CORS for Expo (6001) + admin (3000)
set_env_var "HOST" "0.0.0.0" "$API_ENV"
set_env_var "PORT" "$API_PORT" "$API_ENV"
set_env_var "API_BASE_URL" "$API_BASE" "$API_ENV"

# CORS: Expo dev server (6001) + admin panel (3000), localhost + LAN
CORS_ORIGINS="http://localhost:${METRO_PORT},http://${LAN_IP}:${METRO_PORT},http://localhost:${ADMIN_PORT},http://${LAN_IP}:${ADMIN_PORT}"
set_env_var "CORS_ORIGIN" "$CORS_ORIGINS" "$API_ENV"

echo "[set-lan-ip] LAN IP: $LAN_IP"
echo ""
echo "[mobile]"
echo "  EXPO_PUBLIC_API_URL=$API_URL"
echo "  REACT_NATIVE_PACKAGER_HOSTNAME=$LAN_IP"
echo "  Metro: exp://${LAN_IP}:${METRO_PORT}"
echo ""
echo "[admin]"
echo "  NEXT_PUBLIC_API_URL=/backend/api/v1 (Next rewrite → 127.0.0.1:${API_PORT})"
echo "  Dev: http://localhost:${ADMIN_PORT}"
echo ""
echo "[api]"
echo "  HOST=0.0.0.0"
echo "  API_BASE_URL=$API_BASE"
echo "  CORS_ORIGIN=$CORS_ORIGINS"
echo "  Health: ${API_BASE}/api/v1/health"
