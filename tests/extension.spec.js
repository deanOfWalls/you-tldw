import { test, expect } from '@playwright/test';

const YOUTUBE_VIDEO_URL = 'https://www.youtube.com/watch?v=aDbtrdfYqBc';

test.describe('YouTLDW Extension', () => {
  test.beforeEach(async ({ page, context }) => {
    // Enable console logging
    page.on('console', msg => console.log('Browser console:', msg.text()));
    page.on('pageerror', error => console.log('Page error:', error.message));
  });

  test('should display TL;DW and pencil buttons on YouTube video page', async ({ page }) => {
    await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
    
    // Wait for the page to fully load
    await page.waitForTimeout(3000);
    
    // Look for the TL;DW button
    const tldwButton = page.locator('button:has-text("TL;DW")');
    await expect(tldwButton).toBeVisible({ timeout: 10000 });
    
    // Look for the pencil button (emoji)
    const pencilButton = page.locator('button:has-text("✏️")');
    await expect(pencilButton).toBeVisible({ timeout: 10000 });
    
    console.log('✓ Buttons are visible');
  });

  test('should open transcript when TL;DW button is clicked', async ({ page, context }) => {
    await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Click the TL;DW button
    const tldwButton = page.locator('button:has-text("TL;DW")');
    await tldwButton.click();
    
    // Wait for transcript to appear (either already visible or after clicking Show transcript)
    await page.waitForTimeout(5000);
    
    // Check if transcript container exists
    const transcriptContainer = page.locator('ytd-transcript-renderer');
    const transcriptVisible = await transcriptContainer.isVisible().catch(() => false);
    
    console.log('Transcript container visible:', transcriptVisible);
    
    // Check for transcript segments
    const segments = page.locator('ytd-transcript-segment-list-renderer .segment');
    const segmentCount = await segments.count();
    console.log('Transcript segments found:', segmentCount);
    
    if (segmentCount === 0) {
      // Try clicking "Show transcript" button if it exists
      const showTranscriptButton = page.locator('button[aria-label="Show transcript"]');
      if (await showTranscriptButton.isVisible().catch(() => false)) {
        console.log('Clicking "Show transcript" button...');
        await showTranscriptButton.click();
        await page.waitForTimeout(3000);
        
        const segmentCountAfter = await segments.count();
        console.log('Transcript segments after clicking:', segmentCountAfter);
      }
    }
  });

  test('should show custom prompt modal when pencil button is clicked', async ({ page }) => {
    await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Click the pencil button
    const pencilButton = page.locator('button:has-text("✏️")');
    await pencilButton.click();
    
    // Wait for modal to appear
    await page.waitForTimeout(1000);
    
    // Check for the custom prompt modal
    const modal = page.locator('.custom-prompt-modal, input[placeholder*="Enter your custom instructions"]');
    await expect(modal).toBeVisible({ timeout: 5000 });
    
    // Check for input field
    const input = page.locator('input[placeholder*="Enter your custom instructions"]');
    await expect(input).toBeVisible();
    
    // Check for submit button
    const submitButton = page.locator('button:has-text("Submit")');
    await expect(submitButton).toBeVisible();
    
    console.log('✓ Custom prompt modal is visible');
    
    // Test entering a custom prompt
    await input.fill('Test custom prompt');
    await submitButton.click();
    
    // Wait a bit to see if transcript opens
    await page.waitForTimeout(5000);
  });

  test('should send transcript to ChatGPT when TL;DW is clicked', async ({ page, context }) => {
    // Listen for new pages (tabs)
    const newPagePromise = context.waitForEvent('page', { timeout: 30000 });
    
    await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Click the TL;DW button
    const tldwButton = page.locator('button:has-text("TL;DW")');
    await tldwButton.click();
    
    // Wait for ChatGPT tab to open
    const newPage = await newPagePromise;
    console.log('New page opened:', newPage.url());
    
    // Wait for ChatGPT page to load
    await newPage.waitForLoadState('networkidle');
    await newPage.waitForTimeout(5000);
    
    // Check if we're on ChatGPT
    const url = newPage.url();
    expect(url).toMatch(/chatgpt\.com|chat\.openai\.com/);
    
    console.log('✓ ChatGPT page opened');
    
    // Check if text was inserted into the textarea
    const textarea = newPage.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });
    
    const textareaValue = await textarea.inputValue();
    console.log('Textarea value length:', textareaValue.length);
    console.log('Textarea value preview:', textareaValue.substring(0, 200));
    
    // Check if transcript content is present
    expect(textareaValue.length).toBeGreaterThan(0);
  });

  test('should handle transcript extraction flow', async ({ page }) => {
    await page.goto(YOUTUBE_VIDEO_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    
    // Check if transcript is already visible
    let transcriptContainer = page.locator('ytd-transcript-renderer');
    let transcriptVisible = await transcriptContainer.isVisible().catch(() => false);
    
    if (!transcriptVisible) {
      console.log('Transcript not visible, looking for "Show transcript" button...');
      
      // Try to find and click "Show transcript" button
      const showTranscriptButton = page.locator('button[aria-label="Show transcript"]');
      const showButtonVisible = await showTranscriptButton.isVisible().catch(() => false);
      
      if (showButtonVisible) {
        console.log('Found "Show transcript" button, clicking...');
        await showTranscriptButton.click();
        await page.waitForTimeout(3000);
      } else {
        // Try clicking the "More" button (expand button)
        const moreButton = page.locator('#expand');
        const moreButtonVisible = await moreButton.isVisible().catch(() => false);
        
        if (moreButtonVisible) {
          console.log('Found "More" button, clicking...');
          await moreButton.click();
          await page.waitForTimeout(2000);
          
          // Now try to find and click "Show transcript"
          const transcriptButtonAfter = page.locator('button[aria-label="Show transcript"]');
          if (await transcriptButtonAfter.isVisible().catch(() => false)) {
            await transcriptButtonAfter.click();
            await page.waitForTimeout(3000);
          }
        }
      }
    }
    
    // Check for transcript segments
    const segments = page.locator('ytd-transcript-segment-list-renderer .segment');
    const segmentCount = await segments.count();
    
    console.log('Final transcript segment count:', segmentCount);
    
    if (segmentCount > 0) {
      // Get the first few segments to verify content
      const firstSegment = segments.first();
      const firstSegmentText = await firstSegment.textContent();
      console.log('First segment text:', firstSegmentText);
    }
  });
});

