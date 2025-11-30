import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import SessionRoutes from './Routes/session.routes.js';
import SpeakerRoutes from './Routes/speaker.routes.js';
import RegistrationRoutes from './Routes/verification.routes.js'
import DetailsRoutes from "./Routes/details.routes.js";
import CertificateRoutes from './Routes/certificate.routes.js';
import PaymentRoutes from './Routes/payment.routes.js';
import AdminRoutes from './Routes/admin.routes.js';
import path from 'path';
const app = express();
// Capture raw request body for webhook signature verification while still parsing JSON for routes
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use(cors());
dotenv.config();
const port = process.env.PORT || 3000;




app.use('/api/speaker', SpeakerRoutes);
app.use('/api/session', SessionRoutes);
app.use('/api/session/registration', RegistrationRoutes)
app.use("/api/email", DetailsRoutes);
app.use('/api/certificate', CertificateRoutes);

app.use('/api/payments', PaymentRoutes);
app.use('/api/admin', AdminRoutes);

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});