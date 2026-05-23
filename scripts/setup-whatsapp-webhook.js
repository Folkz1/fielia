const https = require('https');
require('dotenv').config();

const API_URL = process.env.EVOLUTION_API_URL;
const API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE = process.env.EVOLUTION_INSTANCE_NAME;
const WEBHOOK_URL =
  process.env.WHATSAPP_WEBHOOK_URL ||
  (process.env.NEXT_PUBLIC_APP_URL
    ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/webhooks/whatsapp`
    : null);

if (!API_URL || !API_KEY || !INSTANCE || !WEBHOOK_URL) {
  console.error('Missing env vars. Required: EVOLUTION_API_URL, EVOLUTION_API_KEY, EVOLUTION_INSTANCE_NAME and WHATSAPP_WEBHOOK_URL (or NEXT_PUBLIC_APP_URL).');
  process.exit(1);
}

function request(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${API_URL}${endpoint}`);
    const options = {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': API_KEY
      }
    };

    const req = https.request(url, options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(JSON.parse(body));
          } else {
            console.error(`Error ${res.statusCode}: ${body}`);
            resolve(JSON.parse(body));
          }
        } catch {
            if (body === 'OK') resolve({ status: 'OK' });
            else {
                console.error('Invalid JSON response', body);
                resolve(null);
            }
        }
      });
    });

    req.on('error', (e) => reject(e));
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function setup() {
  console.log(`Setting up webhook for instance: ${INSTANCE}...`);
  console.log(`Target URL: ${WEBHOOK_URL}`);

  const payload = {
    webhook: {
        url: WEBHOOK_URL,
        webhookByEvents: false, 
        webhookBase64: false,
        enabled: true,
        events: [
            "MESSAGES_UPSERT",
            "GROUP_PARTICIPANTS_UPDATE"
        ]
    }
  };

  console.log("Sending configuration...");
  const result = await request(`/webhook/set/${INSTANCE}`, 'POST', payload);
  console.log('\n--- Setup Result ---');
  console.log(JSON.stringify(result, null, 2));
}

setup();
