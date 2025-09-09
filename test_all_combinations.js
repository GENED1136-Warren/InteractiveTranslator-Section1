import fs from 'fs/promises';

// Test texts for different input languages
const testTexts = {
    ancient: '為國以義，以名，以權。中國不治夷狄，義也。',
    modern: '治理国家要依靠道义、名分和权变。这是中国的传统智慧。',
    english: 'To govern a state requires righteousness, reputation, and adaptability. This is the wisdom of governance.'
};

// All possible language combinations
const testCases = [
    // Ancient Chinese as input
    { input: 'ancient', outputs: ['modern', 'english'], description: 'Ancient → Modern + English' },
    { input: 'ancient', outputs: ['modern'], description: 'Ancient → Modern only' },
    { input: 'ancient', outputs: ['english'], description: 'Ancient → English only' },
    
    // Modern Chinese as input
    { input: 'modern', outputs: ['ancient', 'english'], description: 'Modern → Ancient + English' },
    { input: 'modern', outputs: ['ancient'], description: 'Modern → Ancient only' },
    { input: 'modern', outputs: ['english'], description: 'Modern → English only' },
    
    // English as input
    { input: 'english', outputs: ['ancient', 'modern'], description: 'English → Ancient + Modern' },
    { input: 'english', outputs: ['ancient'], description: 'English → Ancient only' },
    { input: 'english', outputs: ['modern'], description: 'English → Modern only' },
];

async function testTranslationCombination(testCase) {
    const { input, outputs, description } = testCase;
    const text = testTexts[input];
    
    console.log(`\n📝 Testing: ${description}`);
    console.log(`   Input text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
    
    try {
        const response = await fetch('http://localhost:3001/api/segment-and-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text,
                inputLanguage: input,
                outputLanguages: outputs
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Check if we got the expected structure
        console.log(`   ✅ Response received`);
        
        // Verify input was parsed
        if (result.original && result.original.text) {
            const hasMarkers = result.original.text.includes('<s1>');
            console.log(`   ${hasMarkers ? '✅' : '❌'} Input has XML markers`);
        } else {
            console.log(`   ❌ No input text found`);
        }
        
        // Verify each output language
        for (const outputLang of outputs) {
            if (result.translations && result.translations[outputLang]) {
                const hasMarkers = result.translations[outputLang].includes('<s1>');
                console.log(`   ${hasMarkers ? '✅' : '❌'} ${outputLang} translation has XML markers`);
            } else {
                console.log(`   ❌ ${outputLang} translation missing`);
            }
        }
        
        return { success: true, testCase, result };
        
    } catch (error) {
        console.log(`   ❌ Test failed: ${error.message}`);
        return { success: false, testCase, error: error.message };
    }
}

async function runAllTests() {
    console.log('🚀 Starting comprehensive translation tests...');
    console.log('================================================\n');
    
    const results = [];
    let successCount = 0;
    let failCount = 0;
    
    for (const testCase of testCases) {
        const result = await testTranslationCombination(testCase);
        results.push(result);
        
        if (result.success) {
            successCount++;
        } else {
            failCount++;
        }
        
        // Add delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\n================================================');
    console.log('📊 Test Summary:');
    console.log(`   Total tests: ${testCases.length}`);
    console.log(`   ✅ Passed: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   Success rate: ${((successCount / testCases.length) * 100).toFixed(1)}%`);
    
    if (failCount > 0) {
        console.log('\n❌ Failed tests:');
        results.filter(r => !r.success).forEach(r => {
            console.log(`   - ${r.testCase.description}: ${r.error}`);
        });
    }
    
    console.log('\n✨ Testing complete!');
}

// Run the tests
runAllTests().catch(console.error);