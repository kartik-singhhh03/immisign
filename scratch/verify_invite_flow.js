const puppeteer = require('puppeteer');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = "C:\\Users\\Lenovo\\.gemini\\antigravity-ide\\brain\\9c58fc25-07b1-427c-8038-942752d75d45";

// Load Environment Variables
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="?(.*)"?$/);
  if (match) {
    let val = match[2].trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    process.env[match[1]] = val;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, anonKey);

async function run() {
  console.log("Launching Puppeteer Browser...");
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  page.on('console', msg => console.log(`  [BROWSER CONSOLE] ${msg.type().toUpperCase()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`  [BROWSER ERROR] ${err.toString()}`));
  page.setDefaultNavigationTimeout(90000);
  await page.setViewport({ width: 1280, height: 950 });

  const testEmail = `practitioner.${Date.now()}@gmail.com`;
  const testName = `Priya Mehta (E2E)`;
  const testPassword = `SecurePassword123!`;
  let inviteToken = null;

  try {
    // 1. Login
    console.log("\n--- STEP 1: LOGGING IN AS OWNER ---");
    await page.goto('http://127.0.0.1:3001/login', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('input[type="email"]');
    console.log("  ✓ Page loaded. Waiting 3 seconds for React hydration...");
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const hasStagingAccounts = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('*')).some(el => el.innerText && el.innerText.includes('DEVELOPER STAGING ACCOUNTS'));
    });
    
    if (hasStagingAccounts) {
      console.log("  ✓ Staging accounts detected. Clicking Rajwant Singh (Agency Owner)...");
      let clicked = false;
      const buttons = await page.$$('button');
      for (const btn of buttons) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text && text.includes('Rajwant Singh')) {
          await btn.click();
          clicked = true;
          break;
        }
      }
      if (!clicked) throw new Error("Could not find and click Rajwant Singh card");
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
    console.log("  ✓ Form submitted. Waiting for URL to transition away from /login...");
    
    // Wait until router redirect is complete
    await page.waitForFunction(() => !window.location.href.includes('/login'), { timeout: 15000 });
    
    const postLoginUrl = page.url();
    console.log(`  Current URL after login: ${postLoginUrl}`);
    const slugMatch = postLoginUrl.match(/\/workspace\/([^\/]+)/);
    if (!slugMatch) {
      throw new Error(`Failed to extract workspace slug from URL: ${postLoginUrl}`);
    }
    const currentSlug = slugMatch[1];
    console.log(`  ✓ Extracted active workspace slug: "${currentSlug}"`);

    // 2. Navigate to Settings -> Team Setup
    console.log("\n--- STEP 2: NAVIGATING TO SETTINGS TEAM SETUP ---");
    await page.goto(`http://127.0.0.1:3001/workspace/${currentSlug}/settings?section=Team`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('h2');
    
    // Wait for dynamic table hydration
    console.log("  ✓ Waiting for team table rows to render...");
    await page.waitForSelector('table tbody tr', { timeout: 15000 });
    
    const settingsHeading = await page.evaluate(() => document.querySelector('h2').innerText);
    console.log(`  ✓ Landed on Settings. Current Title: "${settingsHeading}"`);
    
    // Save settings home screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'settings_team_tab.png') });
    console.log("  ✓ Team Setup tab screenshot saved.");

    // 3. Open Invite Modal
    console.log("\n--- STEP 3: OPENING INVITATION MODAL ---");
    let inviteClicked = false;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const teamPageButtons = await page.$$('button');
        for (const btn of teamPageButtons) {
          const text = await page.evaluate(el => el.innerText, btn);
          if (text && text.includes('Invite Practitioner')) {
            await btn.click();
            inviteClicked = true;
            break;
          }
        }
        if (inviteClicked) break;
      } catch (e) {
        console.log(`  [Retry Warning] Detached node encountered on attempt ${attempt + 1}. Retrying click...`);
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }
    if (!inviteClicked) {
      throw new Error("Could not find 'Invite Practitioner' button natively");
    }

    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    console.log("  ✓ Invitation modal opened successfully.");

    // Fill invitation details
    await page.type('input[placeholder="e.g. Priya Mehta"]', testName);
    await page.type('input[placeholder="e.g. priya@avcmigration.com.au"]', testEmail);
    await page.type('input[placeholder="e.g. 2189402"]', '5689231');

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'invite_modal_filled.png') });
    console.log("  ✓ Invitation details entered. Screenshot saved.");

    // 4. Click Send Invite Link (Verify No Page Crash)
    console.log("\n--- STEP 4: SENDING INVITATION (CRASH CHECK) ---");
    
    // Intercept API response to print logs and extract token natively
    page.on('response', async (response) => {
      if (response.url().includes('/api/team/invite')) {
        console.log(`  [API Response Status] /api/team/invite -> ${response.status()}`);
        try {
          const json = await response.json();
          console.log("  [API Response JSON]", JSON.stringify(json));
          if (json.success && json.invite && json.invite.token) {
            inviteToken = json.invite.token;
            console.log(`  ✓ Successfully intercepted invitation token: ${inviteToken}`);
          }
        } catch (_) {}
      }
    });

    // Click "Send Invite Link"
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sendBtn = btns.find(b => b.innerText.includes('Send Invite Link'));
      if (sendBtn) sendBtn.click();
      else throw new Error("Could not find 'Send Invite Link' button");
    });

    console.log("  ✓ Clicked 'Send Invite Link'. Waiting for processing...");
    
    // Wait for modal to close (or toast to appear) and verify page didn't crash
    await new Promise(resolve => setTimeout(resolve, 4000));

    const checkCrash = await page.evaluate(() => {
      return document.body.innerText.includes("Something went wrong");
    });

    if (checkCrash) {
      throw new Error("SETTINGS PAGE CRASHED! Error Boundary triggered.");
    }
    console.log("  ✓ Success! Settings page did NOT crash.");

    // Check success toast or pending list updates
    const pageText = await page.evaluate(() => document.body.innerText);
    const toastCheck = pageText.includes("invitation sent");
    const emailInPending = pageText.includes(testEmail);

    console.log(`  ✓ Toast displayed check: ${toastCheck ? 'YES' : 'NO'}`);
    console.log(`  ✓ New email in Pending list check: ${emailInPending ? 'YES' : 'NO'}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'invite_success_result.png') });
    console.log("  ✓ Invitation result screenshot saved.");

    // 5. Retrieve Token from intercepted network response
    console.log("\n--- STEP 5: RETRIEVING TOKEN FROM INTERCEPTED API PAYLOAD ---");
    for (let i = 0; i < 20; i++) {
      if (inviteToken) break;
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!inviteToken) {
      throw new Error(`Failed to intercept invitation token from network response for ${testEmail}`);
    }

    const token = inviteToken;
    console.log(`  ✓ Using intercepted token: ${token}`);

    // 6. Navigate to Invitation Page
    console.log("\n--- STEP 6: NAVIGATING TO INVITATION ACCEPT URL ---");
    const inviteUrl = `http://127.0.0.1:3001/invite/${token}`;
    await page.goto(inviteUrl);
    await page.waitForSelector('input[placeholder="Jane Doe"]');

    const formText = await page.evaluate(() => document.body.innerText);
    if (!formText.includes("Create Account & Join")) {
      throw new Error("Invite Accept form did not render correctly.");
    }
    console.log("  ✓ Invite Accept form rendered perfectly.");
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'invite_accept_page.png') });
    console.log("  ✓ Invite Accept page screenshot saved.");

    // 7. Complete Password Setup
    console.log("\n--- STEP 7: SETTING UP PRACTITIONER PASSWORD & JOINING ---");
    await page.type('input[placeholder="Jane Doe"]', testName);
    await page.type('input[placeholder="••••••••"]', testPassword);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'invite_accept_form_filled.png') });
    
    // Submit form and wait for redirect to dashboard
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 45000 })
    ]);

    const postJoinUrl = page.url();
    console.log(`  ✓ Redirected URL: ${postJoinUrl}`);

    const dashboardText = await page.evaluate(() => document.body.innerText);
    console.log(`  ✓ Dashboard displays client list or greeting: ${dashboardText.includes('Dashboard') || dashboardText.includes('Agreements') ? 'YES' : 'NO'}`);

    await page.screenshot({ path: path.join(ARTIFACT_DIR, 'dashboard_post_invite_login.png') });
    console.log("  ✓ Dashboard landing screenshot saved.");

    if (!postJoinUrl.includes('/dashboard')) {
      throw new Error(`Login redirection failed after accepting invite. URL is: ${postJoinUrl}`);
    }

    console.log("\n=============================================");
    console.log("★ E2E INVITATION FLOW VERIFICATION: PASS ★");
    console.log("=============================================");
    await browser.close();
    process.exit(0);

  } catch (err) {
    console.error("\nE2E Invite Flow Failed:", err.message);
    const errorScreenshot = path.join(ARTIFACT_DIR, 'invite_e2e_error.png');
    await page.screenshot({ path: errorScreenshot });
    console.log(`Error screenshot saved to: ${errorScreenshot}`);
    console.log("VERIFICATION RESULT: FAIL");
    await browser.close();
    process.exit(1);
  }
}

run();
