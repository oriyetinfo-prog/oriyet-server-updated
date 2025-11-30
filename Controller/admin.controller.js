import { PrismaClient } from '../generated/prisma/index.js';
import { v4 as uuidv4 } from 'uuid';
import sendAdminEmail from '../utils/sendAdminEmail.js';

const prisma = new PrismaClient();

const ALLOWED_ADMIN_EMAILS = [
  'abirabdullah3491@gmail.com',
  'kazisadiabushra@gmail.com'
];

export const requestAdmin = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email is required' });

    if (!ALLOWED_ADMIN_EMAILS.includes(email)) {
      return res.status(403).json({ error: 'This email is not permitted to request admin access' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Ensure the generated Prisma client includes AdminVerification model
    if (!prisma.adminVerification || typeof prisma.adminVerification.upsert !== 'function') {
      const message = 'Prisma client does not include AdminVerification model. Run `npx prisma generate` (or re-run migrations) to regenerate the client.';
      console.error(message);
      return res.status(500).json({ error: message });
    }

    // upsert admin verification
    await prisma.adminVerification.upsert({
      where: { email },
      update: { code, expireAt, createdAt: new Date() },
      create: { email, code, expireAt }
    });

    // send code (log and continue on failure so client doesn't get 500 when SMTP is not configured)
    let emailSent = false;
    try {
      await sendAdminEmail(email, code);
      emailSent = true;
    } catch (emailErr) {
      console.error('sendAdminEmail failed:', emailErr);
    }

    res.json({ success: true, message: 'Verification code generated', emailSent });
  } catch (err) {
    console.error('requestAdmin error', err);
    // In dev, return error message to help debugging
    const body = { error: 'Server error' };
    if (process.env.NODE_ENV !== 'production') {
      body.details = err.message;
      body.stack = err.stack;
    }
    res.status(500).json(body);
  }
};

export const confirmAdmin = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code are required' });

    const record = await prisma.adminVerification.findUnique({ where: { email } });
    if (!record) return res.status(400).json({ error: 'No verification request found' });

    if (record.code !== code) return res.status(400).json({ error: 'Invalid code' });
    if (new Date(record.expireAt) < new Date()) return res.status(400).json({ error: 'Code expired' });

    // create or update user to set isAdmin true
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name: email.split('@')[0], password: 'temporary', isAdmin: true } });
    } else {
      user = await prisma.user.update({ where: { email }, data: { isAdmin: true } });
    }

    res.json({ success: true, message: 'Admin confirmed', user: { id: user.id, email: user.email, isAdmin: user.isAdmin } });
  } catch (err) {
    console.error('confirmAdmin error', err);
    const body = { error: 'Server error' };
    if (process.env.NODE_ENV !== 'production') {
      body.details = err.message;
      body.stack = err.stack;
    }
    res.status(500).json(body);
  }
};

export default { requestAdmin, confirmAdmin };
