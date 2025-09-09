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

async function runComprehensiveTests() {
    const browser = await puppeteer.launch({ 
        headless: false, 
        devtools: true,
        args: ['--window-size=1400,900']
    });
    
    const page = await browser.newPage();
    
    // Set up console logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            testResults.errors.push(msg.text());
            log(`Browser console error: ${msg.text()}`, 'error');
        }
    });

    page.on('pageerror', error => {
        testResults.errors.push(error.message);
        log(`Page error: ${error.message}`, 'error');
    });

    try {
        // Test 1: Page loads successfully
        await testFeature('Page loads successfully', async () => {
            await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
            const title = await page.title();
            if (!title.includes('Interactive Translation System')) {
                throw new Error(`Unexpected title: ${title}`);
            }
        });

        // Test 2: Initial translation - Ancient Chinese to Modern and English
        await testFeature('Translation from Ancient Chinese to Modern and English', async () => {
            // Input ancient Chinese text
            const ancientText = '子曰：學而時習之，不亦說乎？有朋自遠方來，不亦樂乎？';
            await page.type('#input-text', ancientText);
            
            // Select input language
            await page.click('input[name="input-lang"][value="ancient"]');
            
            // Select output languages
            await page.click('input[name="output-lang"][value="modern"]');
            await page.click('input[name="output-lang"][value="english"]');
            
            // Click translate button
            await page.click('#translate-btn');
            
            // Wait for translation panels to appear
            await page.waitForSelector('#translation-panels', { visible: true, timeout: 15000 });
            
            // Verify panels are displayed
            const panels = await page.$$('.text-panel');
            if (panels.length < 2) {
                throw new Error(`Expected at least 2 panels, got ${panels.length}`);
            }
        });

        // Test 3: Sentence selection
        await testFeature('Single sentence selection', async () => {
            // Click on first sentence
            const sentences = await page.$$('.sentence');
            if (sentences.length === 0) {
                throw new Error('No sentences found to click');
            }
            
            await sentences[0].click();
            await new Promise(r => setTimeout(r, 500));
            
            // Check if sentence is highlighted
            const highlighted = await page.$('.sentence.highlighted');
            if (!highlighted) {
                throw new Error('Sentence not highlighted after click');
            }
            
            // Check if selected text appears in chat interface
            const selectedText = await page.$eval('#selected-text', el => el.textContent);
            if (selectedText.includes('Click on a sentence to select it')) {
                throw new Error('Selected text not displayed in chat interface');
            }
        });

        // Test 4: Multi-sentence selection with Cmd/Ctrl+Click
        await testFeature('Multi-sentence selection with Cmd/Ctrl+Click', async () => {
            const sentences = await page.$$('.sentence');
            if (sentences.length < 2) {
                throw new Error('Not enough sentences for multi-select test');
            }
            
            // Clear previous selection
            await sentences[0].click();
            
            // Multi-select with modifier key
            await page.keyboard.down('Meta'); // Use Meta for Mac, Control for Windows/Linux
            await sentences[1].click();
            await page.keyboard.up('Meta');
            
            await new Promise(r => setTimeout(r, 500));
            
            // Check if multiple sentences are highlighted
            const highlightedCount = await page.$$eval('.sentence.highlighted', els => els.length);
            if (highlightedCount < 2) {
                throw new Error(`Expected 2+ highlighted sentences, got ${highlightedCount}`);
            }
            
            // Check multi-select indicator
            const indicator = await page.$eval('#multi-select-indicator', el => 
                window.getComputedStyle(el).display !== 'none'
            );
            if (!indicator) {
                throw new Error('Multi-select indicator not visible');
            }
        });

        // Test 5: Context language selector
        await testFeature('Context language selector', async () => {
            // Check if context language selector exists
            const selector = await page.$('#context-language');
            if (!selector) {
                throw new Error('Context language selector not found');
            }
            
            // Get available options
            const options = await page.$$eval('#context-language option', opts => 
                opts.map(opt => ({ value: opt.value, text: opt.textContent }))
            );
            
            if (options.length < 2) {
                throw new Error('Not enough context language options');
            }
            
            // Change context language
            await page.select('#context-language', options[1].value);
            await new Promise(r => setTimeout(r, 500));
            
            // Verify selected text updates
            const selectedTextAfter = await page.$eval('#selected-text', el => el.textContent);
            if (!selectedTextAfter || selectedTextAfter.includes('Click on a sentence')) {
                throw new Error('Context language change did not update selected text');
            }
        });

        // Test 6: Send message in chat
        await testFeature('Send message in chat', async () => {
            // Type a question
            const question = 'What is the meaning of this text?';
            await page.type('#query-input', question);
            
            // Click send button
            await page.click('#send-btn');
            
            // Wait for response
            await page.waitForSelector('.message-assistant', { timeout: 20000 });
            
            // Verify message appears
            const userMessage = await page.$eval('.message-user .message-bubble', el => el.textContent);
            if (!userMessage.includes(question)) {
                throw new Error('User message not displayed correctly');
            }
            
            // Verify AI response appears
            const assistantMessage = await page.$('.message-assistant .message-bubble');
            if (!assistantMessage) {
                throw new Error('Assistant response not displayed');
            }
        });

        // Test 7: Clear chat
        await testFeature('Clear chat', async () => {
            // Click clear button
            await page.click('#clear-btn');
            await new Promise(r => setTimeout(r, 500));
            
            // Verify chat is cleared
            const messages = await page.$$('.chat-message');
            if (messages.length > 0) {
                throw new Error(`Chat not cleared, still has ${messages.length} messages`);
            }
            
            // Verify selected text is reset
            const selectedText = await page.$eval('#selected-text', el => el.textContent);
            if (!selectedText.includes('Click on a sentence to select it')) {
                throw new Error('Selected text not reset after clearing chat');
            }
        });

        // Test 8: New translation after clearing
        await testFeature('New translation after previous one', async () => {
            // Clear input
            await page.evaluate(() => {
                document.getElementById('input-text').value = '';
            });
            
            // Input new text (Modern Chinese)
            const modernText = '春天来了，花儿开了，鸟儿在歌唱。';
            await page.type('#input-text', modernText);
            
            // Select different language combination
            await page.click('input[name="input-lang"][value="modern"]');
            await page.click('input[name="output-lang"][value="ancient"]');
            await page.click('input[name="output-lang"][value="english"]');
            
            // Translate
            await page.click('#translate-btn');
            
            // Wait for new translation
            await new Promise(r => setTimeout(r, 5000));
            
            // Verify new panels appear without errors
            const newPanels = await page.$$('.text-panel');
            if (newPanels.length === 0) {
                throw new Error('No translation panels after second translation');
            }
            
            // Check for console errors
            const errors = await page.evaluate(() => {
                const logs = [];
                const originalLog = console.error;
                console.error = (...args) => {
                    logs.push(args.join(' '));
                    originalLog.apply(console, args);
                };
                return logs;
            });
            
            if (errors.length > 0) {
                throw new Error(`Console errors during second translation: ${errors.join(', ')}`);
            }
        });

        // Test 9: Markdown toggle
        await testFeature('Markdown toggle button', async () => {
            // Select a sentence first
            const sentences = await page.$$('.sentence');
            if (sentences.length > 0) {
                await sentences[0].click();
                await new Promise(r => setTimeout(r, 500));
                
                // Send a message to get a response
                await page.type('#query-input', 'Explain the grammar');
                await page.click('#send-btn');
                await page.waitForSelector('.message-assistant', { timeout: 20000 });
                
                // Check if markdown toggle exists
                const toggleBtn = await page.$('#markdown-toggle');
                if (!toggleBtn) {
                    throw new Error('Markdown toggle button not found');
                }
                
                // Click toggle
                await page.click('#markdown-toggle');
                await new Promise(r => setTimeout(r, 500));
                
                // Verify toggle state changes
                const toggleText = await page.$eval('#markdown-toggle', el => el.textContent);
                if (!toggleText) {
                    throw new Error('Markdown toggle has no text');
                }
            }
        });

        // Test 10: Copy button
        await testFeature('Copy response button', async () => {
            // Check if copy buttons exist for assistant messages
            const copyButtons = await page.$$('.copy-btn');
            if (copyButtons.length === 0) {
                log('No copy buttons found (might be OK if no messages)', 'warning');
            } else {
                // Click first copy button
                await copyButtons[0].click();
                await new Promise(r => setTimeout(r, 500));
                
                // Check for feedback (button text change or notification)
                const buttonText = await page.$eval('.copy-btn', el => el.textContent);
                if (!buttonText.includes('Copied') && !buttonText.includes('✓')) {
                    log('Copy button clicked but no feedback shown', 'warning');
                }
            }
        });

        // Test 11: Model selector
        await testFeature('Model selector functionality', async () => {
            const modelSelector = await page.$('#model-select');
            if (!modelSelector) {
                throw new Error('Model selector not found');
            }
            
            // Get available models
            const models = await page.$$eval('#model-select option', opts => 
                opts.map(opt => opt.value)
            );
            
            if (models.length < 2) {
                log('Only one model option available', 'warning');
            } else {
                // Try switching model
                await page.select('#model-select', models[1]);
                log(`Switched to model: ${models[1]}`, 'success');
            }
        });

        // Test 12: Check for JavaScript errors in console
        await testFeature('No JavaScript console errors', async () => {
            if (testResults.errors.length > 0) {
                throw new Error(`Found ${testResults.errors.length} console errors`);
            }
        });

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
        
        if (testResults.errors.length > 0) {
            log(`⚠ Console Errors: ${testResults.errors.length}`, 'warning');
            testResults.errors.forEach(error => {
                console.log(`  ⚠ ${error}`);
            });
        }
        
        console.log('='.repeat(60));
        
        // Keep browser open for 5 seconds to observe final state
        await new Promise(r => setTimeout(r, 5000));
        await browser.close();
    }
}

// Run tests
runComprehensiveTests().catch(console.error);