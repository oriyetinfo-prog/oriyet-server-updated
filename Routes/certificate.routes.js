import express from 'express';
import { generateCertificatePDF, downloadCertificate, generateCertificateWithPuppeteer } from '../Controller/certificate.controller.js';
import { sendCertificateCode, verifyCertificateCode } from '../Controller/certificateVerification.controller.js';

const router = express.Router();

/**
 * POST /api/certificate/generate
 * Generate a certificate PDF
 * Body: { studentName, courseName, completionDate, userId? }
 */
router.post('/generate', generateCertificatePDF);
router.post('/generate-puppeteer', generateCertificateWithPuppeteer);

/**
 * GET /api/certificate/download/:fileName
 * Download a generated certificate
 */
router.get('/download/:fileName', downloadCertificate);

// Certificate collection verification
router.post('/send-code', sendCertificateCode);
router.post('/verify-code', verifyCertificateCode);

export default router;
