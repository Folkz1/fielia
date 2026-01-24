const https = require('https');

const API_URL = "https://apps-evolution-api.klx2s6.easypanel.host";
const API_KEY = "94844982814C-49AB-8CEE-F6E840AA3DF5";
const INSTANCE = "teste";
const WEBHOOK_URL = "https://apps-fielia.klx2s6.easypanel.host/api/webhooks/whatsapp";

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
        } catch (e) {
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
            "MESSAGES_UPSERT" // Fixed case
        ]
    }
  };

  console.log("Sending configuration...");
  const result = await request(`/webhook/set/${INSTANCE}`, 'POST', payload);
  console.log('\n--- Setup Result ---');
  console.log(JSON.stringify(result, null, 2));
}

setup();
