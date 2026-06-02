const puppeteer = require('puppeteer');

async function run() {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  try {
    console.log("Navigating to login...");
    await page.goto('http://localhost:3000/login');
    
    // Login as owner (using the seed user from previous tests)
    await page.waitForSelector('input[type="email"]');
    await page.type('input[type="email"]', 'owner@demoagency.com');
    await page.type('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    console.log("Waiting for dashboard...");
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    
    console.log("Navigating to Settings...");
    await page.goto('http://localhost:3000/workspace/demo-agency/settings');
    await page.waitForSelector('h2'); // The section title
    
    // Verify tabs exist
    const texts = await page.evaluate(() => document.body.innerText);
    if (!texts.includes("Agency Profile")) throw new Error("Missing Agency Profile");
    if (!texts.includes("Branding")) throw new Error("Missing Branding");
    if (!texts.includes("Team Setup")) throw new Error("Missing Team Setup");
    if (!texts.includes("Clauses Library")) throw new Error("Missing Clauses Library");
    if (!texts.includes("Matter Defaults")) throw new Error("Missing Matter Defaults");

    console.log("Settings tabs visible. Testing Team Setup...");
    await page.goto('http://localhost:3000/workspace/demo-agency/settings?section=Team');
    await page.waitForSelector('table'); // Team table
    
    const teamText = await page.evaluate(() => document.body.innerText);
    if (!teamText.includes("Invite Practitioner")) throw new Error("Missing Invite button");

    console.log("Opening invite modal...");
    await page.evaluate(() => {
       const btns = Array.from(document.querySelectorAll('button'));
       const inviteBtn = btns.find(b => b.innerText.includes('Invite Practitioner'));
       if (inviteBtn) inviteBtn.click();
    });

    await page.waitForSelector('input[type="email"]'); // Modal opened

    console.log("Settings module E2E verification passed!");
    await browser.close();
  } catch (err) {
    console.error("E2E Failed:", err.message);
    await page.screenshot({ path: 'settings_e2e_error.png' });
    await browser.close();
    process.exit(1);
  }
}

run();
