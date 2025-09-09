import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const API_URL = 'http://localhost:3001/api/segment-and-translate';

async function testLineBreaks() {
    console.log('Testing line break preservation in translations...\n');
    
    try {
        // Read Shakespeare text which has line breaks
        const shakespeareText = await fs.readFile(
            join(__dirname, '..', 'src', 'sample_text', 'sample_text_english.txt'),
            'utf-8'
        );
        
        console.log('=== ORIGINAL TEXT STRUCTURE ===');
        const lines = shakespeareText.split('\n');
        console.log(`Total lines in original: ${lines.length}`);
        console.log('\nFirst 5 lines:');
        lines.slice(0, 5).forEach((line, i) => {
            console.log(`  Line ${i+1}: "${line}"`);
        });
        
        // Test translation
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: shakespeareText,
                inputLanguage: 'english',
                outputLanguages: ['modern'],
                model: 'sonnet'
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Parse sentences and check for line breaks
        const sentenceRegex = /<s(\d+)>(.*?)<\/s\1>/gs;
        
        console.log('\n=== LINE BREAKS IN PARSED SENTENCES ===');
        
        let match;
        let sentencesWithLineBreaks = 0;
        let totalSentences = 0;
        
        while ((match = sentenceRegex.exec(result.original.text)) !== null) {
            totalSentences++;
            const sentenceText = match[2];
            const lineBreaksInSentence = (sentenceText.match(/\n/g) || []).length;
            
            if (lineBreaksInSentence > 0) {
                sentencesWithLineBreaks++;
                console.log(`\nSentence ${match[1]} has ${lineBreaksInSentence} line break(s):`);
                
                // Show the sentence with visible line breaks
                const preview = sentenceText.substring(0, 100).replace(/\n/g, '\\n');
                console.log(`  Preview: "${preview}${sentenceText.length > 100 ? '...' : ''}"`);
                
                // Show how it would split into lines
                const sentenceLines = sentenceText.split('\n');
                console.log(`  Splits into ${sentenceLines.length} lines:`);
                sentenceLines.forEach((line, i) => {
                    console.log(`    ${i+1}: "${line.substring(0, 50)}${line.length > 50 ? '...' : ''}"`);
                });
            }
        }
        
        console.log('\n=== SUMMARY ===');
        console.log(`Total sentences: ${totalSentences}`);
        console.log(`Sentences with line breaks: ${sentencesWithLineBreaks}`);
        console.log(`Sentences without line breaks: ${totalSentences - sentencesWithLineBreaks}`);
        
        // Check specific expected multi-line sentence
        const expectedMultiLine = "For in that sleep of death what dreams may come,\nWhen we have shuffled off this mortal coil,\nMust give us pause";
        const hasExpectedStructure = result.original.text.includes(expectedMultiLine);
        
        console.log('\n=== VERIFICATION ===');
        console.log(`Expected multi-line structure preserved: ${hasExpectedStructure ? '✅ YES' : '❌ NO'}`);
        
        if (sentencesWithLineBreaks > 0 && hasExpectedStructure) {
            console.log('\n✅ SUCCESS: Line breaks are preserved in the translation response!');
            console.log('   The white-space: pre-wrap CSS should now display them correctly.');
        } else {
            console.log('\n⚠️  WARNING: Line breaks may not be preserved correctly');
        }
        
    } catch (error) {
        console.error('Test failed:', error.message);
        process.exit(1);
    }
}

// Run the test
testLineBreaks();