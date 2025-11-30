import  express  from 'express';
import { sendVerificationCode } from '../Controller/sendEmailVerification.js';
import { verifyAndRegister } from '../Controller/verify&Register.js';


const router = express.Router();
router.post('/send-code',sendVerificationCode);
router.post('/verify-and-register',verifyAndRegister);
export default router;