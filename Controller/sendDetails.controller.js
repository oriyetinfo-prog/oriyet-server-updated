import { PrismaClient } from "../generated/prisma/index.js";
import { sendDetailsEmail } from "../utils/sendDetailesEmail.js";

const prisma = new PrismaClient();

export const sendDetails = async (req, res) => {
    try {
        const { email, sessionId, transactionId } = req.body;

        if (!email || !sessionId) {
            return res.status(400).json({ error: "email and sessionId are required" });
        }

        // ✅ Find user
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // ✅ Find session
        const session = await prisma.session.findUnique({
            where: { id: Number(sessionId) },
            include: { speaker: true },
        });

        if (!session) {
            return res.status(404).json({ error: "Session not found" });
        }

        // ✅ Find registration
        const registration = await prisma.registration.findFirst({
            where: { userId: user.id, sessionId: session.id },
        });

        if (!registration) {
            return res.status(404).json({ error: "Registration not found" });
        }

        if (registration.paymentStatus !== "PAID") {
            return res.status(403).json({ error: "Payment not completed for this session" });
        }

        // ✅ Atomic check & mark email sent
        const updated = await prisma.registration.updateMany({
            where: { id: registration.id, isEmailSent: false },
            data: { isEmailSent: true },
        });

        if (updated.count === 0) {
            // Email was already sent
            return res.status(200).json({ message: "Session details email already sent ✅" });
        }

        // ✅ Prepare session info
        const sessionInfo = {
            name: session.name,
            tagline: session.tagline ?? "",
            category: session.category ?? "",
            startTime: session.startTime,
            endTime: session.endTime,
            platform: session.platform ?? "",
            meetingLink: session.meetingLink ?? null,
            amount: registration.amount,
            transactionId: transactionId,
            speakerName: session.speaker?.name ?? "Guest Speaker",
        };

        // ✅ Send email
        await sendDetailsEmail(user.email, sessionInfo, user.name);

        return res.json({
            message: "Session details email sent successfully ✅",
        });

    } catch (error) {
        console.error("sendDetails error:", error);
        return res.status(500).json({ error: error.message });
    }
};
