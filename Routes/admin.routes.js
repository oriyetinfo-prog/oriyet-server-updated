import express from 'express';
import { requestAdmin, confirmAdmin } from '../Controller/admin.controller.js';

const router = express.Router();

router.post('/request', requestAdmin);
router.post('/confirm', confirmAdmin);

// Dev-only helper: fetch the last admin verification code for a given email
// Useful when SMTP is not configured locally. Only enabled when NODE_ENV !== 'production'.
router.get('/debug-code', async (req, res) => {
	if (process.env.NODE_ENV === 'production') return res.status(404).send('Not found');
	const { email } = req.query;
	if (!email) return res.status(400).json({ error: 'email query required' });
	try {
		const { PrismaClient } = await import('../generated/prisma/index.js');
		const prisma = new PrismaClient();
		const record = await prisma.adminVerification.findUnique({ where: { email: String(email) } });
		if (!record) return res.status(404).json({ error: 'not found' });
		res.json({ email: record.email, code: record.code, expireAt: record.expireAt });
	} catch (err) {
		console.error('debug-code error', err);
		res.status(500).json({ error: err.message });
	}
});

export default router;
