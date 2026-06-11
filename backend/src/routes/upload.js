import express from 'express';
import multer  from 'multer';
import { v4 as uuid } from 'uuid';
import Job          from '../models/Job.js';
import { uploadToS3 } from '../services/s3.js';
import { enqueueJob }  from '../services/sqs.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },   // 5 MB
  fileFilter: (_, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      cb(new Error('Only PDF resumes are supported.'));
      return;
    }

    cb(null, true);
  },
});

const runUpload = (req, res) => new Promise((resolve, reject) => {
  upload.single('resume')(req, res, (error) => {
    if (error) {
      reject(error);
      return;
    }

    resolve();
  });
});

router.post('/', requireAuth, async (req, res) => {
  let jobId;

  try {
    await runUpload(req, res);

    const { jdText, templateKind = 'sde', targetScore } = req.body;
    if (!jdText?.trim()) return res.status(400).json({ error: 'Job description is required' });
    if (!req.file)       return res.status(400).json({ error: 'PDF resume is required' });
    if (!['sde', 'ai', 'etc'].includes(templateKind)) {
      return res.status(400).json({ error: 'Unsupported resume template' });
    }

    const normalizedTargetScore = Math.min(
      100,
      Math.max(75, Number.parseInt(targetScore, 10) || 90),
    );

    jobId        = uuid();
    const s3Key  = `resumes/${req.user.id}/${jobId}.pdf`;

    await uploadToS3(s3Key, req.file.buffer, 'application/pdf');

    await Job.create({
      _id:         jobId,
      userId:      req.user.id,
      resumeS3Key: s3Key,
      jdText:      jdText.trim(),
      templateKind,
      targetScore: normalizedTargetScore,
    });

    await enqueueJob(jobId);

    res.status(202).json({ jobId, status: 'queued', templateKind, targetScore: normalizedTargetScore });
  } catch (err) {
    console.error('Upload error:', err);

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Resume PDF must be 5 MB or smaller.' });
      }

      return res.status(400).json({ error: err.message || 'Upload rejected.' });
    }

    if (!jobId && err.message === 'Only PDF resumes are supported.') {
      return res.status(400).json({ error: err.message });
    }

    if (jobId) {
      await Job.findByIdAndUpdate(jobId, {
        status: 'failed',
        errorMessage: err.message || 'Upload failed before queueing job',
      });
    }

    res.status(500).json({ error: err.message || 'Upload failed' });
  }
});

export default router;
