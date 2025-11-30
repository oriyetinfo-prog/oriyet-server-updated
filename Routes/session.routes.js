
import  express  from 'express';
import { createSession, getSessions } from '../Controller/session.controller.js';
import upload from '../middleware/upload.js';
import { requireAdmin } from '../middleware/requireAdmin.js';


const router = express.Router();
// protect creation route and accept image as 'image'
router.post('/', requireAdmin, upload.single('image'), createSession);
router.get('/', getSessions);
export default router;

