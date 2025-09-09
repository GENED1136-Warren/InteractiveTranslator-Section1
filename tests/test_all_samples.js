import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:3001/api/segment-and-translate';

async function testSampleText(filename, inputLanguage, outputLanguages, testName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testName}`);
    console.log('='.repeat(60));
    
    try {
        // Read the sample text
        const text = await fs.readFile(
            join(__dirname, '..', 'src', 'sample_text', filename),
            'utf-8'
        );
        
        console.log(`Input text: ${text.split('\n').length} lines, ${text.length} characters`);
        
        // Perform translation
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: text,
                inputLanguage: inputLanguage,
                outputLanguages: outputLanguages,
                model: 'sonnet'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Parse sentences and check for line breaks
        const sentenceRegex = /<s(\d+)>(.*?)<\/s\1>/gs;
        
        let match;
        let totalSentences = 0;
        let sentencesWithLineBreaks = 0;
        let totalLineBreaks = 0;
        
        while ((match = sentenceRegex.exec(result.original.text)) !== null) {
            totalSentences++;
            const lineBreaksInSentence = (match[2].match(/\n/g) || []).length;
            if (lineBreaksInSentence > 0) {
                sentencesWithLineBreaks++;
                totalLineBreaks += lineBreaksInSentence;
            }
        }
        
        console.log(`\nResults:`);
        console.log(`  Total sentences: ${totalSentences}`);
        console.log(`  Sentences with line breaks: ${sentencesWithLineBreaks}`);
        console.log(`  Total line breaks preserved: ${totalLineBreaks}`);
        
        // Check translations
        let allTranslationsValid = true;
        for (const lang of outputLanguages) {
            const translationSentences = (result.translations[lang].match(/<s\d+>/g) || []).length;
            const hasTranslation = translationSentences > 0;
            console.log(`  ${lang} translation: ${hasTranslation ? `✅ ${translationSentences} sentences` : '❌ Failed'}`);
            if (!hasTranslation) allTranslationsValid = false;
        }
        
        // Overall status
        const success = totalSentences > 0 && allTranslationsValid;
        console.log(`\nStatus: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        return success;
        
    } catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log('Testing all sample texts with line break preservation...');
    console.log('Server should be running on http://localhost:3001');
    
    const tests = [
        {
            file: 'sample_text_english.txt',
            input: 'english',
            outputs: ['ancient', 'modern'],
            name: 'Shakespeare (English → Ancient & Modern)'
        },
        {
            file: 'sample_text_modern.txt',
            input: 'modern',
            outputs: ['ancient', 'english'],
            name: 'Haizi Poem (Modern → Ancient & English)'
        },
        {
            file: 'sample_text_ancient.txt',
            input: 'ancient',
            outputs: ['modern', 'english'],
            name: 'Classical Text (Ancient → Modern & English)'
        }
    ];
    
    const results = [];
    for (const test of tests) {
        const success = await testSampleText(
            test.file,
            test.input,
            test.outputs,
            test.name
        );
        results.push({ name: test.name, success });
        
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('FINAL SUMMARY');
    console.log('='.repeat(60));
    
    const passed = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    results.forEach(r => {
        console.log(`${r.success ? '✅' : '❌'} ${r.name}`);
    });
    
    console.log('\n' + '-'.repeat(60));
    console.log(`Total: ${results.length} tests`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
    
    if (failed === 0) {
        console.log('\n🎉 All sample texts work perfectly with line breaks preserved!');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
}

// Run all tests
runAllTests().catch(console.error);