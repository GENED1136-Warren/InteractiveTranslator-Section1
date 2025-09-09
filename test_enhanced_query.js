// Test enhanced query interface with conversation history and markdown

async function testEnhancedQuery() {
    console.log('Testing enhanced query interface...\n');
    
    // Test 1: Initial query with markdown response
    console.log('Test 1: Initial query requesting markdown formatting');
    try {
        const response1 = await fetch('http://localhost:3001/api/query-claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                originalText: '君子以德治國，小人以力服人。智者察言觀色，愚者妄言妄行。',
                highlightedSentence: '君子以德治國',
                userQuestion: 'Please explain this concept using markdown formatting with headers, bullet points, and emphasis.',
                conversationHistory: [],
                model: 'sonnet'
            })
        });
        
        if (response1.ok) {
            const result = await response1.json();
            console.log('✅ Initial query successful');
            
            // Check for markdown elements
            if (result.response.includes('#') || result.response.includes('**') || result.response.includes('*')) {
                console.log('✅ Response contains markdown formatting');
            }
            
            // Show a preview
            const preview = result.response.substring(0, 100) + '...';
            console.log(`   Preview: "${preview}"`);
        } else {
            const error = await response1.json();
            console.log('❌ Error:', error.details || error.error);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
    
    console.log('\n---\n');
    
    // Test 2: Continue conversation with history
    console.log('Test 2: Continuing conversation with history');
    try {
        const conversationHistory = [
            { role: 'user', content: 'Please explain this concept using markdown formatting with headers, bullet points, and emphasis.' },
            { role: 'assistant', content: '# The Concept of Virtuous Governance\n\n**君子以德治國** represents a fundamental principle...' }
        ];
        
        const response2 = await fetch('http://localhost:3001/api/query-claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                originalText: '君子以德治國，小人以力服人。智者察言觀色，愚者妄言妄行。',
                highlightedSentence: '小人以力服人',
                userQuestion: 'How does this contrast with the previous concept?',
                conversationHistory: conversationHistory,
                model: 'sonnet'
            })
        });
        
        if (response2.ok) {
            const result = await response2.json();
            console.log('✅ Conversation continuation successful');
            
            // Check if response references previous context
            if (result.response.toLowerCase().includes('contrast') || 
                result.response.toLowerCase().includes('previous') ||
                result.response.toLowerCase().includes('君子')) {
                console.log('✅ Response shows awareness of conversation history');
            }
            
            // Show a preview
            const preview = result.response.substring(0, 100) + '...';
            console.log(`   Preview: "${preview}"`);
        } else {
            const error = await response2.json();
            console.log('❌ Error:', error.details || error.error);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
    
    console.log('\n---\n');
    
    // Test 3: Complex markdown with code blocks
    console.log('Test 3: Query requesting code examples');
    try {
        const response3 = await fetch('http://localhost:3001/api/query-claude', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                originalText: '君子以德治國，小人以力服人。',
                highlightedSentence: '君子以德治國',
                userQuestion: 'Show me how this would be structured in JSON format as a code example.',
                conversationHistory: [],
                model: 'opus'
            })
        });
        
        if (response3.ok) {
            const result = await response3.json();
            console.log('✅ Code example query successful');
            
            // Check for code blocks
            if (result.response.includes('```')) {
                console.log('✅ Response contains code blocks');
            }
            
            // Show if JSON is present
            if (result.response.includes('{') && result.response.includes('}')) {
                console.log('✅ Response includes JSON structure');
            }
        } else {
            const error = await response3.json();
            console.log('❌ Error:', error.details || error.error);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
    
    console.log('\n✨ Enhanced query testing complete!');
    console.log('📝 Features tested:');
    console.log('   - Markdown formatting in responses');
    console.log('   - Conversation history awareness');
    console.log('   - Code block rendering');
    console.log('   - Multi-turn conversations');
}

testEnhancedQuery().catch(console.error);