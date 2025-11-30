// paymentController.js
import axios from 'axios';
import crypto from 'crypto';
import { PrismaClient } from '../generated/prisma/index.js';
import { sendDetailsEmail } from '../utils/sendDetailesEmail.js';
import logger from '../utils/logger.js';

const prisma = new PrismaClient();

// Env vars
// Production: set UDDOKTA_BASE to production base URL and UDDOKTA_API_KEY to production key.
// For sandbox testing set UDDOKTA_SANDBOX_URL or leave UDDOKTA_BASE to sandbox URL.
const UDDOKTA_BASE = process.env.UDDOKTA_BASE || process.env.UDDOKTA_SANDBOX_URL || 'https://sandbox.uddoktapay.com';
const UDDOKTA_API_KEY = process.env.UDDOKTA_API_KEY;
const CLIENT_BASE_URL = process.env.CLIENT_BASE_URL || 'http://localhost:5173';
const UDDOKTA_WEBHOOK_SECRET = process.env.UDDOKTA_WEBHOOK_SECRET || null;

// -------------------
// Helper Functions
// -------------------
// Prisma schema now stores `Registration.amount` as Decimal (precision 10,2).
// Use decimal strings ("100.00") when writing to DB to preserve cents.
const formatAmountToDecimal = (amount) => {
  const n = Number(amount || 0);
  if (Number.isNaN(n)) return '0.00';
  return n.toFixed(2);
};

const findOrCreateRegistration = async (userId, sessionId) => {
  let registration = await prisma.registration.findFirst({
    where: { userId, sessionId: Number(sessionId) },
  });

  if (!registration) {
    registration = await prisma.registration.create({
      data: { userId, sessionId: Number(sessionId), paymentStatus: 'pending', amount: formatAmountToDecimal(0) },
    });
  }

  return registration;
};

const sendConfirmationEmail = async (registration) => {
  try {
    const sessionInfo = {
      name: registration.session.name,
      tagline: registration.session.tagline || '',
      category: registration.session.category,
      startTime: registration.session.startTime,
      endTime: registration.session.endTime,
      platform: registration.session.platform,
      meetingLink: registration.session.meetingLink || '',
      amount: registration.session.registrationFee,
      transactionId: registration.transactionId,
    };

    await sendDetailsEmail(registration.user.email, sessionInfo, registration.user.name || 'Participant');
    logger.info('Confirmation email sent', { email: registration.user.email, registrationId: registration.id });
    return true;
  } catch (err) {
    logger.error('Failed to send confirmation email', { err: err?.message || err });
    return false;
  }
};

// -------------------
// Create Checkout
// -------------------
export const createCheckout = async (req, res) => {
    const {sessionId} = req.body;
  try {
    const {  email } = req.body;
    if (!sessionId || !email) return res.status(400).json({ success: false, error: 'sessionId and email are required' });
    if (!UDDOKTA_API_KEY) return res.status(500).json({ success: false, error: 'Payment provider API key not configured on server' });

    // Fetch session & user
    const session = await prisma.session.findUnique({ where: { id: Number(sessionId) } });
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const registration = await findOrCreateRegistration(user.id, sessionId);
    const amount = formatAmountToDecimal(session.registrationFee || 0);

    // Provider prefers decimal string amount (e.g. "100.00"). Keep DB amount as Int but send decimal string.
    const decimalAmount = (Number(session.registrationFee) || 0).toFixed(2);
    const payload = {
      full_name: user.name || '',
      email: user.email,
      amount: decimalAmount,
      metadata: {
        user_id: String(user.id),
        registration_id: String(registration.id),
        session_id: String(session.id),
        order_id: `reg_${registration.id}`,
      },
      redirect_url: `${CLIENT_BASE_URL}/payment/success?registrationId=${registration.id}&merchant_order_id=reg_${registration.id}`,
      cancel_url: `${CLIENT_BASE_URL}/payment/failed?registrationId=${registration.id}&merchant_order_id=reg_${registration.id}`,
      webhook_url: `${process.env.SERVER_BASE_URL || 'http://localhost:3000'}/api/payments/webhook`, // server public URL
    };

    const response = await axios.post(`${UDDOKTA_BASE}/api/checkout-v2`, payload, {
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'RT-UDDOKTAPAY-API-KEY': UDDOKTA_API_KEY,
      },
    });

    const data = response.data;
    if (!data.payment_url) {
      logger.error('No payment_url in provider response', { providerResponse: data, registrationId: registration.id });
      return res.status(502).json({ success: false, error: 'No checkout URL received from payment provider', provider: data });
    }

    // Update registration amount (decimal string) and set pending
    await prisma.registration.update({ where: { id: registration.id }, data: { amount: decimalAmount, paymentStatus: 'pending' } });

    logger.info('Checkout created', { registrationId: registration.id, payment_url: data.payment_url });

    // Return provider response in the same shape as documentation (payment_url, status, message)
    return res.json({ success: true, payment_url: data.payment_url, message: data.message || 'Payment Url', provider: data, registrationId: registration.id });
  } catch (err) {
    logger.error('createCheckout error', { err: err?.response?.data || err.message || err, sessionId: sessionId });
    // Avoid leaking provider API keys or raw responses in production
    res.status(500).json({ success: false, error: 'Failed to initiate checkout' });
  }
};

