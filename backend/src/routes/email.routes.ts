import { Router } from 'express';
import multer from 'multer';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  scheduleEmails,
  previewRecipientsFile,
  getScheduledEmails,
  getSentEmails,
  getEmailById,
  searchEmails,
} from '../controllers/email.controller.js';

const router = Router();

// Configure Multer for file uploads (max 5MB, memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.txt'];
    const hasAllowedExt = allowed.some((ext) => file.originalname.toLowerCase().endsWith(ext));
    if (hasAllowedExt || file.mimetype.includes('text') || file.mimetype.includes('csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only .csv and .txt files are supported'));
    }
  },
});

// Protect all email endpoints with authentication
router.use(requireAuth);

// Search emails (Elasticsearch / fallback)
router.get('/search', searchEmails);

// Schedule emails
router.post('/schedule', upload.single('file'), scheduleEmails);

// Preview/validate leads file
router.post('/preview-file', upload.single('file'), previewRecipientsFile);

// Retrieve lists
router.get('/scheduled', getScheduledEmails);
router.get('/sent', getSentEmails);

// Retrieve single email
router.get('/:id', getEmailById);

export default router;
