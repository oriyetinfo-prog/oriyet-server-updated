import { PrismaClient } from "../generated/prisma/index.js";
import { sendEmail } from "../utils/sendEmail.js";

const prisma = new PrismaClient();

export const sendVerificationCode = async (req, res) => {
  try {
    const { name, email, sessionId } = req.body;

    if (!name || !email || !sessionId) {
      return res.status(400).json({ error: "Name, email, and sessionId are required" });
    }

    // Fetch session info
    const session = await prisma.session.findUnique({
      where: { id: Number(sessionId) },
      include: { speaker: true },
    });

    if (!session) return res.status(404).json({ error: "Session not found" });

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expireAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min expiry

    // Save to DB
    await prisma.emailVerification.upsert({
      where: { email },
      update: { code, expireAt, sessionId, name },
      create: { email, name, code, expireAt, sessionId },
    });

    // Send email
    await sendEmail(email, code, {
      sessionName: session.name,
      sessionDate: session.startTime.toLocaleString(),
      speakerName: session.speaker?.name || "TBA",
    }, name);

    res.json({ message: "Verification code sent" });
  } catch (error) {
    console.error("send-code error:", error);
    res.status(500).json({ error: error.message });
  }
};
