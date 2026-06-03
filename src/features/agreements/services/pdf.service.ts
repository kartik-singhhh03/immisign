import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import fs from 'fs';
import os from 'os';
import path from 'path';

chromium.setGraphicsMode = false;

function isLocalEnvironment(): boolean {
  return process.env.NODE_ENV === 'development' || !process.env.VERCEL;
}

function resolveLocalChromePath(): string {
  if (os.platform() === 'win32') {
    return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  }
  if (os.platform() === 'darwin') {
    return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  }
  return '/usr/bin/google-chrome';
}

async function resolveChromiumExecutablePath(): Promise<string> {
  // Vercel/Lambda: use package default — custom paths break when only chromium.br is bundled
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    const exe = await chromium.executablePath();
    console.log('PDF_CHROMIUM_VERCEL', { resolved: Boolean(exe) });
    return exe;
  }

  const binCandidates = [
    path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'bin'),
    path.join(process.cwd(), 'node_modules', '@sparticuz', 'chromium', 'build'),
  ];

  for (const binDir of binCandidates) {
    if (fs.existsSync(binDir)) {
      console.log('PDF_CHROMIUM_BIN_FOUND', binDir);
      return chromium.executablePath(binDir);
    }
  }

  return chromium.executablePath();
}

let pdfGenerationChain: Promise<unknown> = Promise.resolve();

export class PDFService {
  /**
   * Generates a PDF buffer from an HTML string using Serverless-compatible Chromium.
   * On local development environments, it falls back to the native OS Chrome installation.
   * Serialized to avoid ETXTBSY when multiple PDFs are generated concurrently.
   */
  static async generatePdf(html: string): Promise<Buffer> {
    const run = () => PDFService.generatePdfInternal(html);
    const task = pdfGenerationChain.then(run, run);
    pdfGenerationChain = task.then(() => undefined, () => undefined);
    return task;
  }

  private static async generatePdfInternal(html: string): Promise<Buffer> {
    const isLocal = isLocalEnvironment();

    const executablePath = isLocal
      ? resolveLocalChromePath()
      : await resolveChromiumExecutablePath();

    console.log('PDF_LAUNCH_CONFIG', {
      isLocal,
      executablePath: isLocal ? executablePath : '[chromium-resolved]',
      vercel: Boolean(process.env.VERCEL),
    });

    const browser = await puppeteer.launch({
      args: isLocal ? ['--no-sandbox', '--disable-setuid-sandbox'] : chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfUint8Array = await page.pdf({
        format: 'A4',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '12mm', right: '14mm', bottom: '16mm', left: '14mm' },
      });

      return Buffer.from(pdfUint8Array);
    } finally {
      await browser.close();
    }
  }
}
