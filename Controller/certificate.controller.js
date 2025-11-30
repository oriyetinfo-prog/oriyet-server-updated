import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateCertificateBuffer } from '../utils/generateCertificate.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Basic HTML escape to prevent simple injection in template
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Generate Certificate PDF using server-side HTML template + Puppeteer
 * Returns PDF directly as response (Content-Type: application/pdf)
 */
export const generateCertificatePDF = async (req, res) => {
  try {
    const {
      studentName,
      courseName,
      completionDate,
      userId,
      issuer1_name,
      issuer1_title,
      issuer1_org,
      issuer2_name,
      issuer2_title,
      issuer2_org,
    } = req.body || {};

    // Input validation (basic)
    if (!studentName || !courseName || !completionDate) {
      return res.status(400).json({ success: false, message: 'Missing required fields: studentName, courseName, completionDate' });
    }

    // Build data object for template (escape values)
    const data = {
      studentName: escapeHtml(studentName),
      courseName: escapeHtml(courseName),
      completionDate: escapeHtml(completionDate),
      issuer1_name: escapeHtml(issuer1_name || ''),
      issuer1_title: escapeHtml(issuer1_title || ''),
      issuer1_org: escapeHtml(issuer1_org || ''),
      issuer2_name: escapeHtml(issuer2_name || ''),
      issuer2_title: escapeHtml(issuer2_title || ''),
      issuer2_org: escapeHtml(issuer2_org || ''),
      generatedAt: new Date().toLocaleString(),
      userId: escapeHtml(userId || 'user')
    };

    // Generate PDF buffer
    const pdfBuffer = await generateCertificateBuffer(data);

    // Send PDF as direct response
    const fileName = `Certificate_${data.studentName.replace(/\s+/g, '_') || data.userId}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    return res.status(200).send(pdfBuffer);

  } catch (error) {
    console.error('Certificate generation (server) error:', error);
    return res.status(500).json({ success: false, message: 'Failed to generate certificate', error: error.message });
  }
};

/**
 * Generate Certificate PDF using Puppeteer (render client route and print to PDF)
 */
export const generateCertificateWithPuppeteer = async (req, res) => {
  // Keep existing client-render approach as fallback; recommend calling server-side `generateCertificatePDF` for direct PDF responses.
  try {
    return await generateCertificatePDF(req, res);
  } catch (error) {
    console.error('Fallback puppeteer error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Download Certificate PDF
 */
export const downloadCertificate = async (req, res) => {
  try {
    const { fileName } = req.params;

    // Validate fileName to prevent path traversal
    if (!fileName || fileName.includes('..') || fileName.includes('/')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file name'
      });
    }

    const tempDir = path.join(__dirname, '../temp');
    const filePath = path.join(tempDir, fileName);

    // Verify file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'Certificate file not found'
      });
    }

    // Send file
    res.download(filePath, `Certificate_${Date.now()}.pdf`, (err) => {
      if (err) {
        console.error('Download error:', err);
      }

      // Delete file after download (optional)
      setTimeout(() => {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }, 1000);
    });

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download certificate',
      error: error.message
    });
  }
};
