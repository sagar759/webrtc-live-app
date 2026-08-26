const https = require('https');
const http = require('http');

/**
 * Periodically pings the backend server to keep it awake on free hosting tiers (e.g., Render).
 * Automatically detects RENDER_EXTERNAL_URL (provided by Render) or BACKEND_URL.
 */
function startKeepAlive() {
  const url = process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL;
  
  if (!url) {
    console.log('[Keep-Alive] BACKEND_URL or RENDER_EXTERNAL_URL not configured. Self-pinging is disabled.');
    return;
  }

  // Interval in milliseconds (default: 10 minutes)
  const intervalMinutes = parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES, 10) || 10;
  const intervalMs = intervalMinutes * 60 * 1000;

  console.log(`[Keep-Alive] Service initialized. Target URL: ${url} (Interval: every ${intervalMinutes} minutes)`);

  const client = url.startsWith('http://') ? http : https;

  const ping = () => {
    client.get(url, (res) => {
      console.log(`[Keep-Alive] Ping sent to ${url} - Response status: ${res.statusCode} (${new Date().toLocaleTimeString()})`);
    }).on('error', (err) => {
      console.error(`[Keep-Alive] Ping failed to ${url}:`, err.message);
    });
  };

  // Run first ping after interval to prevent immediate self-request before fully ready
  setInterval(ping, intervalMs);
}

module.exports = startKeepAlive;
