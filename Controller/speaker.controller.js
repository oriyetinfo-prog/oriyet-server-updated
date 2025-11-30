import { PrismaClient } from "../generated/prisma/index.js";

const prisma = new PrismaClient();

export const createSpeaker = async (req, res) => {
    try {
        // If multipart form used, multer will put file in req.file and text fields in req.body
        const speakerData = req.body;
        console.log('createSpeaker body:', speakerData);
        console.log('createSpeaker req.file:', req.file);
        if (req.file) {
            // create a public URL for uploaded file
            const base = process.env.SERVER_BASE_URL || 'http://localhost:3000';
            speakerData.image = `${base.replace(/\/$/, '')}/uploads/${req.file.filename}`;
            console.log('speaker image url:', speakerData.image);
        }

        if (!speakerData || !speakerData.name || !speakerData.designation) {
            return res.status(400).json({
                success: false,
                message: "speaker 'name' and 'designation' are required"
            });
        }

        // If a website is provided, check if a speaker with the same website already exists
        if (speakerData.website && speakerData.website.toString().trim() !== "") {
            const existing = await prisma.speaker.findFirst({
                where: { website: { equals: speakerData.website.toString().trim(), mode: 'insensitive' } }
            });

            if (existing) {
                return res.status(200).json({
                    success: false,
                    message: "Speaker already exists",
                    data: existing
                });
            }
        }

        const created = await prisma.speaker.create({
            data: {
                name: speakerData.name,
                designation: speakerData.designation,
                image: speakerData.image ?? "",
                website: speakerData.website ?? "",
                description: speakerData.description ?? ""
            }
        });

        return res.status(201).json({
            success: true,
            message: "Speaker created successfully",
            data: created
        });

    } catch (error) {
        console.error("Error creating speaker:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};


export const getSpeakers = async (req, res) => {
    try {
        // If the client requests related sessions, include them
        const includeSessions = req.query.sessions === 'true';

        const speakers = await prisma.speaker.findMany({
            include: includeSessions ? { sessions: true } : undefined
        });

        return res.status(200).json({
            success: true,
            data: speakers
        });
    } catch (error) {
        console.error("Error fetching speakers:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Internal Server Error"
        });
    }
};