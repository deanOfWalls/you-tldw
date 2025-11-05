import { test, expect } from '@playwright/test';
import { chromium } from '@playwright/test';
import path from 'path';

test('should load extension and check for errors', async () => {
  // Create a browser context with the extension
  const extensionPath = path.resolve(process.cwd());
  const context = await chromium.launchPersistentContext('', {
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  const page = await context.newPage();
  
  // Listen for all console messages
  page.on('console', msg => {
    console.log(`[${msg.type()}]`, msg.text());
  });
  
  page.on('pageerror', error => {
    console.error('Page error:', error.message);
  });

  // Navigate to YouTube
  await page.goto('https://www.youtube.com/watch?v=aDbtrdfYqBc', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  // Check if content script injected anything
  const hasButtons = await page.evaluate(() => {
    return document.querySelectorAll('.youtldw-button').length > 0;
  });
  
  console.log('Has buttons:', hasButtons);
  
  // Check if #logo exists
  const logoExists = await page.evaluate(() => {
    return document.querySelector('#logo') !== null;
  });
  
  console.log('Logo exists:', logoExists);
  
  // Try to manually check if the content script ran
  const scriptRan = await page.evaluate(() => {
    // Check if any of our functions exist in the page context
    return typeof window.addOverlayButtons !== 'undefined';
  });
  
  console.log('Script functions in window:', scriptRan);
  
  // Get all scripts on the page
  const scripts = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('script')).map(s => s.src || s.textContent.substring(0, 100));
  });
  
  console.log('Scripts found:', scripts.length);
  
  await context.close();
});

