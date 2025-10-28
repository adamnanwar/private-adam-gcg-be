const express = require('express');
const multer = require('multer');
const path = require('path');
const EvidenceEnhancedController = require('./evidence-enhanced.controller');

function createEvidenceEnhancedRoutes(db) {
  const router = express.Router();
  const controller = new EvidenceEnhancedController(db);

  // Configure multer for file uploads
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, process.env.UPLOAD_PATH || 'uploads');
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: storage,
    limits: {
      fileSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760') // 10MB default
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = (process.env.UPLOAD_ALLOWED_TYPES || 'pdf,doc,docx,xls,xlsx,ppt,pptx,jpg,jpeg,png').split(',');
      const fileExt = path.extname(file.originalname).toLowerCase().substring(1);
      
      if (allowedTypes.includes(fileExt)) {
        cb(null, true);
      } else {
        cb(new Error(`File type .${fileExt} is not allowed`));
      }
    }
  });

  // POST /evidence/kka/:kkaId
  router.post('/kka/:kkaId', upload.single('file'), controller.uploadKkaEvidence);

  // POST /evidence/aoi/:aoiId
  router.post('/aoi/:aoiId', upload.single('file'), controller.uploadAoiEvidence);

  // GET /evidence/kka/:kkaId
  router.get('/kka/:kkaId', controller.getKkaEvidence);

  // GET /evidence/aoi/:aoiId
  router.get('/aoi/:aoiId', controller.getAoiEvidence);

  // DELETE /evidence/:evidenceId
  router.delete('/:evidenceId', controller.deleteEvidence);

  return router;
}

module.exports = { createEvidenceEnhancedRoutes };
