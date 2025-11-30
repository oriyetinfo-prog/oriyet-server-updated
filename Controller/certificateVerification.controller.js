import { PrismaClient } from "../generated/prisma/index.js";
import { sendEmail } from "../utils/sendEmail.js";

const prisma = new PrismaClient();

export const sendCertificateCode = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email required' });

    // generate code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.emailVerification.upsert({
      where: { email },
      update: { code, expireAt, sessionId: 0, name: null },
      create: { email, name: null, code, expireAt, sessionId: 0 }
    });

    // send email (no session info)
    await sendEmail(email, code, { sessionName: 'Certificate Verification', sessionDate: '', speakerName: '' }, 'Participant');

    res.json({ success: true, message: 'Verification code sent to email' });
  } catch (error) {
    console.error('sendCertificateCode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

export const verifyCertificateCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code required' });

    const record = await prisma.emailVerification.findUnique({ where: { email } });
    if (!record) return res.status(400).json({ success: false, message: 'No verification record' });
    if (record.code !== code) return res.status(400).json({ success: false, message: 'Invalid code' });
    if (record.expireAt < new Date()) return res.status(400).json({ success: false, message: 'Code expired' });

    // Ensure user exists
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await prisma.user.create({ data: { email, name: null, password: 'temporary' } });
    }

    // Find completed sessions for this user (session endTime < now and registration exists)
    const now = new Date();
    const registrations = await prisma.registration.findMany({
      where: { userId: user.id },
      include: { session: { include: { speaker: true } } }
    });

    const completed = registrations
      .filter(r => r.session && new Date(r.session.endTime) < now)
      .map((r, idx) => ({
        serial: idx + 1,
        sessionId: r.session.id,
        sessionName: r.session.name,
        startTime: r.session.startTime,
        endTime: r.session.endTime,
        speaker: r.session.speaker || null
      }));

    res.json({ success: true, sessions: completed, user: { id: user.id, email: user.email, name: user.name } });

  } catch (error) {
    console.error('verifyCertificateCode error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
