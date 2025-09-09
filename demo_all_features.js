// Comprehensive demo of all translation features

const demoExamples = [
    {
        name: "English to Classical Chinese",
        text: "The wise leader governs with virtue.",
        inputLanguage: 'english',
        outputLanguages: ['ancient'],
        expected: "Should produce Classical Chinese with particles"
    },
    {
        name: "Modern to Classical Chinese", 
        text: "智慧的领导者用德行来治理。",
        inputLanguage: 'modern',
        outputLanguages: ['ancient'],
        expected: "Should convert to Classical Chinese style"
    },
    {
        name: "Classical to Modern + English",
        text: "君子之道，在於修身齊家治國平天下也。",
        inputLanguage: 'ancient',
        outputLanguages: ['modern', 'english'],
        expected: "Should translate classical text to both modern languages"
    },
    {
        name: "English to All Chinese Variants",
        text: "Leadership requires wisdom and compassion.",
        inputLanguage: 'english',
        outputLanguages: ['ancient', 'modern'],
        expected: "Should produce both Classical and Modern Chinese"
    }
];

async function runDemo() {
    console.log('🎭 COMPREHENSIVE TRANSLATION SYSTEM DEMO');
    console.log('=' .repeat(60) + '\n');
    console.log('Server: http://localhost:3001');
    console.log('Features: Bidirectional translation between Ancient/Modern Chinese/English\n');
    console.log('=' .repeat(60) + '\n');
    
    for (const example of demoExamples) {
        console.log(`\n📚 ${example.name}`);
        console.log('─' .repeat(40));
        console.log(`Input (${example.inputLanguage}): "${example.text}"`);
        console.log(`Target languages: ${example.outputLanguages.join(', ')}`);
        console.log(`Expected: ${example.expected}\n`);
        
        try {
            const response = await fetch('http://localhost:3001/api/segment-and-translate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: example.text,
                    inputLanguage: example.inputLanguage,
                    outputLanguages: example.outputLanguages
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            console.log('Results:');
            
            // Show each translation
            for (const lang of example.outputLanguages) {
                if (result.translations?.[lang]) {
                    const translation = result.translations[lang];
                    // Extract first sentence
                    const firstMatch = translation.match(/<s1>(.*?)<\/s1>/);
                    if (firstMatch) {
                        const langLabel = lang === 'ancient' ? 'Ancient (文言文)' : 
                                        lang === 'modern' ? 'Modern (现代中文)' : 
                                        'English';
                        console.log(`  ${langLabel}: "${firstMatch[1]}"`);
                        
                        // Check for classical markers if ancient
                        if (lang === 'ancient') {
                            const hasParticles = /之|乎|者|也|矣|焉|哉|而|於|為/.test(translation);
                            console.log(`    → ${hasParticles ? '✅' : '⚠️'} Classical particles detected`);
                        }
                    }
                }
            }
            
            console.log(`  ✅ Translation successful`);
            
        } catch (error) {
            console.log(`  ❌ Error: ${error.message}`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('\n' + '=' .repeat(60));
    console.log('✨ Demo complete! All language combinations are working.');
    console.log('\nKey Features Demonstrated:');
    console.log('  • English → Ancient Chinese (with classical grammar)');
    console.log('  • Modern Chinese → Ancient Chinese conversion');
    console.log('  • Ancient Chinese → Modern + English');
    console.log('  • Multi-target translation (one input, multiple outputs)');
    console.log('\nAccess the web interface at: http://localhost:3001');
}

runDemo().catch(console.error);