import { test, expect } from '@playwright/test';

const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=aDbtrdfYqBc';

test.describe('Debug Extension Loading', () => {
  test('should check if extension content script is loaded', async ({ page }) => {
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(msg.text());
      console.log('Console:', msg.text());
    });

    await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(5000);
    
    // Check if content script is running by looking for console messages
    const contentScriptMessages = consoleMessages.filter(msg => 
      msg.includes('YouTube') || 
      msg.includes('transcript') || 
      msg.includes('logo') ||
      msg.includes('button')
    );
    
    console.log('Content script messages:', contentScriptMessages);
    
    // Check if #logo exists
    const logo = await page.locator('#logo').count();
    console.log('Logo elements found:', logo);
    
    // Check for alternative logo selectors
    const logoIcon = await page.locator('#logo-icon').count();
    console.log('Logo-icon elements found:', logoIcon);
    
    const ytLogo = await page.locator('ytd-logo').count();
    console.log('ytd-logo elements found:', ytLogo);
    
    // Check for buttons that might exist
    const buttons = await page.locator('.youtldw-button').count();
    console.log('Extension buttons found:', buttons);
    
    // Take a screenshot
    await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    
    // Get page HTML around the header area
    const headerHTML = await page.evaluate(() => {
      const header = document.querySelector('ytd-masthead');
      return header ? header.innerHTML.substring(0, 2000) : 'No header found';
    });
    console.log('Header HTML (first 2000 chars):', headerHTML);
  });

  test('should check extension service worker', async ({ context }) => {
    // Check if extension is loaded
    const backgroundPages = context.backgroundPages();
    console.log('Background pages:', backgroundPages.length);
    
    for (const bgPage of backgroundPages) {
      console.log('Background page URL:', bgPage.url());
    }
  });
});

