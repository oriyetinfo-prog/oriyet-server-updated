// import express from 'express';
// import { createCheckout, verifyPayment, handleWebhook } from '../Controller/payment.controller.js';

// const router = express.Router();

// router.post('/create-checkout', createCheckout);
// router.get('/verify', verifyPayment);

// // Webhook endpoint - use raw body to validate signature
// router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// export default router;


// routes/payment.js
import express from 'express';
import { createCheckout, verifyPayment, handleWebhook } from '../Controller/payment.controller.js';
import { PrismaClient } from '../generated/prisma/index.js';

const router = express.Router();
const prisma = new PrismaClient();

// Create checkout
router.post('/create-checkout', createCheckout);

// Verify payment (server-side call to provider using invoice_id)
router.post('/verify', verifyPayment);

// Webhook endpoint - provider will POST updates here
// Use standard json parsing; server captures raw body in `req.rawBody` for signature verification
router.post('/webhook', express.json(), handleWebhook);

// GET payment status (client polling)
router.get('/status', async (req, res) => {
  const { registrationId } = req.query;
  if (!registrationId) return res.status(400).json({ error: 'registrationId is required' });

  try {
    const registration = await prisma.registration.findUnique({
      where: { id: Number(registrationId) },
      include: { session: true, user: true },
    });

    if (!registration) return res.status(404).json({ error: 'Registration not found' });

    res.json({
      registrationId: registration.id,
      paymentStatus: registration.paymentStatus,
      transactionId: registration.transactionId || null,
      amount: registration.amount || 0,
    });
  } catch (err) {
    console.error('Error fetching payment status:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
