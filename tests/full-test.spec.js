import { test, expect } from '@playwright/test';

const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=aDbtrdfYqBc';

test.describe('Full Extension Test', () => {
  test('should work end-to-end', async ({ page, context }) => {
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push(text);
      if (msg.type() === 'error') {
        errors.push(text);
      }
      console.log(`[${msg.type()}]`, text);
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.error('Page error:', error.message);
    });

    // Navigate to YouTube
    await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'domcontentloaded' });
    
    // Wait longer for extension to inject buttons
    await page.waitForTimeout(10000);
    
    // Check for extension console messages
    const extensionMessages = consoleMessages.filter(msg => 
      msg.includes('YouTube') || 
      msg.includes('transcript') || 
      msg.includes('logo') ||
      msg.includes('button') ||
      msg.includes('No parent container')
    );
    
    console.log('Extension-related messages:', extensionMessages);
    console.log('Errors:', errors);
    
    // Try multiple ways to find buttons
    const buttonSelectors = [
      'button:has-text("TL;DW")',
      '.youtldw-button:has-text("TL;DW")',
      'button.youtldw-button',
    ];
    
    let buttonFound = false;
    for (const selector of buttonSelectors) {
      const button = page.locator(selector).first();
      const count = await button.count();
      if (count > 0) {
        const isVisible = await button.isVisible().catch(() => false);
        if (isVisible) {
          console.log(`Found button with selector: ${selector}`);
          buttonFound = true;
          
          // Try clicking it
          await button.click();
          await page.waitForTimeout(5000);
          
          // Check if ChatGPT tab opened
          const pages = context.pages();
          console.log('Total pages:', pages.length);
          
          // Wait a bit more for new tab
          await page.waitForTimeout(5000);
          const pagesAfter = context.pages();
          console.log('Total pages after:', pagesAfter.length);
          
          break;
        }
      }
    }
    
    if (!buttonFound) {
      // Debug: Check what's in the DOM
      const logoInfo = await page.evaluate(() => {
        const logo = document.querySelector('#logo');
        if (logo) {
          return {
            found: true,
            tagName: logo.tagName,
            id: logo.id,
            className: logo.className,
            parentTag: logo.parentElement?.tagName,
            parentId: logo.parentElement?.id,
            siblings: Array.from(logo.parentElement?.children || []).map(el => ({
              tag: el.tagName,
              id: el.id,
              class: el.className,
              text: el.textContent?.substring(0, 30)
            }))
          };
        }
        return { found: false };
      });
      
      console.log('Logo info:', JSON.stringify(logoInfo, null, 2));
      
      // Check if buttons exist but are hidden
      const buttonInfo = await page.evaluate(() => {
        const buttons = document.querySelectorAll('.youtldw-button');
        return Array.from(buttons).map(btn => ({
          text: btn.textContent,
          visible: btn.offsetParent !== null,
          display: window.getComputedStyle(btn).display,
          parentTag: btn.parentElement?.tagName
        }));
      });
      
      console.log('Button info:', JSON.stringify(buttonInfo, null, 2));
    }
  });
});

