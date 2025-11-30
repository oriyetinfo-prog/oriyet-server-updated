import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const createSession = async (req, res) => {
    try {
        // support multipart/form-data: image file in req.file, other fields in req.body
        const session = req.body;
        console.log('createSession request body:', session);
        console.log('createSession req.file:', req.file);
        if (req.file) {
            const base = process.env.SERVER_BASE_URL || 'http://localhost:3000';
            session.image = `${base.replace(/\/$/, '')}/uploads/${req.file.filename}`;
            console.log('created image url:', session.image);
        }

        if (!session || !session.name) {
            return res.status(400).json({
                success: false,
                message: "Session 'name' is required"
            });
        }

        if (!session.startTime || !session.endTime) {
            return res.status(400).json({
                success: false,
                message: "Session 'startTime' and 'endTime' are required"
            });
        }

        // Normalize tags: accept string, array, or comma-separated values
        let tags = session.tags ?? [];
        if (Array.isArray(tags)) {
            tags = tags.join(',');
        }
        tags = String(tags).split(',').map(s => s.trim()).filter(Boolean);

        // speakerId: accept null or integer
        let speakerId = null;
        if (session.speakerId !== undefined && session.speakerId !== null && session.speakerId !== '') {
            const sp = Number(session.speakerId);
            if (Number.isNaN(sp)) {
                return res.status(400).json({ success: false, message: 'Invalid speakerId' });
            }
            speakerId = sp;
        }

        // registrationFee and seats as integers
        const registrationFee = session.registrationFee !== undefined && session.registrationFee !== null && session.registrationFee !== ''
            ? parseInt(session.registrationFee, 10)
            : 0;
        if (Number.isNaN(registrationFee) || registrationFee < 0) return res.status(400).json({ success: false, message: 'Invalid registrationFee' });

        const seats = session.seats !== undefined && session.seats !== null && session.seats !== ''
            ? parseInt(session.seats, 10)
            : 0;
        if (Number.isNaN(seats) || seats < 0) return res.status(400).json({ success: false, message: 'Invalid seats' });

        // isOpen boolean
        let isOpen = true;
        if (session.isOpen !== undefined && session.isOpen !== null && session.isOpen !== '') {
            if (typeof session.isOpen === 'string') {
                isOpen = session.isOpen === 'true' || session.isOpen === '1';
            } else {
                isOpen = Boolean(session.isOpen);
            }
        }

        // start and end times
        const startTime = new Date(session.startTime);
        const endTime = new Date(session.endTime);
        if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
            return res.status(400).json({ success: false, message: 'Invalid startTime or endTime' });
        }

        const data = {
            name: session.name,
            tagline: session.tagline ?? "",
            category: session.category ?? "",
            description: session.description ?? "",
            image: session.image ?? "",
            speakerId: speakerId,
            startTime: startTime,
            endTime: endTime,
            registrationFee: registrationFee,
            seats: seats,
            platform: session.platform ?? "",
            meetingLink: session.meetingLink ?? null,
            isOpen: isOpen,
            slug: session.slug ?? `${session.name.toLowerCase().replace(/ /g, "-")}-${Date.now()}`,
            tags: tags,
            createdBy: session.createdBy ?? null,
            updatedBy: session.updatedBy ?? null
        };

        console.log('prepared data (before prisma):', data);
        console.log('prepared data types:', {
            speakerId: typeof data.speakerId,
            registrationFee: typeof data.registrationFee,
            seats: typeof data.seats,
            isOpen: typeof data.isOpen,
            tags: Array.isArray(data.tags) ? data.tags : typeof data.tags
        });

        const created = await prisma.session.create({
            data,
            include: { speaker: true }
        });

        console.log('created data sent to prisma:', data);

        return res.status(201).json({
            success: true,
            message: "Session created successfully",
            data: created
        });

    } catch (error) {
        console.error("Error creating session:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};


export const getSessions = async (req, res) => {
    try {
        const sessions = await prisma.session.findMany();  
        return res.status(200).json({
            success: true,
            message: "Sessions retrieved successfully",
            data: sessions
        });

        console.log(sessions);
    } catch (error) {
        console.error("Error retrieving sessions:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};