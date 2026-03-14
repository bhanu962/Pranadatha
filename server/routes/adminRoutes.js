const express = require('express');
const router = express.Router();
const { getDashboardStats, getUsers, toggleUserActive, moderateRequest, getGeographicData } = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// All admin routes require authentication and admin role
router.use(protect, authorize('admin'));

router.get('/stats', getDashboardStats);
router.get('/users', getUsers);
router.get('/geographic', getGeographicData);
router.put('/users/:id/toggle-active', toggleUserActive);
router.put('/requests/:id/moderate', moderateRequest);

module.exports = router;
