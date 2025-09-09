// Test Ancient Chinese as output from Modern Chinese and English

const testCases = [
    {
        text: '治理国家要依靠道义、名分和权变。',
        inputLanguage: 'modern',
        outputLanguages: ['ancient'],
        description: 'Modern Chinese → Ancient Chinese'
    },
    {
        text: 'To govern a state requires righteousness and wisdom.',
        inputLanguage: 'english', 
        outputLanguages: ['ancient'],
        description: 'English → Ancient Chinese'
    },
    {
        text: 'The wise ruler governs with virtue and adapts to circumstances.',
        inputLanguage: 'english',
        outputLanguages: ['ancient', 'modern'],
        description: 'English → Ancient + Modern Chinese'
    }
];

async function testAncientOutput() {
    console.log('🏛️ Testing Ancient Chinese Output Generation\n');
    console.log('=' .repeat(50) + '\n');
    
    for (const testCase of testCases) {
        console.log(`📝 ${testCase.description}`);
        console.log(`   Input: "${testCase.text}"`);
        
        try {
            const response = await fetch('http://localhost:3001/api/segment-and-translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: testCase.text,
                    inputLanguage: testCase.inputLanguage,
                    outputLanguages: testCase.outputLanguages
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Check Ancient Chinese output
            if (result.translations?.ancient) {
                const ancient = result.translations.ancient;
                console.log(`   ✅ Ancient Chinese generated`);
                
                // Extract first sentence for preview
                const firstSentence = ancient.match(/<s1>(.*?)<\/s1>/);
                if (firstSentence) {
                    console.log(`   Preview: "${firstSentence[1]}"`);
                }
                
                // Check for classical Chinese characteristics
                const hasClassicalMarkers = /之|乎|者|也|矣|焉|哉|而|於|為/.test(ancient);
                console.log(`   ${hasClassicalMarkers ? '✅' : '⚠️'} Contains classical Chinese particles`);
            } else {
                console.log(`   ❌ No Ancient Chinese translation found`);
            }
            
            // Check Modern Chinese if requested
            if (testCase.outputLanguages.includes('modern') && result.translations?.modern) {
                console.log(`   ✅ Modern Chinese also generated`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
        }
        
        console.log('');
        await new Promise(resolve => setTimeout(resolve, 1500));
    }
    
    console.log('=' .repeat(50));
    console.log('✨ Ancient Chinese output testing complete!\n');
}

testAncientOutput().catch(console.error);