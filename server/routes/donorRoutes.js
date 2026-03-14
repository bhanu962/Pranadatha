const express = require('express');
const router = express.Router();
const {
  getAllDonors, searchNearby, getDonorById, toggleAvailability,
  getDonationHistory, getLeaderboard, recordDonation,
} = require('../controllers/donorController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

// Public routes
router.get('/', getAllDonors);
router.get('/search', searchNearby);
router.get('/leaderboard', getLeaderboard);
router.get('/:id', getDonorById);

// Protected donor routes
router.put('/toggle-availability', protect, authorize('donor'), toggleAvailability);
router.get('/my/donations', protect, authorize('donor'), getDonationHistory);

// Admin / hospital can record a donation
router.post('/record-donation', protect, authorize('admin', 'hospital'), recordDonation);

module.exports = router;