// -------------------
// Verify Payment (optional, server-side)
// -------------------
export const verifyPayment = async (req, res) => {
  try {
    const { invoice_id, registrationId } = req.body;

    if (!invoice_id) return res.status(400).json({ success: false, error: 'invoice_id required for verification' });

    const response = await axios.post(`${UDDOKTA_BASE}/api/verify-payment`, { invoice_id }, { headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'RT-UDDOKTAPAY-API-KEY': UDDOKTA_API_KEY } });
    const verifyData = response.data;

    // Per provider docs status === 'COMPLETED'
    if (!verifyData.status || String(verifyData.status).toUpperCase() !== 'COMPLETED') {
      logger.info('verifyPayment: payment not completed', { invoice_id, providerStatus: verifyData.status });
      return res.json({ success: false, message: 'Payment not completed', provider: verifyData });
    }

    const regId = registrationId || verifyData.metadata?.registrationId;
    if (!regId) return res.status(400).json({ success: false, error: 'Cannot determine registration id', provider: verifyData });

    const registration = await prisma.registration.findUnique({ where: { id: Number(regId) }, include: { session: true, user: true } });
    if (!registration) return res.status(404).json({ success: false, error: 'Registration not found' });

    const transactionId = verifyData.transaction_id || invoice_id;
    // Idempotency: if already paid with same transaction, return success
    if (registration.paymentStatus === 'paid' && registration.transactionId === transactionId) {
      return res.json({ success: true, message: 'Already verified' });
    }

    // Provider returns charged_amount as decimal string ("100.00"). Keep decimal for display, store int in DB.
    const chargedAmountRaw = verifyData.charged_amount || verifyData.amount || String(registration.session.registrationFee || 0);
    const chargedAmountDecimal = formatAmountToDecimal(chargedAmountRaw);

    // Update registration and decrement available seats atomically
    const updated = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.update({ where: { id: registration.id }, data: { transactionId, paymentStatus: 'paid', amount: chargedAmountDecimal, paidAt: new Date() }, include: { user: true, session: true } });

      // Try to decrement seats only if seats remain (avoids negative seats)
      const seatUpdate = await tx.session.updateMany({ where: { id: reg.sessionId, seats: { gt: 0 } }, data: { seats: { decrement: 1 } } });
      if (seatUpdate.count === 0) {
        // No seats to decrement: mark session closed
        await tx.session.update({ where: { id: reg.sessionId }, data: { isOpen: false } });
      } else {
        // If seats hit zero after decrement, ensure isOpen is false
        const s = await tx.session.findUnique({ where: { id: reg.sessionId } });
        if (s && s.seats <= 0) await tx.session.update({ where: { id: reg.sessionId }, data: { isOpen: false } });
      }

      return reg;
    });

    const emailSent = await sendConfirmationEmail(updated);
    if (emailSent) {
      await prisma.registration.update({ where: { id: updated.id }, data: { isEmailSent: true } });
    }
    // Return provider verification payload to caller (useful for client debug per docs)
    return res.json({ success: true, message: 'Payment verified and recorded', provider: verifyData, registration: { id: updated.id, paymentStatus: updated.paymentStatus, transactionId: updated.transactionId, amount: chargedAmountDecimal } });
  } catch (err) {
    logger.error('verifyPayment error', { err: err?.response?.data || err.message || err });
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
};

