import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';

const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=aDbtrdfYqBc';

test('should test extension functionality end-to-end', async () => {
  const extensionPath = path.resolve(process.cwd());
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();
  
  const consoleMessages = [];
  page.on('console', msg => {
    const text = msg.text();
    consoleMessages.push(text);
    console.log(`[${msg.type()}]`, text);
  });
  
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  // Navigate to YouTube
  console.log('Navigating to YouTube...');
  await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000); // Wait for extension to inject buttons
  
  // Check for buttons
  const buttons = page.locator('.youtldw-button');
  const buttonCount = await buttons.count();
  console.log('Found buttons:', buttonCount);
  
  if (buttonCount === 0) {
    // Check what went wrong
    const extensionErrors = consoleMessages.filter(msg => 
      msg.includes('Error') || 
      msg.includes('No parent container') ||
      msg.includes('not found')
    );
    console.log('Extension errors:', extensionErrors);
    
    // Check if logo exists
    const logoExists = await page.evaluate(() => {
      return document.querySelector('#logo') !== null;
    });
    console.log('Logo exists:', logoExists);
    
    throw new Error('Buttons not found! Extension may not be working correctly.');
  }
  
  // Find TL;DW button
  const tldwButton = buttons.filter({ hasText: 'TL;DW' }).first();
  const isVisible = await tldwButton.isVisible();
  console.log('TL;DW button visible:', isVisible);
  
  if (!isVisible) {
    throw new Error('TL;DW button exists but is not visible!');
  }
  
  // Test clicking TL;DW button
  console.log('Clicking TL;DW button...');
  
  // Listen for new pages
  const newPagePromise = context.waitForEvent('page', { timeout: 30000 });
  
  await tldwButton.click();
  await page.waitForTimeout(3000);
  
  // Check if transcript was opened
  const transcriptContainer = page.locator('ytd-transcript-renderer');
  const transcriptVisible = await transcriptContainer.isVisible().catch(() => false);
  console.log('Transcript visible after click:', transcriptVisible);
  
  // Wait for ChatGPT tab to open
  let chatgptPage = null;
  try {
    chatgptPage = await newPagePromise;
    console.log('ChatGPT page opened:', chatgptPage.url());
    
    // Wait for ChatGPT to load
    await chatgptPage.waitForLoadState('networkidle');
    await chatgptPage.waitForTimeout(5000);
    
    // Check if text was inserted
    const textarea = chatgptPage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    
    const textareaValue = await textarea.inputValue();
    console.log('Textarea value length:', textareaValue.length);
    
    if (textareaValue.length === 0) {
      throw new Error('Textarea is empty! Transcript was not inserted into ChatGPT.');
    }
    
    // Check if transcript content is present
    if (!textareaValue.includes('```')) {
      console.warn('Warning: Transcript may not be properly formatted (no code blocks found)');
    }
    
    console.log('✓ Extension is working! Transcript was sent to ChatGPT.');
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new Error('ChatGPT tab did not open! Background script may not be working.');
    }
    throw error;
  } finally {
    await context.close();
  }
});

test('should test custom prompt functionality', async () => {
  const extensionPath = path.resolve(process.cwd());
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();
  
  await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(8000);
  
  // Find pencil button
  const pencilButton = page.locator('.youtldw-button').filter({ hasText: '✏️' }).first();
  await expect(pencilButton).toBeVisible({ timeout: 10000 });
  
  // Click pencil button
  await pencilButton.click();
  await page.waitForTimeout(1000);
  
  // Check if modal appeared
  const modal = page.locator('input[placeholder*="Enter your custom instructions"]');
  await expect(modal).toBeVisible({ timeout: 5000 });
  
  // Enter custom prompt
  await modal.fill('Test custom prompt');
  
  // Click submit
  const submitButton = page.locator('button:has-text("Submit")');
  await submitButton.click();
  
  await page.waitForTimeout(3000);
  
  // Check if ChatGPT opened (similar to above)
  const newPagePromise = context.waitForEvent('page', { timeout: 30000 });
  
  try {
    const chatgptPage = await newPagePromise;
    await chatgptPage.waitForLoadState('networkidle');
    await chatgptPage.waitForTimeout(5000);
    
    const textarea = chatgptPage.locator('textarea');
    const textareaValue = await textarea.inputValue();
    
    if (!textareaValue.includes('Test custom prompt')) {
      throw new Error('Custom prompt was not included in the message!');
    }
    
    console.log('✓ Custom prompt functionality is working!');
  } catch (error) {
    if (error.message.includes('timeout')) {
      throw new Error('ChatGPT tab did not open with custom prompt!');
    }
    throw error;
  } finally {
    await context.close();
  }
});

