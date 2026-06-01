import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import os from 'os';

export class PDFService {
  /**
   * Generates a PDF buffer from an HTML string using Serverless-compatible Chromium.
   * On local development environments, it falls back to the native OS Chrome installation.
   */
  static async generatePdf(html: string): Promise<Buffer> {
    const isLocal = process.env.NODE_ENV === 'development' || !process.env.VERCEL_ENV;
    
    let executablePath = null;
    if (isLocal) {
      if (os.platform() === 'win32') {
        executablePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
      } else if (os.platform() === 'darwin') {
        executablePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
      } else {
        executablePath = '/usr/bin/google-chrome';
      }
    } else {
      executablePath = await chromium.executablePath();
    }

    const browser = await puppeteer.launch({
      args: isLocal ? [] : (await chromium.args) as any,
      defaultViewport: isLocal ? { width: 1200, height: 800 } : ((chromium as any).defaultViewport as any),
      executablePath: executablePath,
      headless: isLocal ? true : ((chromium as any).headless as any),
    });

    const page = await browser.newPage();
    
    // Using networkidle0 to ensure images/fonts are loaded before printing
    await page.setContent(html, { waitUntil: 'networkidle0' as any });
    
    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();
    return Buffer.from(pdfUint8Array);
  }
}
