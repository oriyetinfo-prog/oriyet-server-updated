import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function renderTemplate(template, data = {}) {
  // Simple placeholder replacement: {{key}}
  return template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    return data[key] !== undefined ? String(data[key]) : '';
  });
}

export async function generateCertificateBuffer(data = {}) {
  // Load HTML template
  const templatePath = path.join(__dirname, '..', 'templates', 'certificate.html');
  const template = await fsPromises.readFile(templatePath, 'utf8');

  const html = renderTemplate(template, data);

  // Helper to find a local Chrome/Edge executable (Windows common locations / env vars)
  function findLocalChrome() {
    const candidates = [];
    if (process.env.PUPPETEER_EXECUTABLE_PATH) candidates.push(process.env.PUPPETEER_EXECUTABLE_PATH);
    if (process.env.CHROME_PATH) candidates.push(process.env.CHROME_PATH);
    // Windows Program Files paths
    const pf = process.env.PROGRAMFILES || 'C:\\Program Files';
    const pf86 = process.env['PROGRAMFILES(X86)'] || 'C:\\Program Files (x86)';
    const localApp = process.env.LOCALAPPDATA || (process.env.USERPROFILE ? path.join(process.env.USERPROFILE, 'AppData', 'Local') : null);
    candidates.push(path.join(pf, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    candidates.push(path.join(pf86, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    if (localApp) candidates.push(path.join(localApp, 'Google', 'Chrome', 'Application', 'chrome.exe'));
    // Microsoft Edge as alternative
    candidates.push(path.join(pf, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));
    candidates.push(path.join(pf86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'));

    for (const p of candidates) {
      if (!p) continue;
      try {
        if (fs.existsSync(p)) return p;
      } catch (e) {
        // ignore
      }
    }
    return null;
  }

  // Try launching puppeteer normally; if it fails because Chromium isn't available, try local Chrome
  let browser = null;
  const launchArgs = { args: ['--no-sandbox', '--disable-setuid-sandbox'] };
  try {
    browser = await puppeteer.launch(launchArgs);
  } catch (err) {
    const local = findLocalChrome();
    if (local) {
      try {
        browser = await puppeteer.launch({ ...launchArgs, executablePath: local });
      } catch (err2) {
        // surface the original error with extra hint
        err.message += `\nAlso attempted to launch local Chrome at ${local} but failed: ${err2.message}`;
        throw err;
      }
    } else {
      // no local chrome found — add helpful guidance
      err.message += '\nNo bundled Chromium found and no local Chrome/Edge executable detected.\n' +
        'Options:\n' +
        "  - Install chromium for puppeteer: `npx puppeteer install chrome`\n" +
        "  - Or set environment variable `PUPPETEER_EXECUTABLE_PATH` to your browser executable path\n" +
        "  - Or install a full `puppeteer` package that downloads Chromium (ensure npm install completed)";
      throw err;
    }
  }

  try {
    const page = await browser.newPage();

    // Set a reasonable viewport for A4 landscape
    await page.setViewport({ width: 1123, height: 794 });

    // Set content and wait until no network activity
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // Allow time for fonts/images to load
    await page.evaluate(() => document.fonts && document.fonts.ready);

    const pdfBuffer = await page.pdf({ format: 'A4', landscape: true, printBackground: true });
    await page.close();
    return pdfBuffer;

  } finally {
    try { if (browser) await browser.close(); } catch (e) { /* ignore */ }
  }
}

export default generateCertificateBuffer;
