import fs from 'fs/promises';

async function testTranslation() {
    console.log('Testing translation system...\n');
    
    // Read the sample text
    const sampleText = await fs.readFile('translate_this_text.txt', 'utf-8');
    console.log('Sample text loaded:', sampleText.substring(0, 50) + '...\n');
    
    // Test translation endpoint
    console.log('Testing translation endpoint...');
    try {
        const response = await fetch('http://localhost:3001/api/segment-and-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sampleText.trim() })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log('\n✅ Translation successful!');
        console.log('\nOriginal (first 100 chars):', result.original.substring(0, 100));
        console.log('\nChinese (first 100 chars):', result.chinese.substring(0, 100));
        console.log('\nEnglish (first 100 chars):', result.english.substring(0, 100));
        
        // Check for XML markers
        const originalMarkers = (result.original.match(/<s\d+>/g) || []).length;
        const chineseMarkers = (result.chinese.match(/<s\d+>/g) || []).length;
        const englishMarkers = (result.english.match(/<s\d+>/g) || []).length;
        
        console.log('\n📊 Sentence markers found:');
        console.log(`  Original: ${originalMarkers} sentences`);
        console.log(`  Chinese: ${chineseMarkers} sentences`);
        console.log(`  English: ${englishMarkers} sentences`);
        
        if (originalMarkers > 0 && chineseMarkers > 0 && englishMarkers > 0) {
            console.log('\n✅ XML markers properly formatted!');
        } else {
            console.log('\n⚠️  Warning: XML markers may not be properly formatted');
        }
        
        // Test query endpoint with a sample sentence
        if (originalMarkers > 0) {
            console.log('\n\nTesting query endpoint...');
            const firstSentenceMatch = result.original.match(/<s1>(.*?)<\/s1>/);
            if (firstSentenceMatch) {
                const firstSentence = firstSentenceMatch[1];
                console.log('Using first sentence:', firstSentence);
                
                const queryResponse = await fetch('http://localhost:3001/api/query-claude', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        originalText: sampleText.trim(),
                        highlightedSentence: firstSentence,
                        userQuestion: "What is the philosophical significance of this sentence?"
                    })
                });
                
                if (queryResponse.ok) {
                    const queryResult = await queryResponse.json();
                    console.log('\n✅ Query successful!');
                    console.log('Response preview:', queryResult.response.substring(0, 200) + '...');
                } else {
                    console.log('\n❌ Query failed:', queryResponse.statusText);
                }
            }
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('Make sure the server is running on http://localhost:3001');
    }
}

testTranslation();