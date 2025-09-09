const puppeteer = require('puppeteer');

async function testUI() {
    console.log('Testing UI functionality...');
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    // Listen for console messages
    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('Browser Error:', msg.text());
        }
    });
    
    // Listen for page errors
    page.on('pageerror', error => {
        console.log('Page Error:', error.message);
    });
    
    try {
        await page.goto('http://localhost:3001', { waitUntil: 'networkidle2' });
        
        // Check if page loaded
        const title = await page.title();
        console.log('Page title:', title);
        
        // Check if translate button exists
        const translateBtn = await page.$('#translate-btn');
        if (translateBtn) {
            console.log('✓ Translate button found');
        } else {
            console.log('✗ Translate button not found');
        }
        
        // Set input language to ancient
        await page.click('input[value="ancient"]');
        console.log('✓ Selected ancient Chinese as input');
        
        // Enter sample text
        await page.type('#input-text', '君子以德治國。');
        console.log('✓ Entered sample text');
        
        // Click translate
        await page.click('#translate-btn');
        console.log('✓ Clicked translate button');
        
        // Wait for translation
        await page.waitForSelector('#translation-panels', { visible: true, timeout: 10000 });
        console.log('✓ Translation panels appeared');
        
        // Check if query section appears
        const querySection = await page.$('#query-section');
        if (querySection) {
            const isVisible = await querySection.isIntersectingViewport();
            console.log(isVisible ? '✓ Query section visible' : '✗ Query section not visible');
        }
        
        // Try to click a sentence
        await page.waitForSelector('.sentence', { timeout: 5000 });
        const sentences = await page.$$('.sentence');
        console.log(`✓ Found ${sentences.length} sentences`);
        
        if (sentences.length > 0) {
            await sentences[0].click();
            console.log('✓ Clicked first sentence');
            
            // Check if selection worked
            const selectedText = await page.$eval('#selected-text', el => el.textContent);
            console.log('Selected text:', selectedText);
        }
        
    } catch (error) {
        console.error('Test error:', error.message);
    } finally {
        await browser.close();
    }
}

testUI();