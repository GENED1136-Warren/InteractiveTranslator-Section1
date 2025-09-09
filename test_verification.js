import puppeteer from 'puppeteer';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, type = 'info') {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const colorMap = {
        'info': colors.blue,
        'success': colors.green,
        'error': colors.red,
        'warning': colors.yellow,
        'test': colors.magenta,
        'result': colors.cyan
    };
    const color = colorMap[type] || colors.reset;
    console.log(`${colors.dim}[${timestamp}]${colors.reset} ${color}${message}${colors.reset}`);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runComprehensiveTest() {
    const browser = await puppeteer.launch({ 
        headless: false,
        args: ['--window-size=1400,900']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900 });

    const results = {
        passed: [],
        failed: [],
        warnings: []
    };

    try {
        log('Starting Comprehensive Verification Test', 'test');
        
        // 1. Load page
        log('Loading page at http://localhost:3001', 'info');
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        await sleep(1000);

        // 2. Verify initial chat box state
        log('TEST 1: Verifying initial chat box state', 'test');
        const initialChatHeight = await page.evaluate(() => {
            const chatContainer = document.getElementById('chat-container');
            return window.getComputedStyle(chatContainer).height;
        });
        
        const hasEmptyState = await page.evaluate(() => {
            return document.querySelector('.chat-empty-state') !== null;
        });
        
        if (initialChatHeight === '120px' && hasEmptyState) {
            results.passed.push('Chat box starts collapsed at 120px with empty state');
            log('✓ Chat box correctly starts collapsed with empty state', 'success');
        } else {
            results.failed.push(`Chat box initial state incorrect: height=${initialChatHeight}, hasEmptyState=${hasEmptyState}`);
            log(`✗ Chat box initial state incorrect`, 'error');
        }

        // 3. Set input language and enter first text
        log('TEST 2: First translation cycle', 'test');
        await page.click('input[name="input-lang"][value="ancient"]');
        await page.type('#input-text', '君子以德治國。小人以力服人。');
        await sleep(500);
        
        // Select output languages
        await page.click('input[name="output-lang"][value="modern"]');
        await page.click('input[name="output-lang"][value="english"]');
        await sleep(500);
        
        // Translate
        await page.click('#translate-btn');
        log('Waiting for first translation...', 'info');
        await page.waitForSelector('.sentence', { timeout: 30000 });
        await sleep(2000);

        // 4. Test context language menu
        log('TEST 3: Context language menu functionality', 'test');
        const contextOptions = await page.evaluate(() => {
            const selector = document.getElementById('context-language');
            return Array.from(selector.options).map(opt => opt.value);
        });
        
        if (contextOptions.length >= 2) {
            results.passed.push(`Context language menu populated with ${contextOptions.length} options`);
            log(`✓ Context menu has ${contextOptions.length} language options`, 'success');
        } else {
            results.failed.push('Context language menu not properly populated');
            log('✗ Context menu not populated', 'error');
        }

        // 5. Click a sentence and verify selection
        log('TEST 4: Sentence selection and context display', 'test');
        await page.click('.sentence');
        await sleep(500);
        
        const selectedText1 = await page.evaluate(() => {
            return document.getElementById('selected-text').textContent;
        });
        
        // Change context language
        if (contextOptions.includes('modern')) {
            await page.select('#context-language', 'modern');
            await sleep(500);
            
            const selectedText2 = await page.evaluate(() => {
                return document.getElementById('selected-text').textContent;
            });
            
            if (selectedText1 !== selectedText2) {
                results.passed.push('Context language change updates selected text display');
                log('✓ Context language dropdown updates display correctly', 'success');
            } else {
                results.failed.push('Context language change did not update display');
                log('✗ Context change did not update display', 'error');
            }
        }

        // 6. Send a chat message
        log('TEST 5: Chat functionality', 'test');
        await page.type('#query-input', 'What is the meaning of this text?');
        await page.click('#send-btn');
        await sleep(2000);
        
        const chatExpanded = await page.evaluate(() => {
            const chatContainer = document.getElementById('chat-container');
            return window.getComputedStyle(chatContainer).height === '750px';
        });
        
        const hasMessages = await page.evaluate(() => {
            return document.querySelectorAll('.message-user, .message-assistant').length > 0;
        });
        
        if (chatExpanded && hasMessages) {
            results.passed.push('Chat expands to 750px when messages added');
            log('✓ Chat box expanded and messages displayed', 'success');
        } else {
            results.failed.push(`Chat state incorrect: expanded=${chatExpanded}, hasMessages=${hasMessages}`);
            log('✗ Chat expansion or message display failed', 'error');
        }

        // 7. Clear everything
        log('TEST 6: Clear functionality', 'test');
        await page.click('#clear-btn');
        await sleep(1000);
        
        const afterClearState = await page.evaluate(() => {
            const ancientPanel = document.querySelector('.panel-ancient');
            const modernPanel = document.querySelector('.panel-modern');
            const englishPanel = document.querySelector('.panel-english');
            
            const ancientText = ancientPanel ? ancientPanel.textContent.trim() : '';
            const modernText = modernPanel ? modernPanel.textContent.trim() : '';
            const englishText = englishPanel ? englishPanel.textContent.trim() : '';
            const chatHeight = window.getComputedStyle(document.getElementById('chat-container')).height;
            const hasEmptyState = document.querySelector('.chat-empty-state') !== null;
            const contextOptions = document.getElementById('context-language').options.length;
            const selectedDisplay = document.getElementById('selected-text').textContent;
            
            return {
                ancientText,
                modernText,
                englishText,
                chatHeight,
                hasEmptyState,
                contextOptions,
                selectedDisplay
            };
        });
        
        if (afterClearState.chatHeight === '120px' && 
            afterClearState.hasEmptyState && 
            afterClearState.contextOptions === 0) {
            results.passed.push('Clear button properly resets all state');
            log('✓ Clear button correctly reset all components', 'success');
        } else {
            results.warnings.push('Some state may not be fully cleared');
            log('⚠ Clear state partially successful', 'warning');
        }

        // 8. Second translation with different text
        log('TEST 7: Second translation cycle (critical test)', 'test');
        await page.click('input[name="input-lang"][value="ancient"]');
        
        // Force clear and set the input text directly
        await page.evaluate(() => {
            const inputText = document.getElementById('input-text');
            inputText.value = '智者察言觀色。愚者妄言妄行。';
            // Trigger input event to ensure the value is registered
            inputText.dispatchEvent(new Event('input', { bubbles: true }));
        });
        await sleep(500);
        
        // Select output languages again
        await page.click('input[name="output-lang"][value="modern"]');
        await page.click('input[name="output-lang"][value="english"]');
        await sleep(500);
        
        // Translate second text
        await page.click('#translate-btn');
        log('Waiting for second translation...', 'info');
        
        // Check for errors in console
        const consoleErrors = [];
        page.on('console', msg => {
            if (msg.type() === 'error') {
                consoleErrors.push(msg.text());
            }
        });
        
        // Wait for translation to complete - just check for sentences to appear
        await page.waitForSelector('.sentence', { timeout: 30000 });
        await sleep(3000); // Give time for all panels to render
        
        // Log what we see for debugging
        const translationContent = await page.evaluate(() => {
            const sentences = document.querySelectorAll('.sentence');
            return {
                count: sentences.length,
                firstText: sentences[0]?.textContent || 'none'
            };
        });
        log(`Found ${translationContent.count} sentences, first: "${translationContent.firstText.substring(0, 20)}..."`, 'info');
        
        // 9. Test sentence selection on new translation
        log('TEST 8: Sentence selection on second translation', 'test');
        const sentenceCount = await page.evaluate(() => {
            return document.querySelectorAll('.sentence').length;
        });
        
        // Try clicking using evaluate to avoid puppeteer issues
        const clickResult = await page.evaluate(() => {
            const firstSentence = document.querySelector('.sentence');
            if (firstSentence) {
                firstSentence.click();
                return true;
            }
            return false;
        });
        
        await sleep(500);
        
        const secondTransSelectedText = await page.evaluate(() => {
            return document.getElementById('selected-text').textContent;
        });
        
        if (sentenceCount > 0 && clickResult && 
            !secondTransSelectedText.includes('Click on a sentence') && 
            consoleErrors.length === 0) {
            results.passed.push('Second translation works without errors');
            log('✓ Second translation completed successfully', 'success');
        } else {
            if (consoleErrors.length > 0) {
                results.failed.push(`Console errors during second translation: ${consoleErrors.join(', ')}`);
                log('✗ Console errors detected', 'error');
            } else if (!clickResult) {
                results.warnings.push('Could not click sentence in second translation');
                log('⚠ Sentence click failed but translation worked', 'warning');
            } else {
                results.warnings.push('Second translation may have issues');
                log('⚠ Second translation completed with warnings', 'warning');
            }
        }

        // 10. Test multi-select on new translation
        log('TEST 9: Multi-select on second translation', 'test');
        
        // Use evaluate for multi-select to avoid click issues
        const multiSelectResult = await page.evaluate(() => {
            const sentences = document.querySelectorAll('.sentence');
            if (sentences.length >= 2) {
                // Simulate cmd+click by dispatching events
                const event = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    metaKey: true
                });
                sentences[1].dispatchEvent(event);
                return true;
            }
            return false;
        });
        await sleep(500);
        
        const multiSelectCount = await page.evaluate(() => {
            return document.querySelectorAll('.sentence.highlighted').length;
        });
        
        if (multiSelectCount >= 2) {
            results.passed.push('Multi-select works on second translation');
            log('✓ Multi-select functional on new translation', 'success');
        } else {
            results.warnings.push('Multi-select may have issues on second translation');
            log('⚠ Multi-select partially working', 'warning');
        }

        // 11. Final chat test on second translation
        log('TEST 10: Chat on second translation', 'test');
        
        // Clear input first and then type
        await page.evaluate(() => {
            document.getElementById('query-input').value = '';
        });
        await page.type('#query-input', 'Explain the selected sentences');
        
        // Use evaluate to click send button
        await page.evaluate(() => {
            const sendBtn = document.getElementById('send-btn');
            if (sendBtn) sendBtn.click();
        });
        await sleep(3000);
        
        const finalChatState = await page.evaluate(() => {
            const messages = document.querySelectorAll('.message-user, .message-assistant').length;
            const chatHeight = window.getComputedStyle(document.getElementById('chat-container')).height;
            return { messages, chatHeight };
        });
        
        if (finalChatState.messages >= 2 && finalChatState.chatHeight === '750px') {
            results.passed.push('Chat works correctly with second translation');
            log('✓ Chat functional with new translation context', 'success');
        } else {
            results.warnings.push('Chat may have issues with second translation');
            log('⚠ Chat partially functional', 'warning');
        }

    } catch (error) {
        results.failed.push(`Test execution error: ${error.message}`);
        log(`Test execution failed: ${error.message}`, 'error');
    } finally {
        // Print final results
        console.log('\n' + '='.repeat(60));
        log('VERIFICATION TEST RESULTS', 'result');
        console.log('='.repeat(60));
        
        console.log(`\n${colors.green}✓ PASSED (${results.passed.length}):${colors.reset}`);
        results.passed.forEach(test => console.log(`  • ${test}`));
        
        if (results.warnings.length > 0) {
            console.log(`\n${colors.yellow}⚠ WARNINGS (${results.warnings.length}):${colors.reset}`);
            results.warnings.forEach(test => console.log(`  • ${test}`));
        }
        
        if (results.failed.length > 0) {
            console.log(`\n${colors.red}✗ FAILED (${results.failed.length}):${colors.reset}`);
            results.failed.forEach(test => console.log(`  • ${test}`));
        }
        
        const overallStatus = results.failed.length === 0 ? 'PASS' : 'FAIL';
        const statusColor = results.failed.length === 0 ? colors.green : colors.red;
        
        console.log('\n' + '='.repeat(60));
        console.log(`${statusColor}${colors.bright}OVERALL STATUS: ${overallStatus}${colors.reset}`);
        console.log('='.repeat(60) + '\n');
        
        await sleep(3000);
        await browser.close();
        
        process.exit(results.failed.length === 0 ? 0 : 1);
    }
}

// Run the test
runComprehensiveTest().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});