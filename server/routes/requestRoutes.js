const express = require('express');
const router = express.Router();
const {
  createRequest, getRequests, getNearbyRequests, getRequestById,
  respondToRequest, fulfillRequest, cancelRequest, getMyRequests,
} = require('../controllers/requestController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// ─── Static / named segment routes FIRST (before /:id) ────────────────────
router.get('/nearby', getNearbyRequests);
router.get('/user/my-requests', protect, getMyRequests);

// ─── Public list route ─────────────────────────────────────────────────────
router.get('/', getRequests);

// ─── Create (protected) ───────────────────────────────────────────────────
router.post('/', protect, authorize('patient', 'hospital', 'admin'), [
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .withMessage('Valid blood group required'),
  body('unitsRequired').isInt({ min: 1, max: 20 }).withMessage('Units must be 1–20'),
  body('hospitalName').trim().notEmpty().withMessage('Hospital name required'),
  body('contactPhone').notEmpty().withMessage('Contact phone required'),
  body('latitude').isFloat().withMessage('Valid latitude required'),
  body('longitude').isFloat().withMessage('Valid longitude required'),
  validate,
], createRequest);

// ─── Dynamic :id routes LAST ──────────────────────────────────────────────
router.get('/:id', getRequestById);
router.put('/:id/respond', protect, authorize('donor'), respondToRequest);
router.put('/:id/fulfill', protect, fulfillRequest);
router.delete('/:id', protect, cancelRequest);

module.exports = router;
