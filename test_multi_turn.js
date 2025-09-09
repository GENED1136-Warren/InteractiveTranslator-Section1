import { query } from '@anthropic-ai/claude-code';

async function testMultiTurn() {
    const translationPrompt = `You are an expert translator. Translate the following Modern Simplified Chinese text.

IMPORTANT: Do NOT use any tools. Just provide the translation directly.

Your output must be EXACTLY in this format:

INPUT:
<s1>first sentence in original</s1>

ENGLISH:
<s1>first sentence in English</s1>

Text to translate:
春天来了。`;

    try {
        console.log('Testing with multiple turns...\n');
        
        let finalResult = '';
        const messages = [];
        
        for await (const message of query({
            prompt: translationPrompt,
            options: {
                maxTurns: 5, // Allow more turns
                systemPrompt: "You are a translator. Provide direct translations without using any tools. Just respond with the translated text in the requested format.",
                disallowedTools: ['TodoWrite', 'Task', 'WebSearch'], // Explicitly disallow tools
                allowedTools: [] // No tools allowed
            }
        })) {
            messages.push(message);
            console.log(`Message ${messages.length}: type=${message.type}`);
            
            if (message.type === "result") {
                finalResult = message.result || '';
                console.log('Result:', finalResult);
            } else if (message.type === "assistant" && message.message && message.message.content) {
                // Check assistant messages for text content
                const content = message.message.content;
                if (Array.isArray(content)) {
                    for (const item of content) {
                        if (item.type === 'text') {
                            console.log('Assistant text:', item.text);
                        }
                    }
                }
            }
        }
        
        console.log('\nFinal result:', finalResult);
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testMultiTurn().catch(console.error);