// -------------------
// Webhook Handler
// -------------------
export const handleWebhook = async (req, res) => {
  try {
    // Support raw body verification: prefer `req.rawBody` (set by express.json verify option in index.js)
    let rawBody = req.rawBody;
    if (!rawBody) {
      if (Buffer.isBuffer(req.body)) rawBody = req.body;
      else rawBody = Buffer.from(JSON.stringify(req.body || ''));
    }

    // Validate webhook: per Uddokta docs they send `rt-uddoktapay-api-key` header.
    // Accept webhook if header matches our provider API key OR verify HMAC signature when configured.
    const headerApiKey = req.headers['rt-uddoktapay-api-key'] || req.headers['rt-uddokta-api-key'];
    const signatureHeader = req.headers['x-uddoktapay-signature'] || req.headers['x-uddokta-signature'] || req.headers['x-signature'] || req.headers['signature'];

    let validated = false;
    if (headerApiKey && UDDOKTA_API_KEY && headerApiKey === UDDOKTA_API_KEY) {
      validated = true;
    }

    if (!validated && UDDOKTA_WEBHOOK_SECRET) {
      if (!signatureHeader) {
        console.warn('Webhook signature header missing and api-key header not provided');
        return res.status(401).send('Signature header required');
      }
      try {
        const computed = crypto.createHmac('sha256', UDDOKTA_WEBHOOK_SECRET).update(rawBody).digest('hex');
        const expectedBuf = Buffer.from(computed, 'utf8');
        const sigBuf = Buffer.from(String(signatureHeader), 'utf8');
        if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
          console.warn('Invalid webhook signature');
          return res.status(401).send('Invalid signature');
        }
        validated = true;
      } catch (sigErr) {
        console.error('Signature verification error', sigErr);
        return res.status(401).send('Signature verification failed');
      }
    }

    if (!validated) {
      if (process.env.NODE_ENV === 'production') {
        logger.error('Webhook validation failed: no valid API key or signature');
        return res.status(401).send('Unauthorized');
      }
      logger.warn('Warning: webhook not validated (dev mode)');
    }

    // Parse payload: when raw body is used, parse JSON
    let payload = req.body;
    try {
      if (Buffer.isBuffer(rawBody)) payload = JSON.parse(rawBody.toString('utf8'));
    } catch (parseErr) {
      console.warn('Failed to parse webhook JSON from raw body, falling back to req.body');
      payload = req.body;
    }

    logger.info('Webhook received', { payload });

    const registrationId = payload.metadata?.registrationId;
    const txnId = payload.transaction_id || payload.txn_id || payload.payment_id || payload.txnId || payload.invoice_id;
    const status = payload.status || payload.event;

    if (!registrationId) return res.status(400).json({ success: false, error: 'registrationId missing in webhook payload' });
    // Per provider docs expect status === 'COMPLETED'
    if (!status || String(status).toUpperCase() !== 'COMPLETED')
      return res.status(200).json({ received: true, message: 'Payment not completed' });

    const registration = await prisma.registration.findUnique({ where: { id: Number(registrationId) }, include: { user: true, session: true } });
    if (!registration) return res.status(404).json({ success: false, error: 'Registration not found' });

    // Idempotency: if already paid with same txnId, return ok
    if (registration.paymentStatus === 'paid' && registration.transactionId === txnId) {
      console.log('Webhook already processed for registration', registrationId);
      return res.status(200).json({ success: true, message: 'Already processed' });
    }

    const rawAmount = payload.charged_amount || payload.amount || registration.amount || '0.00';
    const savedAmountDecimal = formatAmountToDecimal(rawAmount);

    // Update registration and decrement seats in a transaction
    const updated = await prisma.$transaction(async (tx) => {
      const reg = await tx.registration.update({ where: { id: Number(registrationId) }, data: { transactionId: txnId, paymentStatus: 'paid', paidAt: new Date(), amount: savedAmountDecimal }, include: { user: true, session: true } });

      const seatUpdate = await tx.session.updateMany({ where: { id: reg.sessionId, seats: { gt: 0 } }, data: { seats: { decrement: 1 } } });
      if (seatUpdate.count === 0) {
        await tx.session.update({ where: { id: reg.sessionId }, data: { isOpen: false } });
      } else {
        const s = await tx.session.findUnique({ where: { id: reg.sessionId } });
        if (s && s.seats <= 0) await tx.session.update({ where: { id: reg.sessionId }, data: { isOpen: false } });
      }

      return reg;
    });

    const emailSent = await sendConfirmationEmail(updated);
    if (emailSent) {
      await prisma.registration.update({ where: { id: updated.id }, data: { isEmailSent: true } });
    }

    // Respond per docs
    return res.status(200).send('Webhook received successfully');
  } catch (err) {
    logger.error('handleWebhook error', { err: err?.message || err });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};
