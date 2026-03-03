import 'dotenv/config';
import { getChannelVideos, extractChannelInfo } from '../lib/youtube/transcript';

async function test() {
  // Test with real Corinthians channel
  const urls = [
    'https://www.youtube.com/@corinthians',
    'https://www.youtube.com/channel/UCqRraVICLr0asn90cAvkIZQ',
  ];

  for (const url of urls) {
    console.log(`\n=== Testing: ${url} ===`);
    const info = extractChannelInfo(url);
    console.log('Channel info:', info);

    try {
      const videos = await getChannelVideos(url, 3);
      console.log(`Found ${videos.length} videos:`);
      for (const v of videos) {
        console.log(`  - [${v.id}] ${v.title} (${v.duration})`);
      }
    } catch (e: any) {
      console.error('Error:', e.message);
    }
  }
}

test().then(() => process.exit(0));
