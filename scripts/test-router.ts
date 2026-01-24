import { routeMessage } from '../lib/bot/router';

const tests = [
    { input: "Notícias", expected: "Notícias do Timão" },
    { input: "1", expected: "Notícias do Timão" },
    { input: "Quiz", expected: "Quiz do Timão" },
    { input: "2", expected: "Quiz do Timão" },
    { input: "Jogo", expected: "Game Fiel" },
    { input: "3", expected: "Game Fiel" },
    { input: "Ranking", expected: "Ranking Fiel" },
    { input: "4", expected: "Ranking Fiel" },
];

async function run() {
    console.log("🚀 Starting Router Tests...\n");

    for (const test of tests) {
        console.log(`🤖 Input: "${test.input}"`);
        try {
            const result = await routeMessage('test-user', test.input);
            console.log(`📦 Output Type: ${result.type}`);
            console.log(`📝 Content Preview: ${result.content.substring(0, 50).replace(/\n/g, ' ')}...`);
            
            const isMatch = result.content.includes(test.expected) || (test.expected === "LLM Response" && result.type === 'text');
            
            if (isMatch) {
                 console.log(`✅ TEST PASSED`);
            } else {
                 console.log(`❌ TEST FAILED - Expected "${test.expected}"`);
            }
        } catch (error) {
            console.error(`❌ ERROR:`, error);
        }
        console.log("-----------------------------------");
    }
}

// Mocking generateCorinthiansResponse for the test if needed, 
// or relying on the real one if env vars are set.
// For this script, we assume the real one works or fails gracefully.

run();
