
import { evolutionAPI } from '../lib/evolution-api';

async function testConnection() {
  try {
    console.log('Testing Evolution API Connection...');
    console.log(`URL: ${process.env.EVOLUTION_API_URL}`);
    console.log(`Instance: ${process.env.EVOLUTION_INSTANCE_NAME}`);

    const status = await evolutionAPI.getInstanceStatus();
    console.log('✅ Connection Successful!');
    console.log('Instance Status:', JSON.stringify(status, null, 2));

  } catch (error) {
    console.error('❌ Connection Failed:', error);
  }
}

testConnection();
