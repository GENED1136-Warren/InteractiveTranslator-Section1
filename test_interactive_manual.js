import puppeteer from 'puppeteer';

const testResults = {
    passed: [],
    failed: [],
    errors: []
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString().slice(11, 19);
    const colors = {
        info: '\x1b[36m',
        success: '\x1b[32m',
        error: '\x1b[31m',
        warning: '\x1b[33m',
        reset: '\x1b[0m'
    };
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
}

async function testFeature(name, testFunc) {
    log(`Testing: ${name}`, 'info');
    try {
        await testFunc();
        testResults.passed.push(name);
        log(`✓ ${name}`, 'success');
        return true;
    } catch (error) {
        testResults.failed.push({ name, error: error.message });
        log(`✗ ${name}: ${error.message}`, 'error');
        return false;
    }
}

async function runInteractiveTests() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: true,
        args: ['--window-size=1400,900']
    });
    
    const page = await browser.newPage();
    
    // Collect console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
            log(`Browser console error: ${msg.text()}`, 'error');
        }
    });

    page.on('pageerror', error => {
        consoleErrors.push(error.message);
        log(`Page error: ${error.message}`, 'error');
    });

    try {
        log('=== INTERACTIVE TRANSLATION SYSTEM TEST ===', 'info');
        
        // Test 1: Page loads
        await testFeature('1. Page loads successfully', async () => {
            await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
            const title = await page.title();
            if (!title.includes('Interactive Translation')) {
                throw new Error(`Page title incorrect: ${title}`);
            }
        });

        // Test 2: Load sample text and translate
        await testFeature('2. Load sample text and translate (Ancient to Modern + English)', async () => {
            // Click load sample button
            await page.click('#load-sample-btn');
            await new Promise(r => setTimeout(r, 500));
            
            // Check text was loaded
            const inputText = await page.$eval('#input-text', el => el.value);
            if (!inputText) {
                throw new Error('Sample text not loaded');
            }
            log(`Sample text loaded: ${inputText.substring(0, 50)}...`, 'info');
            
            // Select Ancient Chinese as input
            await page.click('input[name="input-lang"][value="ancient"]');
            
            // Select Modern and English as outputs
            const modernCheckbox = await page.$('input[name="output-lang"][value="modern"]');
            const englishCheckbox = await page.$('input[name="output-lang"][value="english"]');
            
            // Check if already selected, if not, click them
            const modernChecked = await page.$eval('input[name="output-lang"][value="modern"]', el => el.checked);
            const englishChecked = await page.$eval('input[name="output-lang"][value="english"]', el => el.checked);
            
            if (!modernChecked) await modernCheckbox.click();
            if (!englishChecked) await englishCheckbox.click();
            
            // Click translate
            await page.click('#translate-btn');
            
            // Wait for translation panels
            await page.waitForSelector('#translation-panels', { visible: true, timeout: 20000 });
            
            const panels = await page.$$('.text-panel');
            log(`Translation panels created: ${panels.length}`, 'info');
            
            if (panels.length < 2) {
                throw new Error(`Expected at least 2 panels, got ${panels.length}`);
            }
        });

        // Test 3: Click sentences to select
        await testFeature('3. Select sentences by clicking', async () => {
            const sentences = await page.$$('.sentence');
            log(`Found ${sentences.length} sentences`, 'info');
            
            if (sentences.length === 0) {
                throw new Error('No sentences found');
            }
            
            // Click first sentence
            await sentences[0].click();
            await new Promise(r => setTimeout(r, 500));
            
            // Verify highlighted
            const highlighted = await page.$('.sentence.highlighted');
            if (!highlighted) {
                throw new Error('Sentence not highlighted');
            }
            
            // Verify selected text shows in chat
            const selectedText = await page.$eval('#selected-text', el => el.textContent);
            if (selectedText.includes('Click on a sentence')) {
                throw new Error('Selected text not showing in chat interface');
            }
            log(`Selected text: ${selectedText.substring(0, 50)}...`, 'info');
        });

        // Test 4: Multi-select with Cmd/Ctrl
        await testFeature('4. Multi-select sentences with Cmd/Ctrl+Click', async () => {
            const sentences = await page.$$('.sentence');
            
            if (sentences.length < 3) {
                log('Not enough sentences for multi-select test', 'warning');
                return;
            }
            
            // Clear selection first
            await sentences[0].click();
            
            // Multi-select
            await page.keyboard.down('Meta'); // For Mac; use 'Control' for Windows/Linux
            await sentences[1].click();
            await sentences[2].click();
            await page.keyboard.up('Meta');
            
            await new Promise(r => setTimeout(r, 500));
            
            const highlightedCount = await page.$$eval('.sentence.highlighted', els => els.length);
            log(`Highlighted sentences: ${highlightedCount}`, 'info');
            
            if (highlightedCount < 2) {
                throw new Error(`Multi-select failed: only ${highlightedCount} sentences highlighted`);
            }
        });

        // Test 5: Context language selector
        await testFeature('5. Context language selector', async () => {
            const selector = await page.$('#context-language');
            if (!selector) {
                throw new Error('Context language selector not found');
            }
            
            const options = await page.$$eval('#context-language option', opts => 
                opts.map(opt => ({ value: opt.value, text: opt.textContent }))
            );
            
            log(`Context language options: ${JSON.stringify(options)}`, 'info');
            
            if (options.length > 1) {
                // Change context language
                await page.select('#context-language', options[1].value);
                await new Promise(r => setTimeout(r, 500));
                
                const newSelectedText = await page.$eval('#selected-text', el => el.textContent);
                log(`Context changed to ${options[1].text}: ${newSelectedText.substring(0, 50)}...`, 'info');
            }
        });

        // Test 6: Send a chat message
        await testFeature('6. Send chat message and get AI response', async () => {
            // Check query section is visible
            const querySection = await page.$('#query-section');
            if (!querySection) {
                throw new Error('Query section not found');
            }
            
            // Make it visible if not already
            await page.evaluate(() => {
                document.getElementById('query-section').style.display = 'block';
            });
            
            const question = 'What is the meaning of this text?';
            await page.type('#query-input', question);
            await page.click('#send-btn');
            
            log('Waiting for AI response...', 'info');
            
            // Wait for assistant response
            await page.waitForSelector('.message-assistant', { timeout: 30000 });
            
            // Verify messages appear
            const userMsg = await page.$('.message-user');
            const assistantMsg = await page.$('.message-assistant');
            
            if (!userMsg || !assistantMsg) {
                throw new Error('Chat messages not displayed properly');
            }
            
            const responseText = await page.$eval('.message-assistant .message-bubble', el => el.textContent);
            log(`AI Response received: ${responseText.substring(0, 100)}...`, 'success');
        });

        // Test 7: Clear chat
        await testFeature('7. Clear chat functionality', async () => {
            await page.click('#clear-chat-btn');
            await new Promise(r => setTimeout(r, 500));
            
            const messages = await page.$$('.chat-message');
            if (messages.length > 0) {
                throw new Error(`Chat not cleared: ${messages.length} messages remain`);
            }
            
            // Check if placeholder text is back
            const chatContent = await page.$eval('#chat-messages', el => el.textContent);
            if (!chatContent.includes('Select text and start a conversation')) {
                throw new Error('Chat placeholder not restored');
            }
        });

        // Test 8: Clear all and try new translation
        await testFeature('8. Clear all and new translation', async () => {
            // Click main clear button
            await page.click('#clear-btn');
            await new Promise(r => setTimeout(r, 1000));
            
            // Input new text
            await page.type('#input-text', '春天来了，花开了。');
            
            // Select Modern Chinese to Ancient + English
            await page.click('input[name="input-lang"][value="modern"]');
            await page.click('input[name="output-lang"][value="ancient"]');
            await page.click('input[name="output-lang"][value="english"]');
            
            // Translate
            await page.click('#translate-btn');
            
            // Wait for translation
            await page.waitForSelector('.text-panel', { timeout: 20000 });
            
            const newPanels = await page.$$('.text-panel');
            if (newPanels.length === 0) {
                throw new Error('New translation failed - no panels');
            }
            
            log(`New translation successful: ${newPanels.length} panels`, 'success');
        });

        // Test 9: Check model selector
        await testFeature('9. Model selector', async () => {
            const modelSelector = await page.$('#model-selector');
            if (!modelSelector) {
                throw new Error('Model selector not found');
            }
            
            const models = await page.$$eval('#model-selector option', opts => 
                opts.map(opt => opt.value)
            );
            
            log(`Available models: ${models.join(', ')}`, 'info');
            
            if (models.includes('sonnet')) {
                await page.select('#model-selector', 'sonnet');
                log('Switched to Sonnet model', 'success');
            }
        });

        // Test 10: Response controls
        await testFeature('10. Response controls (markdown toggle, copy)', async () => {
            // First, generate a response to test controls
            const sentences = await page.$$('.sentence');
            if (sentences.length > 0) {
                await sentences[0].click();
                await page.evaluate(() => {
                    document.getElementById('query-section').style.display = 'block';
                });
                
                await page.type('#query-input', 'Explain this briefly');
                await page.click('#send-btn');
                
                await page.waitForSelector('.message-assistant', { timeout: 30000 });
                
                // Check if response controls are visible
                const controlsVisible = await page.$eval('#response-controls', 
                    el => window.getComputedStyle(el).display !== 'none'
                );
                
                if (!controlsVisible) {
                    throw new Error('Response controls not visible after message');
                }
                
                // Test markdown toggle
                const toggleBtn = await page.$('#markdown-toggle');
                if (toggleBtn) {
                    await toggleBtn.click();
                    log('Markdown toggle clicked', 'success');
                }
                
                // Test copy button
                const copyBtn = await page.$('#copy-btn');
                if (copyBtn) {
                    await copyBtn.click();
                    await new Promise(r => setTimeout(r, 500));
                    
                    const btnText = await page.$eval('#copy-btn', el => el.textContent);
                    if (btnText.includes('Copied')) {
                        log('Copy functionality working', 'success');
                    }
                }
            }
        });

        // Final check for console errors
        if (consoleErrors.length > 0) {
            log(`⚠️ Total console errors: ${consoleErrors.length}`, 'warning');
            consoleErrors.forEach(err => log(`  - ${err}`, 'warning'));
        }

    } finally {
        // Summary
        console.log('\n' + '='.repeat(60));
        log('TEST SUMMARY', 'info');
        console.log('='.repeat(60));
        
        log(`✓ Passed: ${testResults.passed.length}`, 'success');
        testResults.passed.forEach(test => {
            console.log(`  ✓ ${test}`);
        });
        
        if (testResults.failed.length > 0) {
            log(`✗ Failed: ${testResults.failed.length}`, 'error');
            testResults.failed.forEach(({ name, error }) => {
                console.log(`  ✗ ${name}: ${error}`);
            });
        }
        
        console.log('='.repeat(60));
        
        log('Browser will remain open for manual inspection...', 'info');
        log('Close the browser window when done.', 'info');
        
        // Wait for user to close browser
        await browser.waitForTarget(() => false).catch(() => {});
    }
}

// Run tests
runInteractiveTests().catch(console.error);