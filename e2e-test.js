const puppeteer = require('puppeteer');
const fs = require('fs');

async function clickByText(page, text, tag = 'button') {
    const clicked = await page.evaluate((text, tag) => {
        const elements = Array.from(document.querySelectorAll(tag));
        const element = elements.find(el => el.textContent.includes(text));
        if (element) {
            element.click();
            return true;
        }
        return false;
    }, text, tag);
    if (!clicked) {
        throw new Error(`Element with text "${text}" not found`);
    }
}

async function waitForText(page, text, timeout = 25000) {
    await page.waitForFunction((t) => {
        const elms = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, a, label, div'));
        const element = elms.find(el => {
            const txt = el.innerText || '';
            return txt.includes(t) && el.offsetHeight > 0;
        });
        return !!element;
    }, { timeout }, text);
}

(async () => {
    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });

    page.on('console', msg => {
        const txt = msg.text();
        if (!txt.includes('[React DevTools]') && !txt.includes('Fast Refresh')) {
            console.log('[BROWSER CONSOLE]', txt);
        }
    });
    page.on('pageerror', err => console.error('[BROWSER ERROR]', err.message));
    page.on('dialog', async dialog => {
        console.warn(`[BROWSER DIALOG] ${dialog.type()}: ${dialog.message()}`);
        await dialog.dismiss();
    });

    const log = (msg) => console.log(`[E2E] ${msg}`);

    try {
        log("Navigating to login page...");
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });

        log("Logging in as owner@demoagency.com via Quick Login...");
        await page.click('text/Rajwant Singh');
        
        // Wait for dashboard to load
        log("Waiting for dashboard...");
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 }).catch(() => log("Navigation timeout, checking URL anyway"));
        
        // Wait for a dashboard element instead of navigation event, as Next.js uses client-side routing with a delay
        await page.waitForFunction(() => window.location.href.includes('/dashboard'), { timeout: 30000 });
        await page.waitForSelector('text/Good day', { timeout: 10000 });
        
        const currentUrl = page.url();
        const slugMatch = currentUrl.match(/\/workspace\/([^/]+)\/dashboard/);
        const dynamicSlug = slugMatch ? slugMatch[1] : "avc-migration";
        log(`Resolved dynamic workspace slug: ${dynamicSlug}`);
        log("URL is now: " + currentUrl);

        // Create Client
        log("Navigating to Clients via sidebar...");
        await clickByText(page, 'Clients', 'a');
        await new Promise(r => setTimeout(r, 2000));
        
        log("Opening Create Client Dialog...");
        await waitForText(page, 'Client relationship workspace', 15000);
        await clickByText(page, 'New client');
        await page.waitForSelector('input[placeholder="e.g. Manpreet Sodhi"]', { visible: true });
        
        const clientName = `E2E Client ${Date.now()}`;
        log(`Filling Create Client Form with name: ${clientName}`);
        await page.type('input[placeholder="e.g. Manpreet Sodhi"]', clientName);
        await page.type('input[type="email"]', 'e2e@example.com');
        await clickByText(page, 'Save Client Profile');
        
        log("Waiting for client creation...");
        await waitForText(page, clientName);
        log("Client created successfully!");

        // Create Agreement
        log("Navigating to Agreements List via sidebar...");
        await clickByText(page, 'Agreements', 'a');
        log("Waiting for Agreements page to load...");
        await waitForText(page, 'Agreement workspace', 25000);
        log("Clicking New Agreement Button...");
        await clickByText(page, 'New Agreement', 'a');
        await new Promise(r => setTimeout(r, 2000));
        
        log("Filling Agreement Wizard...");
        await waitForText(page, 'Client Name (Large Clean Input)', 45000);
        const inputClientName = await page.evaluateHandle(() => {
            const labels = Array.from(document.querySelectorAll('label'));
            const label = labels.find(l => l.textContent.includes('Client Name'));
            return label ? label.querySelector('input') : null;
        });
        await inputClientName.click({ clickCount: 3 });
        await inputClientName.type(clientName);
 
        await clickByText(page, 'Continue to Matter Details');
        await new Promise(r => setTimeout(r, 500));
        await clickByText(page, 'Continue to Fees');
        await new Promise(r => setTimeout(r, 500));
        await clickByText(page, 'Continue to Terms');
        await new Promise(r => setTimeout(r, 500));
        await clickByText(page, 'Generate Preview');
        await new Promise(r => setTimeout(r, 500));
        await clickByText(page, 'Proceed to Dispatches');
        await new Promise(r => setTimeout(r, 500));
        await clickByText(page, 'Generate & Dispatch Agreement');
        
        log("Waiting for dispatch...");
        await waitForText(page, 'Agreement Dispatched!', 25000);
        log("Agreement dispatched successfully!");

        // Upload Document
        log("Navigating to Send Document via sidebar...");
        await clickByText(page, 'Send Document', 'a');
        log("Waiting for Send Document page to load...");
        await waitForText(page, 'Upload Custom Agreement', 25000);
        
        log("Selecting Custom Agreement Upload...");
        await clickByText(page, 'Upload Custom Agreement', 'h3');
        await new Promise(r => setTimeout(r, 1000));

        log("Uploading a dummy file...");
        fs.writeFileSync('dummy_test_file.pdf', 'Dummy PDF Content For E2E Validation');
        
        const [fileChooser] = await Promise.all([
            page.waitForFileChooser(),
            clickByText(page, 'Choose File')
        ]);
        await fileChooser.accept(['dummy_test_file.pdf']);

        await new Promise(r => setTimeout(r, 1000));
        await clickByText(page, 'Assign Signers');
        await new Promise(r => setTimeout(r, 500));
        
        // Let default signers be used, just click through
        await clickByText(page, 'Email Customise');
        await new Promise(r => setTimeout(r, 500));
        await clickByText(page, 'Review Packet');
        await new Promise(r => setTimeout(r, 500));
        await clickByText(page, 'Sign & Dispatch to Recipients');
        
        log("Waiting for document dispatch...");
        await waitForText(page, 'Document Dispatched Securely', 15000);
        log("Document uploaded and dispatched successfully!");

        // Verify Document Library
        log("Navigating to Document Library via sidebar...");
        await clickByText(page, 'Document Library', 'a');
        log("Waiting for Document Library page to load...");
        await waitForText(page, 'Vault Custody Storage', 25000);
        await waitForText(page, 'dummy_test_file.pdf', 10000);
        log("Document library shows the uploaded file.");

        // Refresh and Verify
        log("Refreshing the browser...");
        await page.reload({ waitUntil: 'networkidle2' });
        await waitForText(page, 'dummy_test_file.pdf', 10000);
        log("Persistence confirmed after refresh.");

        // Logout & Login
        log("Logging out (clearing cookies)...");
        const cookies = await page.cookies();
        await page.deleteCookie(...cookies);
        await page.goto('http://localhost:3000/login', { waitUntil: 'networkidle2' });
        
        log("Logging back in...");
        await page.type('input[type="email"]', 'testowner_1780228890060@demoagency.com');
        await page.type('input[type="password"]', 'password123');
        await page.click('button[type="submit"]');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });

        log("Navigating to Clients again via sidebar...");
        await clickByText(page, 'Clients', 'a');
        log("Waiting for Clients page to load...");
        await waitForText(page, 'Client relationship workspace', 25000);
        await waitForText(page, clientName, 10000);
        log("Client persistence confirmed after re-login.");

        log("✅ E2E TEST COMPLETED SUCCESSFULLY!");
        
    } catch (err) {
        console.error("❌ E2E TEST FAILED:", err);
        log("URL at failure: " + page.url());
        try {
            await page.screenshot({ path: 'C:/Users/Lenovo/.gemini/antigravity-ide/html_artifacts/failure.png', fullPage: true });
            fs.writeFileSync('C:/Users/Lenovo/.gemini/antigravity-ide/html_artifacts/failure.html', await page.content());
            log("Saved failure screenshot and HTML to html_artifacts!");
        } catch (e) {
            console.error("Could not capture screenshot/HTML:", e.message);
        }
        process.exit(1);
    } finally {
        await browser.close();
        if (fs.existsSync('dummy_test_file.pdf')) {
            fs.unlinkSync('dummy_test_file.pdf');
        }
    }
})();
