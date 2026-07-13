#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');

// Detect LAN IP
function getLanIp() {
  const interfaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(interfaces)) {
    const nameLower = name.toLowerCase();
    
    // Skip VM, VPN, Docker, Tailscale interfaces
    if (
      nameLower.includes('virtual') ||
      nameLower.includes('vbox') ||
      nameLower.includes('docker') ||
      nameLower.includes('tailscale') ||
      nameLower.includes('vpn') ||
      nameLower.includes('loopback')
    ) {
      continue;
    }

    for (const net of interfaces[name]) {
      // We only want non-internal IPv4
      if (net.family === 'IPv4' && !net.internal) {
        // Skip link-local addresses (APIPA)
        if (net.address.startsWith('169.254.')) {
          continue;
        }
        
        candidates.push({
          address: net.address,
          name: nameLower
        });
      }
    }
  }

  if (candidates.length === 0) {
    // If no candidate, fallback to any non-internal IPv4 that isn't link-local
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254.')) {
          return net.address;
        }
      }
    }
    return null;
  }

  // Prioritize wifi/wireless adapters
  const wifiCandidate = candidates.find(c => c.name.includes('wifi') || c.name.includes('wireless') || c.name.includes('wlan'));
  if (wifiCandidate) {
    return wifiCandidate.address;
  }

  // Next, prioritize ethernet adapters
  const ethCandidate = candidates.find(c => c.name.includes('ethernet') || c.name.includes('eth'));
  if (ethCandidate) {
    return ethCandidate.address;
  }

  // Otherwise return the first candidate
  return candidates[0].address;
}

const REPO_ROOT = path.resolve(__dirname, '..');
const MOBILE_ENV = path.join(REPO_ROOT, 'apps', 'mobile', '.env');
const MOBILE_ENV_EXAMPLE = path.join(REPO_ROOT, 'apps', 'mobile', '.env.example');
const API_ENV = path.join(REPO_ROOT, 'apps', 'api', '.env');
const API_ENV_EXAMPLE = path.join(REPO_ROOT, 'apps', 'api', '.env.example');

const API_PORT = process.env.API_PORT || '6002';
const METRO_PORT = process.env.METRO_PORT || '6001';
const ADMIN_PORT = process.env.ADMIN_PORT || '3000';

function ensureEnvFile(target, example, label) {
  if (!fs.existsSync(target)) {
    if (fs.existsSync(example)) {
      fs.copyFileSync(example, target);
      console.log(`[set-lan-ip] Created ${label} from .env.example`);
    } else {
      fs.writeFileSync(target, '');
      console.log(`[set-lan-ip] Created empty ${label}`);
    }
  }
}

function setEnvVar(key, value, file) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, '');
  }

  let content = fs.readFileSync(file, 'utf8');
  const lines = content.split(/\r?\n/);
  let updated = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith(`${key}=`)) {
      lines[i] = `${key}=${value}`;
      updated = true;
      break;
    }
  }

  if (updated) {
    content = lines.join('\n');
  } else {
    // If not found, append to the end
    if (content.length > 0 && !content.endsWith('\n')) {
      content += '\n';
    }
    content += `${key}=${value}\n`;
  }

  fs.writeFileSync(file, content, 'utf8');
}

const LAN_IP = getLanIp();

if (!LAN_IP) {
  console.log('[set-lan-ip] Could not detect LAN IP — keeping existing .env values.');
  console.log('[set-lan-ip] Connect to Wi-Fi and run again.');
  process.exit(0);
}

ensureEnvFile(MOBILE_ENV, MOBILE_ENV_EXAMPLE, 'apps/mobile/.env');
ensureEnvFile(API_ENV, API_ENV_EXAMPLE, 'apps/api/.env');

const API_URL = `http://${LAN_IP}:${API_PORT}/api/v1`;
const API_BASE = `http://${LAN_IP}:${API_PORT}`;

// Expo / Metro (mobile)
setEnvVar('EXPO_PUBLIC_API_URL', API_URL, MOBILE_ENV);
setEnvVar('REACT_NATIVE_PACKAGER_HOSTNAME', LAN_IP, MOBILE_ENV);
setEnvVar('EXPO_PUBLIC_DEV_PORT', METRO_PORT, MOBILE_ENV);

// API server
setEnvVar('HOST', '0.0.0.0', API_ENV);
setEnvVar('PORT', API_PORT, API_ENV);
setEnvVar('API_BASE_URL', API_BASE, API_ENV);

// CORS: Expo dev server (6001) + admin panel (3000), localhost + LAN
const CORS_ORIGINS = `http://localhost:${METRO_PORT},http://${LAN_IP}:${METRO_PORT},http://localhost:${ADMIN_PORT},http://${LAN_IP}:${ADMIN_PORT}`;
setEnvVar('CORS_ORIGIN', CORS_ORIGINS, API_ENV);

console.log(`[set-lan-ip] LAN IP: ${LAN_IP}`);
console.log('');
console.log('[mobile]');
console.log(`  EXPO_PUBLIC_API_URL=${API_URL}`);
console.log(`  REACT_NATIVE_PACKAGER_HOSTNAME=${LAN_IP}`);
console.log(`  Metro: exp://${LAN_IP}:${METRO_PORT}`);
console.log('');
console.log('[api]');
console.log('  HOST=0.0.0.0');
console.log(`  API_BASE_URL=${API_BASE}`);
console.log(`  CORS_ORIGIN=${CORS_ORIGINS}`);
console.log(`  Health: ${API_BASE}/api/v1/health`);
