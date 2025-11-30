import { PrismaClient } from "../generated/prisma/index.js";
const prisma = new PrismaClient();

export const verifyAndRegister = async (req, res) => {
  try {
    const { email, code } = req.body;

    console.log("verify request body:", req.body);

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code required" });
    }

    // ✅ Find verification record
    const record = await prisma.emailVerification.findUnique({ where: { email } });

    // Log record for debugging (server-side only)
    console.log('verify: found record for email:', email, record ? { id: record.id, sessionId: record.sessionId, expireAt: record.expireAt, codePresent: !!record.code } : null);

    if (!record) {
      return res.status(400).json({ error: "No verification record found for this email" });
    }

    // ✅ Match code
    if (record.code !== code) {
      console.log('verify: provided code does not match stored code');
      return res.status(400).json({ error: "Invalid verification code" });
    }

    // ✅ Expiry check
    // Ensure expireAt is a Date object for comparison
    const expireAt = new Date(record.expireAt);
    if (expireAt < new Date()) {
      console.log('verify: code expired at', expireAt);
      return res.status(400).json({ error: "Verification code expired" });
    }

    // ✅ Check if user exists by email
    let user = await prisma.user.findUnique({
      where: { email }
    });

    // ✅ If not exists, create user
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: record.name,
          email: record.email,
          password: "temporary"
        }
      });
    }

    // ✅ Check if already registered in THIS session
    const alreadyRegistered = await prisma.registration.findFirst({
      where: {
        userId: user.id,
        sessionId: record.sessionId
      }
    });

    if (alreadyRegistered) {
      return res.status(400).json({
        error: "You have already registered for this session"
      });
    }

    // ✅ Create registration
    const registration = await prisma.registration.create({
      data: {
        userId: user.id,
        sessionId: record.sessionId,
        paymentStatus: "pending",
        amount: 0
      }
    });

    console.log("✅ Registration successful:", registration.id);

    res.json({
      success: true,
      message: "Email verified and registration successful",
      registrationId: registration.id,
      paymentStatus: "pending"
    });

  } catch (error) {
    console.error("verify-and-register error:", error);
    res.status(500).json({ error: error.message });
  }
};
