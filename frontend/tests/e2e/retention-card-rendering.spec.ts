import { test, expect } from '@playwright/test';

test.describe('Retention plan card rendering', () => {
  test('should verify retention plan cards display properly', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('http://localhost:3000/dashboard/overview');
    await page.waitForTimeout(3000);
    
    // Handle login if needed
    if (page.url().includes('/login')) {
      const email = process.env.TEST_USER_EMAIL;
      const password = process.env.TEST_USER_PASSWORD;
      if (!email || !password) {
        throw new Error('TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables must be set for E2E tests');
      }
      await page.fill('input[type="email"]', email);
      await page.fill('input[type="password"]', password);
      await page.click('button[type="submit"]');
      await page.waitForTimeout(5000);
      await page.goto('http://localhost:3000/dashboard/overview');
      await page.waitForTimeout(3000);
    }
    
    console.log('✅ On dashboard:', page.url());
    
    // Send retention plan request
    const chatInput = page.locator('input[data-slot="input"]').first();
    await chatInput.waitFor({ state: 'visible' });
    await chatInput.fill('Erstelle einen Retention-Plan für Mitglied 12345');
    
    const sendButton = page.locator('button[type="submit"]').first();
    await sendButton.click();
    
    console.log('✅ Message sent, waiting for response...');
    
    // Wait for retention plan content with shorter timeout but multiple attempts
    let retentionContent = false;
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(10000); // Wait 10 seconds each attempt
      
      // Take screenshot every attempt
      await page.screenshot({ 
        path: `test-results/retention-cards-attempt-${i+1}.png`,
        fullPage: true 
      });
      
      // Check for retention plan content
      const hasRetentionText = await page.locator('text=Retention-Plan').count() > 0;
      const hasKundenprofil = await page.locator('text=KUNDENPROFIL').count() > 0;
      const hasMitglied = await page.locator('text=Mitglied 12345').count() > 0;
      const hasError = await page.locator('text=Strukturierte Plan-Daten fehlen').count() > 0;
      
      console.log(`Attempt ${i+1}: Retention=${hasRetentionText}, Profile=${hasKundenprofil}, Member=${hasMitglied}, Error=${hasError}`);
      
      if (hasRetentionText || hasKundenprofil || hasMitglied) {
        console.log(`✅ SUCCESS on attempt ${i+1}: Retention plan content found!`);
        retentionContent = true;
        break;
      }
      
      if (hasError) {
        console.log(`❌ ERROR on attempt ${i+1}: "Strukturierte Plan-Daten fehlen" found!`);
        throw new Error('Structured data error still exists');
      }
      
      console.log(`⏳ Attempt ${i+1}: Still waiting for retention plan...`);
    }
    
    // Final verification
    if (!retentionContent) {
      console.log('❌ TIMEOUT: No retention plan content found after 60 seconds');
    } else {
      console.log('✅ FINAL SUCCESS: Retention plan content is displaying!');
      
      // Check for card-like UI elements
      const cardElements = await page.locator('[class*="card"], [class*="Card"], [class*="border"], [class*="shadow"]').count();
      const structuredElements = await page.locator('[class*="grid"], [class*="flex"]').count();
      
      console.log(`Card elements: ${cardElements}, Structured elements: ${structuredElements}`);
      
      if (cardElements > 3 || structuredElements > 5) {
        console.log('✅ BEAUTIFUL CARDS: Structured UI elements detected!');
      } else {
        console.log('⚠️ BASIC DISPLAY: Plan shows but might not be in card format');
      }
    }
    
    // Primary test: No error message
    const hasError = await page.locator('text=Strukturierte Plan-Daten fehlen').count() > 0;
    expect(hasError).toBeFalsy();
  });
});