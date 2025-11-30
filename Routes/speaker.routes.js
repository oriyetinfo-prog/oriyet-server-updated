
import  express  from 'express';
import { createSpeaker, getSpeakers } from '../Controller/speaker.controller.js';
import upload from '../middleware/upload.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();
// protect creation route and allow image upload via field name 'image'
router.post('/', requireAdmin, upload.single('image'), createSpeaker);
router.get('/', getSpeakers);
export default router;