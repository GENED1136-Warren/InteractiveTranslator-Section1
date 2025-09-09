import { query } from '@anthropic-ai/claude-code';

async function testTranslation() {
    const translationPrompt = `You are an expert translator. Translate the following Modern Simplified Chinese text.

IMPORTANT RULES:
1. Split the text into logical sentences or phrases (use punctuation as guide)
2. Mark each sentence with XML tags: <s1>, <s2>, <s3>, etc.
3. Maintain the SAME sentence numbers across all versions
4. Translate with full context awareness - consider the whole text's meaning
5. For Modern Chinese, use simplified characters
6. For Ancient/Classical Chinese, use traditional characters and classical grammar (文言文)
7. Preserve the meaning and style appropriate to each target language

Your output must be EXACTLY in this format:

INPUT:
<s1>first sentence in original</s1><s2>second sentence</s2>...

ENGLISH:
<s1>first sentence in English</s1><s2>second sentence in English</s2>...

Text to translate:
春天来了。`;

    try {
        console.log('Sending translation request...\n');
        
        const messages = [];
        for await (const message of query({
            prompt: translationPrompt,
            options: {
                maxTurns: 1,
                systemPrompt: "You are an expert translator specializing in Modern Chinese. Provide natural, fluent translations.",
                allowedTools: []
            }
        })) {
            messages.push(message);
            console.log(`Message ${messages.length}:`, {
                type: message.type,
                hasResult: message.result !== undefined,
                resultValue: message.result
            });
        }
        
        // Find the result message
        const resultMessage = messages.find(m => m.type === 'result');
        if (resultMessage && resultMessage.result) {
            console.log('\n✅ Translation successful!');
            console.log('Result:', resultMessage.result);
        } else {
            console.log('\n❌ No result found in messages');
            console.log('All messages:', JSON.stringify(messages, null, 2));
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

testTranslation().catch(console.error);