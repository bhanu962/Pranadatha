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

// Public
router.get('/', getRequests);
router.get('/nearby', getNearbyRequests);
router.get('/:id', getRequestById);

// Protected
router.post('/', protect, authorize('patient', 'hospital', 'admin'), [
  body('bloodGroup').isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']),
  body('unitsRequired').isInt({ min: 1, max: 20 }),
  body('hospitalName').trim().notEmpty(),
  body('contactPhone').notEmpty(),
  body('latitude').isFloat(),
  body('longitude').isFloat(),
  validate,
], createRequest);

router.get('/user/my-requests', protect, getMyRequests);
router.put('/:id/respond', protect, authorize('donor'), respondToRequest);
router.put('/:id/fulfill', protect, fulfillRequest);
router.delete('/:id', protect, cancelRequest);

module.exports = router;
