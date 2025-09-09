import puppeteer from 'puppeteer';

const delay = ms => new Promise(r => setTimeout(r, ms));

async function testBasicFeatures() {
    console.log('Starting basic feature test...\n');
    
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--window-size=1400,900']
    });
    
    const page = await browser.newPage();
    
    // Capture console messages
    const consoleMessages = [];
    page.on('console', msg => {
        const type = msg.type();
        const text = msg.text();
        consoleMessages.push({ type, text });
        if (type === 'error') {
            console.log(`❌ Console Error: ${text}`);
        }
    });

    try {
        // 1. Load the page
        console.log('1. Loading page...');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        console.log('✅ Page loaded\n');

        // 2. Test with a simple Modern Chinese text
        console.log('2. Testing translation: Modern Chinese → Ancient + English');
        
        // Clear input and enter new text
        await page.evaluate(() => {
            document.getElementById('input-text').value = '春天来了，花儿开了。';
        });
        
        // Select input language
        await page.click('input[name="input-lang"][value="modern"]');
        
        // Clear all output checkboxes first
        await page.evaluate(() => {
            document.querySelectorAll('input[name="output-lang"]').forEach(cb => cb.checked = false);
        });
        
        // Select output languages
        await page.click('input[name="output-lang"][value="ancient"]');
        await page.click('input[name="output-lang"][value="english"]');
        
        // Click translate
        console.log('   Clicking translate button...');
        await page.click('#translate-btn');
        
        // Wait for translation with timeout
        try {
            await page.waitForSelector('#translation-panels', { 
                visible: true, 
                timeout: 30000 
            });
            console.log('✅ Translation panels appeared\n');
        } catch (e) {
            console.log('❌ Translation timeout - checking server logs...');
            const status = await page.$eval('#translation-status', el => el.textContent);
            console.log(`   Status: ${status}`);
            throw e;
        }

        // 3. Check if sentences are clickable
        console.log('3. Testing sentence selection...');
        const sentences = await page.$$('.sentence');
        console.log(`   Found ${sentences.length} sentences`);
        
        if (sentences.length > 0) {
            await sentences[0].click();
            await delay(500);
            
            const highlighted = await page.$('.sentence.highlighted');
            if (highlighted) {
                console.log('✅ Sentence selection works\n');
            } else {
                console.log('❌ Sentence not highlighted\n');
            }
            
            // Check selected text display
            const selectedText = await page.$eval('#selected-text', el => el.textContent);
            if (!selectedText.includes('Click on a sentence')) {
                console.log(`   Selected text: "${selectedText.substring(0, 50)}..."`);
            }
        }

        // 4. Test context language selector
        console.log('4. Testing context language selector...');
        const contextSelector = await page.$('#context-language');
        if (contextSelector) {
            const options = await page.$$eval('#context-language option', opts => 
                opts.map(opt => ({ value: opt.value, text: opt.textContent }))
            );
            console.log(`   Available context languages: ${options.map(o => o.text).join(', ')}`);
            
            if (options.length > 1) {
                await page.select('#context-language', options[1].value);
                console.log(`✅ Context language selector works (switched to ${options[1].text})\n`);
            }
        } else {
            console.log('❌ Context language selector not found\n');
        }

        // 5. Check if chat interface is ready
        console.log('5. Checking chat interface...');
        const querySection = await page.$('#query-section');
        if (querySection) {
            // Make it visible
            await page.evaluate(() => {
                const section = document.getElementById('query-section');
                if (section) section.style.display = 'block';
            });
            
            const queryInput = await page.$('#query-input');
            const sendBtn = await page.$('#send-btn');
            
            if (queryInput && sendBtn) {
                console.log('✅ Chat interface is present\n');
                
                // Check if input is enabled (should be if text is selected)
                const isDisabled = await page.$eval('#query-input', el => el.disabled);
                if (!isDisabled) {
                    console.log('   Chat input is enabled (ready for questions)');
                } else {
                    console.log('   Chat input is disabled (select text first)');
                }
            }
        } else {
            console.log('❌ Query section not found\n');
        }

        // 6. Test Clear functionality
        console.log('6. Testing clear button...');
        const clearBtn = await page.$('#clear-btn');
        if (clearBtn) {
            await clearBtn.click();
            await delay(1000);
            
            const inputValue = await page.$eval('#input-text', el => el.value);
            const panelsVisible = await page.$eval('#translation-panels', 
                el => window.getComputedStyle(el).display !== 'none'
            );
            
            if (!inputValue && !panelsVisible) {
                console.log('✅ Clear button works\n');
            } else {
                console.log('⚠️ Clear button may not have fully cleared everything\n');
            }
        }

        // 7. Final test: Try another translation
        console.log('7. Testing second translation (after clear)...');
        await page.evaluate(() => {
            document.getElementById('input-text').value = '学而时习之';
        });
        
        await page.click('input[name="input-lang"][value="ancient"]');
        await page.evaluate(() => {
            document.querySelectorAll('input[name="output-lang"]').forEach(cb => cb.checked = false);
        });
        await page.click('input[name="output-lang"][value="modern"]');
        await page.click('input[name="output-lang"][value="english"]');
        
        await page.click('#translate-btn');
        
        try {
            await page.waitForSelector('.text-panel', { timeout: 30000 });
            console.log('✅ Second translation successful\n');
        } catch (e) {
            console.log('❌ Second translation failed\n');
        }

        // Summary
        console.log('\n' + '='.repeat(50));
        console.log('TEST SUMMARY');
        console.log('='.repeat(50));
        
        const errors = consoleMessages.filter(m => m.type === 'error');
        if (errors.length > 0) {
            console.log(`\n⚠️ Found ${errors.length} console errors:`);
            errors.forEach(e => console.log(`   - ${e.text}`));
        } else {
            console.log('\n✅ No console errors detected');
        }
        
        console.log('\nBrowser will remain open for manual testing.');
        console.log('Close the browser when done.\n');

    } catch (error) {
        console.error('\n❌ Test failed with error:', error.message);
        console.log('\nCheck server logs for more details:');
        console.log('  tail -f server.log\n');
    }

    // Keep browser open
    await browser.waitForTarget(() => false).catch(() => {});
}

testBasicFeatures().catch(console.error);