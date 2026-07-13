#!/usr/bin/env bash
set -euo pipefail

# Reads Stitch API key from ~/.cursor/mcp.json (stitch server config)
MCP_JSON="${HOME}/.cursor/mcp.json"
API_KEY=$(python3 -c "import json; d=json.load(open('$MCP_JSON')); print(d['mcpServers']['stitch']['headers']['X-Goog-Api-Key'])" 2>/dev/null || echo "")
if [ -z "$API_KEY" ]; then echo "Stitch API key not found in $MCP_JSON"; exit 1; fi

PROJECT_ID="4750076947656194432"
BASE="$(cd "$(dirname "$0")/.." && pwd)/apps/mobile/assets/stitch"
mkdir -p "$BASE"

fetch_screen() {
  local name="$1" sid="$2"
  local dir="$BASE/$name"
  mkdir -p "$dir"
  echo "Fetching $name..."
  local resp
  resp=$(curl -sS -X POST "https://stitch.googleapis.com/mcp" \
    -H "Content-Type: application/json" \
    -H "X-Goog-Api-Key: $API_KEY" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_screen\",\"arguments\":{\"name\":\"projects/${PROJECT_ID}/screens/${sid}\",\"projectId\":\"${PROJECT_ID}\",\"screenId\":\"${sid}\"}}}")
  echo "$resp" > "$dir/meta.json"
  local html_url ss_url
  html_url=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('structuredContent',{}).get('htmlCode',{}).get('downloadUrl',''))")
  ss_url=$(echo "$resp" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('structuredContent',{}).get('screenshot',{}).get('downloadUrl',''))")
  [ -n "$html_url" ] && curl -sSL "$html_url" -o "$dir/screen.html"
  [ -n "$ss_url" ] && curl -sSL "$ss_url" -o "$dir/screenshot.png"
}

fetch_screen "transport-schedule" "03b67ba873dd426e9270a74a76b6433a"
fetch_screen "notes" "20b72a3a890140e4b7cefed74b16040d"
fetch_screen "emergency-contacts" "653cf7bd638e40bb936e450087009927"
fetch_screen "notices-feed" "682fcc6252214e7f9a7fec2432209c92"
fetch_screen "campus-services" "74f8fc61ae614d548323d41a1a10fc0e"
fetch_screen "mess-menu" "7dd2aeb68974435a885a03c4133a4f23"
fetch_screen "essential-portals" "861f72d2bfb541f7b5912880f3e5d404"
fetch_screen "home-dashboard" "8828be0c6d6348ad80211c4587b2129a"
fetch_screen "mess-qr-empty" "b10c3f993223433f8a760f28d2675f86"
fetch_screen "campus-map" "e82f1f3e3ac04f7da7e425dfb74995ad"
fetch_screen "suggest-something" "55b789e51a1a404ba338698068074a9e"
fetch_screen "add-class-form" "1a77a6cac81d4ff1a5971aa351ffff4d"
fetch_screen "about-iitj" "6e2235b06c394f9db452d652d59f26ca"
fetch_screen "settings" "a7ef33f679b842d092335ffb3b8b0d9c"
fetch_screen "my-timetable" "1c874083bdbc47e0a96da65357e64b47"

echo "Done: $(ls -d "$BASE"/*/ 2>/dev/null | wc -l | tr -d ' ') screens in $BASE"
