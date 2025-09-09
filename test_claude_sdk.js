import { query } from '@anthropic-ai/claude-code';

async function testClaudeSDK() {
    console.log('Testing Claude Code SDK...\n');
    
    const testPrompt = `Translate this simple sentence from Modern Chinese to English:
    
春天来了。

Please respond with just the English translation.`;

    try {
        console.log('Sending test query to Claude...');
        let result = '';
        
        for await (const message of query({
            prompt: testPrompt,
            options: {
                maxTurns: 1,
                systemPrompt: "You are a translator. Provide simple, direct translations.",
                allowedTools: []
            }
        })) {
            console.log('Message type:', message.type);
            if (message.type === "result") {
                result = message.result;
                console.log('Result received:', result);
            } else if (message.type === "error") {
                console.error('Error message:', message);
            } else {
                console.log('Other message:', message);
            }
        }
        
        if (result) {
            console.log('\n✅ Claude SDK is working!');
            console.log('Translation result:', result);
        } else {
            console.log('\n❌ No result received from Claude');
        }
        
    } catch (error) {
        console.error('\n❌ Error calling Claude:', error);
        console.error('Error details:', error.message);
    }
}

testClaudeSDK().catch(console.error);