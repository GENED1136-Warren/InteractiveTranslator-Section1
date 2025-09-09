import { chromium } from 'playwright';

async function quickV02Test() {
    const browser = await chromium.launch({ 
        headless: true,
        timeout: 30000
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    
    const results = {
        compilation: { status: 'pass', details: 'No TypeScript in project' },
        build: { status: 'pass', details: 'Server running at localhost:3001' },
        features: {
            chatHeight: { initial: null, expanded: null },
            inputClear: { cleared: false, messageAdded: false },
            copyConversation: { exists: false, works: false },
            regression: { translation: false, selection: false }
        },
        errors: []
    };
    
    // Capture errors
    page.on('console', msg => {
        if (msg.type() === 'error') {
            results.errors.push(msg.text());
        }
    });
    
    try {
        // Load page
        await page.goto('http://localhost:3001');
        console.log('✅ Page loaded');
        
        // FEATURE 1: Check initial chat height (should be 120px when collapsed)
        const initialHeight = await page.evaluate(() => {
            const container = document.querySelector('.chat-container');
            return container ? window.getComputedStyle(container).height : null;
        });
        results.features.chatHeight.initial = initialHeight;
        console.log(`Chat initial height: ${initialHeight}`);
        
        // Perform translation to enable chat
        await page.fill('#input-text', '君子以德治國。');
        await page.click('#translate-btn');
        await page.waitForTimeout(2000);
        
        // Select a sentence
        const sentenceExists = await page.isVisible('.sentence');
        if (sentenceExists) {
            await page.click('.sentence:first-child');
            results.features.regression.selection = true;
            console.log('✅ Sentence selection works');
        }
        
        // FEATURE 2: Test input clear on send
        const inputSelector = '#query-input';
        const sendButton = '#send-btn';
        
        // Wait for input to be enabled
        await page.waitForFunction(
            selector => !document.querySelector(selector).disabled,
            inputSelector,
            { timeout: 5000 }
        ).catch(() => {});
        
        const inputEnabled = await page.evaluate(sel => !document.querySelector(sel)?.disabled, inputSelector);
        
        if (inputEnabled) {
            await page.fill(inputSelector, 'Test message');
            await page.click(sendButton);
            await page.waitForTimeout(1000);
            
            const afterValue = await page.inputValue(inputSelector);
            results.features.inputClear.cleared = afterValue === '';
            console.log(`Input cleared after send: ${results.features.inputClear.cleared}`);
            
            // Check if chat expanded
            const expandedHeight = await page.evaluate(() => {
                const container = document.querySelector('.chat-container');
                return container ? window.getComputedStyle(container).height : null;
            });
            results.features.chatHeight.expanded = expandedHeight;
            console.log(`Chat expanded height: ${expandedHeight}`);
        }
        
        // FEATURE 3: Check copy conversation button
        const copyButtonExists = await page.isVisible('#copy-conversation-btn');
        results.features.copyConversation.exists = copyButtonExists;
        
        if (copyButtonExists) {
            await page.click('#copy-conversation-btn');
            await page.waitForTimeout(500);
            
            const buttonText = await page.textContent('#copy-conversation-btn');
            results.features.copyConversation.works = buttonText.includes('✓') || buttonText.includes('Copied');
            console.log(`Copy conversation button works: ${results.features.copyConversation.works}`);
        }
        
        // Check translation worked
        const panelsVisible = await page.isVisible('#translation-panels');
        results.features.regression.translation = panelsVisible;
        
    } catch (error) {
        console.error('Test error:', error.message);
        results.errors.push(error.message);
    } finally {
        await browser.close();
        
        // Generate report
        console.log('\n=== V0.2 FEATURE VERIFICATION REPORT ===\n');
        
        // Feature checks
        const chatHeightPassed = results.features.chatHeight.initial === '120px' && 
                                results.features.chatHeight.expanded === '1250px';
        
        console.log('NEW FEATURES (v0.2):');
        console.log(`1. Chat Box Height: ${chatHeightPassed ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   - Initial: ${results.features.chatHeight.initial} (expected 120px)`);
        console.log(`   - Expanded: ${results.features.chatHeight.expanded} (expected 1250px)`);
        
        console.log(`2. Input Clear on Send: ${results.features.inputClear.cleared ? '✅ PASS' : '❌ FAIL'}`);
        
        console.log(`3. Copy Conversation Button: ${results.features.copyConversation.works ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`   - Exists: ${results.features.copyConversation.exists}`);
        console.log(`   - Works: ${results.features.copyConversation.works}`);
        
        console.log('\nREGRESSION CHECKS:');
        console.log(`- Translation: ${results.features.regression.translation ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`- Selection: ${results.features.regression.selection ? '✅ PASS' : '❌ FAIL'}`);
        console.log(`- Console Errors: ${results.errors.length === 0 ? '✅ NONE' : `❌ ${results.errors.length} errors`}`);
        
        // Final verdict
        const allPassed = chatHeightPassed && 
                         results.features.inputClear.cleared && 
                         results.features.copyConversation.works &&
                         results.features.regression.translation &&
                         results.features.regression.selection;
        
        console.log(`\nFINAL VERDICT: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        process.exit(allPassed ? 0 : 1);
    }
}

quickV02Test().catch(console.error);