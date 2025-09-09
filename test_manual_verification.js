import { chromium } from 'playwright';

async function manualVerification() {
    console.log('Starting manual verification test...\n');
    
    const browser = await chromium.launch({ 
        headless: false,  // Show browser for manual verification
        slowMo: 1000      // Slow down actions for visibility
    });
    
    const page = await browser.newPage();
    page.setDefaultTimeout(30000);
    
    // Detailed logging
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log(`❌ Console Error: ${msg.text()}`);
        }
    });
    
    page.on('response', response => {
        if (response.status() >= 400) {
            console.log(`❌ HTTP ${response.status()}: ${response.url()}`);
        }
    });
    
    try {
        console.log('Step 1: Loading page...');
        await page.goto('http://localhost:3001');
        await page.waitForTimeout(2000);
        
        console.log('Step 2: Entering text for translation...');
        const testText = '君子以德治國。小人以力服人。';
        await page.fill('#input-text', testText);
        
        console.log('Step 3: Starting translation...');
        await page.click('#translate-btn');
        
        // Wait for translation with visual indicator
        console.log('Step 4: Waiting for translation to complete...');
        await page.waitForFunction(
            () => {
                const panels = document.querySelector('#translation-panels');
                return panels && panels.style.display !== 'none';
            },
            { timeout: 15000 }
        );
        
        console.log('Step 5: Checking if sentences are clickable...');
        const sentences = await page.$$('.sentence');
        console.log(`Found ${sentences.length} sentences`);
        
        if (sentences.length > 0) {
            console.log('Step 6: Clicking first sentence...');
            await sentences[0].click();
            await page.waitForTimeout(1000);
            
            // Check if query section appeared
            const queryVisible = await page.isVisible('#query-section');
            console.log(`Query section visible: ${queryVisible}`);
            
            if (queryVisible) {
                // Check chat container state
                const chatState = await page.evaluate(() => {
                    const container = document.querySelector('#chat-container');
                    const messages = document.querySelector('#chat-messages');
                    return {
                        containerExists: !!container,
                        containerHeight: container ? window.getComputedStyle(container).height : null,
                        containerClasses: container ? container.className : null,
                        messagesExists: !!messages,
                        hasEmptyState: !!document.querySelector('.chat-empty-state')
                    };
                });
                
                console.log('\nChat Container State:');
                console.log(JSON.stringify(chatState, null, 2));
                
                // Check input state
                const inputState = await page.evaluate(() => {
                    const input = document.querySelector('#query-input');
                    const sendBtn = document.querySelector('#send-btn');
                    return {
                        inputExists: !!input,
                        inputDisabled: input ? input.disabled : null,
                        sendBtnExists: !!sendBtn,
                        sendBtnDisabled: sendBtn ? sendBtn.disabled : null
                    };
                });
                
                console.log('\nInput State:');
                console.log(JSON.stringify(inputState, null, 2));
                
                if (!inputState.inputDisabled) {
                    console.log('\nStep 7: Typing message...');
                    await page.fill('#query-input', 'What does this mean?');
                    
                    console.log('Step 8: Sending message...');
                    await page.click('#send-btn');
                    await page.waitForTimeout(3000);
                    
                    // Check after sending
                    const afterSendState = await page.evaluate(() => {
                        const input = document.querySelector('#query-input');
                        const container = document.querySelector('#chat-container');
                        const messages = document.querySelectorAll('.message-bubble, .message-content');
                        return {
                            inputValue: input ? input.value : null,
                            containerHeight: container ? window.getComputedStyle(container).height : null,
                            messageCount: messages.length,
                            hasExpandedClass: container ? container.classList.contains('expanded') : false
                        };
                    });
                    
                    console.log('\nAfter Send State:');
                    console.log(JSON.stringify(afterSendState, null, 2));
                    
                    // Check copy button
                    const copyBtnState = await page.evaluate(() => {
                        const copyBtn = document.querySelector('#copy-conversation-btn');
                        return {
                            exists: !!copyBtn,
                            visible: copyBtn ? window.getComputedStyle(copyBtn).display !== 'none' : false,
                            text: copyBtn ? copyBtn.textContent : null
                        };
                    });
                    
                    console.log('\nCopy Button State:');
                    console.log(JSON.stringify(copyBtnState, null, 2));
                    
                    if (copyBtnState.exists && copyBtnState.visible) {
                        console.log('\nStep 9: Testing copy conversation button...');
                        await page.click('#copy-conversation-btn');
                        await page.waitForTimeout(1000);
                        
                        const afterCopyText = await page.textContent('#copy-conversation-btn');
                        console.log(`Button text after click: ${afterCopyText}`);
                    }
                }
            }
        }
        
        // Take screenshot for evidence
        await page.screenshot({ path: 'test_manual_state.png', fullPage: true });
        console.log('\n✅ Screenshot saved as test_manual_state.png');
        
        console.log('\n=== Manual verification complete ===');
        console.log('Browser will remain open for 10 seconds for manual inspection...');
        await page.waitForTimeout(10000);
        
    } catch (error) {
        console.error('Error during verification:', error);
        await page.screenshot({ path: 'test_manual_error.png', fullPage: true });
    } finally {
        await browser.close();
    }
}

manualVerification().catch(console.error);