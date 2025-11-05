import { test, expect } from '@playwright/test';

const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=aDbtrdfYqBc';

test('should find and interact with buttons', async ({ page }) => {
  page.on('console', msg => console.log(`[${msg.type()}]`, msg.text()));
  
  await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);
  
  // Check for buttons using class selector
  const buttons = page.locator('.youtldw-button');
  const buttonCount = await buttons.count();
  console.log('Button count:', buttonCount);
  
  if (buttonCount > 0) {
    // Get all button texts
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const isVisible = await button.isVisible();
      const boundingBox = await button.boundingBox();
      
      console.log(`Button ${i}:`, {
        text,
        isVisible,
        boundingBox
      });
    }
    
    // Try to find TL;DW button specifically
    const tldwButton = buttons.filter({ hasText: 'TL;DW' });
    const tldwCount = await tldwButton.count();
    console.log('TL;DW button count:', tldwCount);
    
    if (tldwCount > 0) {
      const isVisible = await tldwButton.first().isVisible();
      console.log('TL;DW button visible:', isVisible);
      
      if (isVisible) {
        // Try clicking it
        await tldwButton.first().click();
        await page.waitForTimeout(3000);
        console.log('Clicked TL;DW button');
      }
    }
    
    // Try to find pencil button
    const pencilButton = buttons.filter({ hasText: '✏️' });
    const pencilCount = await pencilButton.count();
    console.log('Pencil button count:', pencilCount);
  } else {
    // Buttons not found, let's check the DOM structure
    const logoArea = await page.evaluate(() => {
      const logo = document.querySelector('#logo');
      if (logo && logo.parentNode) {
        return {
          logoExists: true,
          parentNode: logo.parentNode.tagName,
          siblings: Array.from(logo.parentNode.children).map(el => ({
            tag: el.tagName,
            class: el.className,
            id: el.id,
            text: el.textContent?.substring(0, 50)
          }))
        };
      }
      return { logoExists: false };
    });
    
    console.log('Logo area structure:', JSON.stringify(logoArea, null, 2));
  }
});

