// Test model selection and Ancient Chinese output

async function testModelAndAncientOutput() {
    console.log('Testing model selection and Ancient Chinese output...\n');
    
    // Test 1: Basic translation with Opus model
    console.log('Test 1: English → Ancient Chinese (Opus model)');
    try {
        const response1 = await fetch('http://localhost:3001/api/segment-and-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'The wise ruler governs with virtue.',
                inputLanguage: 'english',
                outputLanguages: ['ancient'],
                model: 'opus'
            })
        });
        
        if (response1.ok) {
            const result = await response1.json();
            console.log('✅ Opus model works');
            if (result.translations?.ancient) {
                console.log('✅ Ancient Chinese output generated');
                const preview = result.translations.ancient.match(/<s1>(.*?)<\/s1>/);
                if (preview) {
                    console.log(`   Result: "${preview[1]}"`);
                }
            }
        } else {
            const error = await response1.json();
            console.log('❌ Error:', error.details || error.error);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
    
    console.log('\n---\n');
    
    // Test 2: Translation with Sonnet model
    console.log('Test 2: Modern Chinese → Ancient Chinese (Sonnet model)');
    try {
        const response2 = await fetch('http://localhost:3001/api/segment-and-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: '智慧的领导者用德行来治理。',
                inputLanguage: 'modern',
                outputLanguages: ['ancient'],
                model: 'sonnet'
            })
        });
        
        if (response2.ok) {
            const result = await response2.json();
            console.log('✅ Sonnet model works');
            if (result.translations?.ancient) {
                console.log('✅ Ancient Chinese output from Modern Chinese works');
                const preview = result.translations.ancient.match(/<s1>(.*?)<\/s1>/);
                if (preview) {
                    console.log(`   Result: "${preview[1]}"`);
                }
            }
        } else {
            const error = await response2.json();
            console.log('❌ Error:', error.details || error.error);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
    
    console.log('\n---\n');
    
    // Test 3: Multiple outputs including Ancient
    console.log('Test 3: English → Ancient + Modern Chinese');
    try {
        const response3 = await fetch('http://localhost:3001/api/segment-and-translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                text: 'Good governance requires wisdom.',
                inputLanguage: 'english',
                outputLanguages: ['ancient', 'modern'],
                model: 'opus'
            })
        });
        
        if (response3.ok) {
            const result = await response3.json();
            console.log('✅ Multiple output languages work');
            if (result.translations?.ancient && result.translations?.modern) {
                console.log('✅ Both Ancient and Modern Chinese generated');
                
                const ancientPreview = result.translations.ancient.match(/<s1>(.*?)<\/s1>/);
                const modernPreview = result.translations.modern.match(/<s1>(.*?)<\/s1>/);
                
                if (ancientPreview) {
                    console.log(`   Ancient: "${ancientPreview[1]}"`);
                }
                if (modernPreview) {
                    console.log(`   Modern: "${modernPreview[1]}"`);
                }
            }
        } else {
            const error = await response3.json();
            console.log('❌ Error:', error.details || error.error);
        }
    } catch (err) {
        console.log('❌ Request failed:', err.message);
    }
    
    console.log('\n✨ Testing complete!');
}

testModelAndAncientOutput().catch(console.error);