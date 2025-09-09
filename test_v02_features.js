import { chromium } from 'playwright';

// Color codes for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// Test result tracking
let testResults = {
    passed: [],
    failed: [],
    errors: []
};

async function logTest(testName, status, details = '') {
    const statusSymbol = status === 'pass' ? '✅' : '❌';
    const color = status === 'pass' ? colors.green : colors.red;
    console.log(`${color}${statusSymbol} ${testName}${colors.reset}${details ? ': ' + details : ''}`);
    
    if (status === 'pass') {
        testResults.passed.push({ name: testName, details });
    } else {
        testResults.failed.push({ name: testName, details });
    }
}

async function testV02Features() {
    const browser = await chromium.launch({ 
        headless: false,
        slowMo: 500 // Slow down for visual verification
    });
    
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Capture console errors
    const consoleErrors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            consoleErrors.push(msg.text());
            console.log(`${colors.red}Console Error: ${msg.text()}${colors.reset}`);
        }
    });
    
    // Track network errors
    page.on('requestfailed', request => {
        console.log(`${colors.red}Request failed: ${request.url()}${colors.reset}`);
        testResults.errors.push(`Request failed: ${request.url()}`);
    });
    
    try {
        console.log(`${colors.cyan}=== Starting v0.2 Feature Tests ===${colors.reset}\n`);
        
        // Load the page
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle' });
        await logTest('Page Load', 'pass', 'Application loaded successfully');
        
        // Test 1: Chat Box Initial Height (NEW v0.2)
        console.log(`\n${colors.blue}Test 1: Chat Box Height (v0.2 Feature)${colors.reset}`);
        
        // First, perform a translation to make the chat section visible
        const sampleText = '君子以德治國。小人以力服人。';
        await page.fill('#input-text', sampleText);
        await page.click('#translate-btn');
        
        // Wait for translation to complete
        await page.waitForTimeout(3000);
        
        // Check if query section is visible
        const querySectionVisible = await page.isVisible('#query-section');
        await logTest('Query Section Visibility', querySectionVisible ? 'pass' : 'fail', 
            querySectionVisible ? 'Query section visible after translation' : 'Query section not visible');
        
        // Check initial chat container height
        const initialHeight = await page.evaluate(() => {
            const container = document.getElementById('chat-container');
            return container ? window.getComputedStyle(container).height : null;
        });
        
        await logTest('Initial Chat Height', initialHeight === '120px' ? 'pass' : 'fail', 
            `Height is ${initialHeight} (expected 120px)`);
        
        // Test 2: Input Clear on Send (NEW v0.2)
        console.log(`\n${colors.blue}Test 2: Input Clear on Send (v0.2 Feature)${colors.reset}`);
        
        // Select a sentence first
        await page.click('.sentence:first-child');
        await page.waitForTimeout(500);
        
        // Type message
        const testMessage = 'What does this mean?';
        await page.fill('#query-input', testMessage);
        
        // Verify input has value
        const inputValueBefore = await page.inputValue('#query-input');
        await logTest('Input Has Value Before Send', inputValueBefore === testMessage ? 'pass' : 'fail',
            `Input value: "${inputValueBefore}"`);
        
        // Send message
        await page.click('#send-btn');
        await page.waitForTimeout(2000);
        
        // Check if input cleared
        const inputValueAfter = await page.inputValue('#query-input');
        await logTest('Input Cleared After Send', inputValueAfter === '' ? 'pass' : 'fail',
            `Input value after send: "${inputValueAfter}"`);
        
        // Check if message appeared in chat
        const messageInChat = await page.evaluate((msg) => {
            const messages = document.querySelectorAll('.message-content');
            return Array.from(messages).some(m => m.textContent.includes(msg));
        }, testMessage);
        
        await logTest('Message Appears in Chat', messageInChat ? 'pass' : 'fail',
            messageInChat ? 'Message found in chat' : 'Message not found in chat');
        
        // Test 3: Chat Box Expansion (NEW v0.2)
        console.log(`\n${colors.blue}Test 3: Chat Box Expansion (v0.2 Feature)${colors.reset}`);
        
        // Check if chat expanded after adding messages
        const expandedHeight = await page.evaluate(() => {
            const container = document.getElementById('chat-container');
            return container ? window.getComputedStyle(container).height : null;
        });
        
        await logTest('Chat Expanded After Messages', expandedHeight === '1250px' ? 'pass' : 'fail',
            `Height is ${expandedHeight} (expected 1250px)`);
        
        // Test smooth animation
        const hasTransition = await page.evaluate(() => {
            const container = document.getElementById('chat-container');
            const styles = window.getComputedStyle(container);
            return styles.transition.includes('height');
        });
        
        await logTest('Smooth Height Animation', hasTransition ? 'pass' : 'fail',
            hasTransition ? 'Height transition CSS present' : 'No height transition');
        
        // Test 4: Copy Entire Conversation (NEW v0.2)
        console.log(`\n${colors.blue}Test 4: Copy Entire Conversation (v0.2 Feature)${colors.reset}`);
        
        // Send another message to build conversation
        await page.fill('#query-input', 'Can you explain more?');
        await page.click('#send-btn');
        await page.waitForTimeout(3000);
        
        // Check if copy conversation button exists
        const copyConvButtonExists = await page.isVisible('#copy-conversation-btn');
        await logTest('Copy Conversation Button Exists', copyConvButtonExists ? 'pass' : 'fail');
        
        if (copyConvButtonExists) {
            // Click copy conversation button
            await page.click('#copy-conversation-btn');
            await page.waitForTimeout(500);
            
            // Check for success feedback
            const buttonText = await page.textContent('#copy-conversation-btn');
            const showsCopied = buttonText.includes('✓') || buttonText.includes('Copied');
            await logTest('Copy Conversation Feedback', showsCopied ? 'pass' : 'fail',
                `Button shows: "${buttonText}"`);
            
            // Get clipboard content (if possible in non-headless mode)
            const clipboardContent = await page.evaluate(async () => {
                try {
                    return await navigator.clipboard.readText();
                } catch {
                    return null;
                }
            });
            
            if (clipboardContent) {
                const hasMarkdownFormat = clipboardContent.includes('## User:') || 
                                         clipboardContent.includes('## Assistant:') ||
                                         clipboardContent.includes('**User:**') ||
                                         clipboardContent.includes('**Assistant:**');
                await logTest('Markdown Format in Clipboard', hasMarkdownFormat ? 'pass' : 'fail',
                    hasMarkdownFormat ? 'Markdown headers found' : 'No markdown format detected');
            }
        }
        
        // Test 5: Clear Chat and Collapse (Regression + v0.2)
        console.log(`\n${colors.blue}Test 5: Clear Chat and Collapse${colors.reset}`);
        
        await page.click('#clear-chat-btn');
        await page.waitForTimeout(1000);
        
        // Check if chat collapsed back to 120px
        const collapsedHeight = await page.evaluate(() => {
            const container = document.getElementById('chat-container');
            return container ? window.getComputedStyle(container).height : null;
        });
        
        await logTest('Chat Collapsed After Clear', collapsedHeight === '120px' ? 'pass' : 'fail',
            `Height is ${collapsedHeight} (expected 120px)`);
        
        // Test 6: Multiple Translations (Regression Check)
        console.log(`\n${colors.blue}Test 6: Multiple Translations (Regression)${colors.reset}`);
        
        // Clear and do new translation
        await page.click('#clear-btn');
        const newText = '學而時習之，不亦說乎？';
        await page.fill('#input-text', newText);
        
        // Select Ancient Chinese input and English output
        await page.check('input[name="input-lang"][value="ancient"]');
        await page.uncheck('input[name="output-lang"][value="ancient"]');
        await page.check('input[name="output-lang"][value="english"]');
        
        await page.click('#translate-btn');
        await page.waitForTimeout(3000);
        
        // Check translation panels
        const panelsVisible = await page.isVisible('#translation-panels');
        await logTest('Translation Panels Visible', panelsVisible ? 'pass' : 'fail');
        
        // Check for English translation
        const hasEnglishPanel = await page.evaluate(() => {
            const panels = document.querySelectorAll('.panel-title');
            return Array.from(panels).some(p => p.textContent.includes('English'));
        });
        
        await logTest('English Translation Present', hasEnglishPanel ? 'pass' : 'fail');
        
        // Test 7: Sentence Selection (Regression)
        console.log(`\n${colors.blue}Test 7: Sentence Selection (Regression)${colors.reset}`);
        
        const sentences = await page.$$('.sentence');
        if (sentences.length > 0) {
            await sentences[0].click();
            const isHighlighted = await page.evaluate(() => {
                const sentence = document.querySelector('.sentence');
                return sentence && sentence.classList.contains('highlighted');
            });
            await logTest('Single Sentence Selection', isHighlighted ? 'pass' : 'fail');
            
            // Multi-select with Cmd/Ctrl
            if (sentences.length > 1) {
                await page.keyboard.down('Meta'); // Use Meta for Mac
                await sentences[1].click();
                await page.keyboard.up('Meta');
                
                const multiSelectCount = await page.evaluate(() => {
                    return document.querySelectorAll('.sentence.highlighted').length;
                });
                
                await logTest('Multi-Sentence Selection', multiSelectCount > 1 ? 'pass' : 'fail',
                    `${multiSelectCount} sentences selected`);
            }
        }
        
        // Test 8: Context Language Updates (Regression)
        console.log(`\n${colors.blue}Test 8: Context Language Updates (Regression)${colors.reset}`);
        
        const contextSelector = await page.isVisible('#context-language');
        if (contextSelector) {
            const options = await page.$$eval('#context-language option', opts => 
                opts.map(o => o.value)
            );
            await logTest('Context Language Options', options.length > 0 ? 'pass' : 'fail',
                `${options.length} language options available`);
        }
        
        // Test 9: Error Handling (Regression)
        console.log(`\n${colors.blue}Test 9: Error Handling${colors.reset}`);
        
        await logTest('Console Errors', consoleErrors.length === 0 ? 'pass' : 'fail',
            consoleErrors.length === 0 ? 'No console errors' : `${consoleErrors.length} errors found`);
        
        // Take screenshot for evidence
        await page.screenshot({ path: 'test_v02_evidence.png', fullPage: true });
        console.log(`\n${colors.magenta}Screenshot saved as test_v02_evidence.png${colors.reset}`);
        
    } catch (error) {
        console.error(`${colors.red}Test execution error:${colors.reset}`, error);
        testResults.errors.push(error.message);
        
        // Take error screenshot
        await page.screenshot({ path: 'test_v02_error.png', fullPage: true });
    } finally {
        // Print summary
        console.log(`\n${colors.cyan}=== TEST SUMMARY ===${colors.reset}`);
        console.log(`${colors.green}Passed: ${testResults.passed.length}${colors.reset}`);
        console.log(`${colors.red}Failed: ${testResults.failed.length}${colors.reset}`);
        
        if (testResults.failed.length > 0) {
            console.log(`\n${colors.red}Failed Tests:${colors.reset}`);
            testResults.failed.forEach(t => {
                console.log(`  - ${t.name}: ${t.details}`);
            });
        }
        
        if (testResults.errors.length > 0) {
            console.log(`\n${colors.red}Errors:${colors.reset}`);
            testResults.errors.forEach(e => {
                console.log(`  - ${e}`);
            });
        }
        
        await browser.close();
        
        // Exit with appropriate code
        process.exit(testResults.failed.length > 0 ? 1 : 0);
    }
}

// Run the tests
testV02Features().catch(console.error);