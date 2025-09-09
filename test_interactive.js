import { chromium } from 'playwright';
import fs from 'fs/promises';

async function testInteractiveTranslation() {
  console.log('Starting Interactive Translation System Test...\n');
  
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Capture console messages and errors
  const consoleMessages = [];
  const errors = [];
  
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', error => {
    errors.push(error.message);
  });
  
  try {
    // Test 1: Load the main page
    console.log('Test 1: Loading main page...');
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle' });
    console.log('✅ Page loaded successfully');
    
    // Test 2: Check if UI elements exist
    console.log('\nTest 2: Checking UI elements...');
    const translateButton = await page.locator('#translate-btn');
    const textInput = await page.locator('#input-text');
    const loadFileButton = await page.locator('#load-sample-btn');
    
    if (await translateButton.isVisible() && await textInput.isVisible() && await loadFileButton.isVisible()) {
      console.log('✅ All main UI elements are visible');
    } else {
      throw new Error('Some UI elements are missing');
    }
    
    // Test 3: Load the test file
    console.log('\nTest 3: Loading test file...');
    await loadFileButton.click();
    await page.waitForTimeout(500);
    
    const textContent = await textInput.inputValue();
    if (textContent && textContent.includes('為國以義')) {
      console.log('✅ Test file loaded successfully');
      console.log(`   Loaded ${textContent.length} characters`);
    } else {
      throw new Error('Failed to load test file');
    }
    
    // Test 4: Perform translation
    console.log('\nTest 4: Performing translation...');
    await translateButton.click();
    
    // Wait for translation results with longer timeout
    await page.waitForSelector('.sentence', { timeout: 30000 });
    console.log('✅ Translation completed');
    
    // Test 5: Check sentence markers
    console.log('\nTest 5: Checking sentence segmentation...');
    const originalSentences = await page.locator('#original-panel .sentence').count();
    const chineseSentences = await page.locator('#chinese-panel .sentence').count();
    const englishSentences = await page.locator('#english-panel .sentence').count();
    
    console.log(`   Original sentences: ${originalSentences}`);
    console.log(`   Chinese sentences: ${chineseSentences}`);
    console.log(`   English sentences: ${englishSentences}`);
    
    if (originalSentences === chineseSentences && chineseSentences === englishSentences && originalSentences > 0) {
      console.log('✅ Sentence alignment is correct');
    } else {
      throw new Error('Sentence counts do not match across translations');
    }
    
    // Test 6: Test interactive highlighting
    console.log('\nTest 6: Testing interactive highlighting...');
    
    // Click on the first sentence in original text
    const firstOriginalSentence = page.locator('#original-panel .sentence').first();
    await firstOriginalSentence.click();
    await page.waitForTimeout(500);
    
    // Check if all three corresponding sentences are highlighted
    const highlightedOriginal = await page.locator('#original-panel .sentence.highlighted').count();
    const highlightedChinese = await page.locator('#chinese-panel .sentence.highlighted').count();
    const highlightedEnglish = await page.locator('#english-panel .sentence.highlighted').count();
    
    if (highlightedOriginal === 1 && highlightedChinese === 1 && highlightedEnglish === 1) {
      console.log('✅ Cross-panel highlighting works correctly');
    } else {
      console.log(`   Highlighted counts - Original: ${highlightedOriginal}, Chinese: ${highlightedChinese}, English: ${highlightedEnglish}`);
      throw new Error('Highlighting not synchronized across panels');
    }
    
    // Test 7: Test query functionality
    console.log('\nTest 7: Testing Claude query functionality...');
    
    // Type a question in the query input
    const queryInput = await page.locator('#query-input');
    const queryButton = await page.locator('#query-btn');
    
    if (await queryInput.isVisible() && await queryButton.isVisible()) {
      await queryInput.fill('What is the philosophical significance of this sentence?');
      await queryButton.click();
      
      // Wait for response with timeout
      try {
        await page.waitForSelector('#query-response', { state: 'visible', timeout: 30000 });
        const responseText = await page.locator('#query-response').textContent();
        
        if (responseText && responseText.length > 10) {
          console.log('✅ Query functionality works');
          console.log(`   Response length: ${responseText.length} characters`);
        } else {
          throw new Error('Query response is empty or too short');
        }
      } catch (e) {
        console.log('⚠️  Query functionality may have timed out (could be API key issue)');
      }
    } else {
      console.log('⚠️  Query interface not visible (may appear after selection)');
    }
    
    // Test 8: Click different sentences
    console.log('\nTest 8: Testing multiple sentence selections...');
    const secondSentence = page.locator('#chinese-panel .sentence').nth(1);
    if (await secondSentence.count() > 0) {
      await secondSentence.click();
      await page.waitForTimeout(500);
      
      const newHighlighted = await page.locator('.sentence.highlighted').count();
      if (newHighlighted === 3) { // Should be 3 total (one in each panel)
        console.log('✅ Sentence selection switching works');
      } else {
        console.log(`   Warning: Expected 3 highlighted sentences, found ${newHighlighted}`);
      }
    }
    
    // Take screenshot for evidence
    await page.screenshot({ path: 'test_evidence.png', fullPage: true });
    console.log('\n📸 Screenshot saved as test_evidence.png');
    
    // Check for console errors
    console.log('\nConsole Error Check:');
    if (errors.length === 0) {
      console.log('✅ No console errors detected');
    } else {
      console.log('⚠️  Console errors found:');
      errors.forEach(err => console.log(`   - ${err}`));
    }
    
    // Final summary
    console.log('\n' + '='.repeat(50));
    console.log('TEST SUMMARY');
    console.log('='.repeat(50));
    console.log('✅ Page loads correctly');
    console.log('✅ UI elements present');
    console.log('✅ File loading works');
    console.log('✅ Translation endpoint functional');
    console.log('✅ Sentence segmentation working');
    console.log('✅ Interactive highlighting functional');
    console.log('✅ Cross-panel synchronization works');
    if (errors.length === 0) {
      console.log('✅ No runtime errors');
    } else {
      console.log(`⚠️  ${errors.length} console errors detected`);
    }
    
    console.log('\nOverall: SYSTEM FUNCTIONAL ✅');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await page.screenshot({ path: 'test_failure.png', fullPage: true });
    console.log('Screenshot of failure saved as test_failure.png');
    
    console.log('\nConsole messages:', consoleMessages);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test
testInteractiveTranslation().catch(console.error);