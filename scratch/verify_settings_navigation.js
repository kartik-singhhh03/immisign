const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const ARTIFACT_DIR = "C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\9c58fc25-07b1-427c-8038-942752d75d45";

async function run() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(90000);
  await page.setViewport({ width: 1280, height: 900 });

  try {
    console.log("Navigating to login page...");
    await page.goto('http://127.0.0.1:3001/login', { waitUntil: 'domcontentloaded' });
    
    console.log("Checking for developer staging accounts...");
    await page.waitForSelector('input[type="email"]');
    console.log("  ✓ Page loaded. Waiting 3 seconds for React hydration...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const hasStagingAccounts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).some(el => el.innerText && el.innerText.includes('DEVELOPER STAGING ACCOUNTS'));
    });
    
    if (hasStagingAccounts) {
      console.log("  ✓ Staging accounts detected. Clicking Rajwant Singh (Agency Owner)...");
      await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button'));
        const ownerBtn = buttons.find(b => b.innerText && b.innerText.includes('Rajwant Singh'));
        if (ownerBtn) {
          ownerBtn.click();
        } else {
          throw new Error("Could not find Rajwant Singh button in staging accounts");
        }
      });
    } else {
      console.log("  ✓ Standard form login fallback...");
      await page.type('input[type="email"]', 'owner@demoagency.com');
      await page.type('input[type="password"]', 'password123');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const submitBtn = btns.find(b => b.innerText.includes('Continue') || b.type === 'submit');
        if (submitBtn) submitBtn.click();
      });
    }
    
    console.log("Waiting for URL to transition away from /login...");
    await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
    
    // Extract dynamic workspace slug
    const postLoginUrl = page.url();
    const slugMatch = postLoginUrl.match(/\/workspace\/([^\/]+)/);
    if (!slugMatch) {
      throw new Error(`Failed to extract workspace slug from URL: ${postLoginUrl}`);
    }
    const currentSlug = slugMatch[1];
    console.log(`  ✓ Extracted active workspace slug: "${currentSlug}"`);
    
    console.log("Login successful! Navigating to settings page...");
    await page.goto(`http://127.0.0.1:3001/workspace/${currentSlug}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h2'); // The section title element
    
    // Wait for form input fields to hydrate and load
    console.log("  ✓ Waiting for agency profile form hydration...");
    await page.waitForSelector('input[name="name"]', { timeout: 15000 });

    const sectionsToTest = [
      { param: 'Team', expectedTitle: 'Team Setup', file: 'Team.png' },
      { param: 'Branding', expectedTitle: 'Branding', file: 'Branding.png' },
      { param: 'MFA', expectedTitle: 'MFA Security', file: 'MFA.png' },
      { param: 'Profile', expectedTitle: 'My Profile', file: 'Profile.png' },
      { param: 'Agency', expectedTitle: 'Agency Profile', file: 'Agency.png' },
      { param: 'Clauses', expectedTitle: 'Clauses Library', file: 'Clauses.png' },
      { param: 'MatterDefaults', expectedTitle: 'Matter Defaults', file: 'MatterDefaults.png' }
    ];

    console.log("\n--- VERIFYING INDIVIDUAL URL DIRECT LINKS ---");
    for (const sec of sectionsToTest) {
      console.log(`Navigating directly to ?section=${sec.param}...`);
      await page.goto(`http://127.0.0.1:3001/workspace/${currentSlug}/settings?section=${sec.param}`, { waitUntil: 'domcontentloaded' });
      
      // Wait for the specific heading content to verify correct rendering
      await page.waitForFunction(
        (title) => {
          const h2 = document.querySelector('h2');
          return h2 && h2.innerText.includes(title);
        },
        { timeout: 10000 },
        sec.expectedTitle
      );

      const pageHeadingText = await page.evaluate(() => document.querySelector('h2').innerText);
      console.log(`  ✓ Expected: "${sec.expectedTitle}", Actual: "${pageHeadingText}"`);
      
      if (!pageHeadingText.includes(sec.expectedTitle)) {
        throw new Error(`Render mismatch for ?section=${sec.param}. Expected: ${sec.expectedTitle}, got: ${pageHeadingText}`);
      }

      // Save screenshot directly in artifacts directory
      const screenshotPath = path.join(ARTIFACT_DIR, sec.file);
      await page.screenshot({ path: screenshotPath });
      console.log(`  ✓ Screenshot saved: ${screenshotPath}`);
    }

    console.log("Navigating to settings home...");
    await page.goto(`http://127.0.0.1:3001/workspace/${currentSlug}/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h2');
    await page.waitForSelector('input[name="name"]', { timeout: 15000 });

    // Test clicking the Team Setup sidebar item
    console.log("Clicking 'Team Setup' in the sidebar...");
    let sidebarClicked = false;
    const sidebarLinks = await page.$$('a');
    console.log(`Found ${sidebarLinks.length} total links on page. Listing potential settings matches:`);
    for (const link of sidebarLinks) {
      const text = await page.evaluate(el => el.innerText, link);
      const href = await page.evaluate(el => el.getAttribute('href'), link);
      if (text && (text.includes('Team Setup') || text.includes('Team'))) {
        console.log(`  - Match: Text="${text.trim().replace(/\n/g, ' ')}", href="${href}"`);
      }
      if (text && text.includes('Team Setup') && href && href.includes('section=Team')) {
        console.log(`  => Clicking this link: Text="${text.trim()}", href="${href}"`);
        await link.click();
        sidebarClicked = true;
        break;
      }
    }
    if (!sidebarClicked) {
      throw new Error("Sidebar 'Team Setup' link not found natively!");
    }

    // Wait a brief moment for transition/render
    console.log("  ✓ Waiting for h2 selector to render post-click...");
    await page.waitForSelector('h2', { timeout: 10000 });

    // Verify URL, rendered title, and active sidebar classes
    const currentUrl = page.url();
    const activeText = await page.evaluate(() => {
      const h2 = document.querySelector('h2');
      return h2 ? h2.innerText : '';
    });
    const activeSidebarCheck = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a[href*="section="]'));
      const teamLink = links.find(l => l.innerText.includes('Team Setup'));
      // active item should have matching styling classes, e.g. containing bg-[#0D9F8C]
      return teamLink ? teamLink.className.includes('bg-[#0D9F8C]') : false;
    });

    console.log(`  URL Updated to: ${currentUrl}`);
    console.log(`  Rendered component title: ${activeText}`);
    console.log(`  Sidebar active state: ${activeSidebarCheck ? 'ACTIVE (bg-[#0D9F8C])' : 'INACTIVE'}`);

    if (!currentUrl.includes('section=Team')) {
      throw new Error(`URL did not update correctly after click: ${currentUrl}`);
    }
    if (!activeText.includes('Team Setup')) {
      throw new Error(`Component did not update correctly after click: ${activeText}`);
    }
    if (!activeSidebarCheck) {
      throw new Error("Sidebar element active styling class was not applied!");
    }

    console.log("\n✓ All settings E2E navigation verifications passed successfully!");
    console.log("VERIFICATION RESULT: PASS");
    await browser.close();
    process.exit(0);
  } catch (err) {
    console.error("\nE2E Verification Failed:", err.message);
    const errorScreenshot = path.join(ARTIFACT_DIR, 'settings_e2e_error.png');
    await page.screenshot({ path: errorScreenshot });
    console.log(`Error screenshot saved to: ${errorScreenshot}`);
    console.log("VERIFICATION RESULT: FAIL");
    await browser.close();
    process.exit(1);
  }
}

run();
