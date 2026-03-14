const express = require('express');
const router = express.Router();
const {
  getDashboardStats, getUsers, getUserById,
  updateUser, deleteUser, toggleUserActive,
  moderateRequest, getGeographicData,
} = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const { body, validationResult } = require('express-validator');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// All admin routes require authentication + admin role
router.use(protect, authorize('admin'));

// Stats & analytics
router.get('/stats', getDashboardStats);
router.get('/geographic', getGeographicData);

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', [
  body('name').optional().trim().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['donor', 'patient', 'hospital', 'admin']).withMessage('Invalid role'),
  body('bloodGroup').optional().isIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']),
  validate,
], updateUser);
router.delete('/users/:id', deleteUser);
router.put('/users/:id/toggle-active', toggleUserActive);

// Request moderation
router.put('/requests/:id/moderate', moderateRequest);

module.exports = router;
