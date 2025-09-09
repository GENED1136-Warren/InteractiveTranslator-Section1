import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:3001/api/segment-and-translate';

async function testTranslation(inputFile, inputLanguage, outputLanguages, testName) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Testing: ${testName}`);
    console.log(`Input: ${inputLanguage} → Output: ${outputLanguages.join(', ')}`);
    console.log('='.repeat(60));
    
    try {
        // Read input text
        const inputText = await fs.readFile(
            join(__dirname, '..', 'src', 'sample_text', inputFile),
            'utf-8'
        );
        
        console.log(`Input text length: ${inputText.length} characters`);
        console.log(`Input text lines: ${inputText.split('\n').length}`);
        
        // Perform translation
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: inputText,
                inputLanguage: inputLanguage,
                outputLanguages: outputLanguages,
                model: 'sonnet'
            })
        });
        
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${error}`);
        }
        
        const result = await response.json();
        
        // Parse sentences
        const sentenceRegex = /<s(\d+)>(.*?)<\/s\1>/gs;
        
        // Count sentences in original
        const originalSentences = [];
        let match;
        while ((match = sentenceRegex.exec(result.original.text)) !== null) {
            originalSentences.push({
                id: match[1],
                text: match[2]
            });
        }
        
        console.log(`\n✓ Original parsed: ${originalSentences.length} sentences`);
        
        // Count sentences in each translation
        const translationCounts = {};
        for (const lang of outputLanguages) {
            const sentences = [];
            sentenceRegex.lastIndex = 0;
            while ((match = sentenceRegex.exec(result.translations[lang])) !== null) {
                sentences.push({
                    id: match[1],
                    text: match[2]
                });
            }
            translationCounts[lang] = sentences.length;
            console.log(`✓ ${lang.charAt(0).toUpperCase() + lang.slice(1)} parsed: ${sentences.length} sentences`);
        }
        
        // Verify all counts match
        const allMatch = outputLanguages.every(lang => 
            translationCounts[lang] === originalSentences.length
        );
        
        if (allMatch) {
            console.log(`\n✅ SUCCESS: All sentence counts match (${originalSentences.length} sentences)`);
        } else {
            console.log(`\n⚠️  WARNING: Sentence count mismatch!`);
        }
        
        // Show first and last sentence to verify content
        console.log('\nFirst sentence preview:');
        console.log(`  ${inputLanguage}: "${originalSentences[0].text.substring(0, 50)}..."`);
        
        console.log('\nLast sentence preview:');
        const lastIdx = originalSentences.length - 1;
        console.log(`  ${inputLanguage}: "${originalSentences[lastIdx].text.substring(0, 50)}..."`);
        
        return allMatch;
        
    } catch (error) {
        console.error(`\n❌ Test failed: ${error.message}`);
        return false;
    }
}

async function runAllTests() {
    console.log('Starting comprehensive translation tests...');
    console.log('Server should be running on http://localhost:3001');
    
    const tests = [
        // Shakespeare tests
        {
            file: 'sample_text_english.txt',
            input: 'english',
            outputs: ['ancient', 'modern'],
            name: 'Shakespeare → Ancient & Modern Chinese'
        },
        {
            file: 'sample_text_english.txt',
            input: 'english',
            outputs: ['ancient'],
            name: 'Shakespeare → Ancient Chinese only'
        },
        {
            file: 'sample_text_english.txt',
            input: 'english',
            outputs: ['modern'],
            name: 'Shakespeare → Modern Chinese only'
        },
        
        // Haizi poem tests
        {
            file: 'sample_text_modern.txt',
            input: 'modern',
            outputs: ['ancient', 'english'],
            name: 'Haizi Poem → Ancient Chinese & English'
        },
        {
            file: 'sample_text_modern.txt',
            input: 'modern',
            outputs: ['english'],
            name: 'Haizi Poem → English only'
        },
        {
            file: 'sample_text_modern.txt',
            input: 'modern',
            outputs: ['ancient'],
            name: 'Haizi Poem → Ancient Chinese only'
        },
        
        // Ancient Chinese tests
        {
            file: 'sample_text_ancient.txt',
            input: 'ancient',
            outputs: ['modern', 'english'],
            name: 'Ancient Chinese → Modern & English'
        },
        {
            file: 'sample_text_ancient.txt',
            input: 'ancient',
            outputs: ['modern'],
            name: 'Ancient Chinese → Modern only'
        },
        {
            file: 'sample_text_ancient.txt',
            input: 'ancient',
            outputs: ['english'],
            name: 'Ancient Chinese → English only'
        }
    ];
    
    const results = [];
    for (const test of tests) {
        const success = await testTranslation(
            test.file,
            test.input,
            test.outputs,
            test.name
        );
        results.push({ name: test.name, success });
        
        // Small delay between tests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('TEST SUMMARY');
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
        console.log('\n🎉 All tests passed! The translation system is working perfectly.');
    } else {
        console.log('\n⚠️  Some tests failed. Please check the errors above.');
    }
}

// Run all tests
runAllTests().catch(console.error);