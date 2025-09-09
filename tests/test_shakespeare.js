import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:3001/api/segment-and-translate';

async function testShakespeareTranslation() {
    console.log('Testing Shakespeare translation...\n');
    
    try {
        // Read Shakespeare text
        const shakespeareText = await fs.readFile(
            join(__dirname, '..', 'src', 'sample_text', 'sample_text_english.txt'),
            'utf-8'
        );
        
        console.log('Original text length:', shakespeareText.length);
        console.log('Original text lines:', shakespeareText.split('\n').length);
        console.log('\n--- Original Text ---');
        console.log(shakespeareText);
        console.log('--- End Original ---\n');
        
        // Test translation to Ancient and Modern Chinese
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: shakespeareText,
                inputLanguage: 'english',
                outputLanguages: ['ancient', 'modern'],
                model: 'sonnet'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Parse and count sentences
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
        
        console.log('\n=== RESULTS ===');
        console.log('Original sentences found:', originalSentences.length);
        
        // Count sentences in Ancient translation
        const ancientSentences = [];
        sentenceRegex.lastIndex = 0; // Reset regex
        while ((match = sentenceRegex.exec(result.translations.ancient)) !== null) {
            ancientSentences.push({
                id: match[1],
                text: match[2]
            });
        }
        console.log('Ancient Chinese sentences found:', ancientSentences.length);
        
        // Count sentences in Modern translation
        const modernSentences = [];
        sentenceRegex.lastIndex = 0; // Reset regex
        while ((match = sentenceRegex.exec(result.translations.modern)) !== null) {
            modernSentences.push({
                id: match[1],
                text: match[2]
            });
        }
        console.log('Modern Chinese sentences found:', modernSentences.length);
        
        // Verify all sentences are present
        console.log('\n=== SENTENCE VERIFICATION ===');
        
        // Check if we have all expected lines
        const expectedLines = [
            "To be, or not to be",
            "Whether 'tis nobler",
            "The slings and arrows",
            "Or to take arms",
            "And by opposing",
            "To die—to sleep",
            "No more; and by a sleep",
            "The heart-ache",
            "That flesh is heir to",
            "Devoutly to be wish'd",
            "To die, to sleep",
            "To sleep, perchance to dream",
            "For in that sleep of death",
            "When we have shuffled",
            "Must give us pause",
            "That makes calamity"
        ];
        
        console.log('\nChecking for expected content in original sentences:');
        for (const expectedLine of expectedLines) {
            const found = originalSentences.some(s => 
                s.text.toLowerCase().includes(expectedLine.toLowerCase())
            );
            console.log(`  ${found ? '✓' : '✗'} "${expectedLine.substring(0, 30)}..."`);
        }
        
        // Show last few sentences to verify completeness
        console.log('\n=== LAST 3 SENTENCES ===');
        console.log('\nOriginal (last 3):');
        originalSentences.slice(-3).forEach(s => {
            console.log(`  <s${s.id}>${s.text.substring(0, 100)}${s.text.length > 100 ? '...' : ''}</s${s.id}>`);
        });
        
        console.log('\nAncient Chinese (last 3):');
        ancientSentences.slice(-3).forEach(s => {
            console.log(`  <s${s.id}>${s.text.substring(0, 100)}${s.text.length > 100 ? '...' : ''}</s${s.id}>`);
        });
        
        console.log('\nModern Chinese (last 3):');
        modernSentences.slice(-3).forEach(s => {
            console.log(`  <s${s.id}>${s.text.substring(0, 100)}${s.text.length > 100 ? '...' : ''}</s${s.id}>`);
        });
        
        // Check if translation appears complete
        const hasCalamityLine = originalSentences.some(s => 
            s.text.includes("calamity of so long life")
        );
        
        console.log('\n=== COMPLETENESS CHECK ===');
        console.log(`Translation includes final "calamity" line: ${hasCalamityLine ? '✓ YES' : '✗ NO'}`);
        console.log(`All sentence counts match: ${
            originalSentences.length === ancientSentences.length && 
            originalSentences.length === modernSentences.length ? '✓ YES' : '✗ NO'
        }`);
        
        if (hasCalamityLine && originalSentences.length === ancientSentences.length) {
            console.log('\n✅ SUCCESS: Shakespeare translation appears complete!');
        } else {
            console.log('\n⚠️  WARNING: Translation may be incomplete');
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testShakespeareTranslation();