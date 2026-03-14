const express = require('express');
const router = express.Router();
const { createCamp, getCamps, getNearbyCamps, getCampById, registerForCamp, sendReminders } = require('../controllers/campController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/', getCamps);
router.get('/nearby', getNearbyCamps);
router.get('/:id', getCampById);
router.post('/', protect, authorize('admin', 'hospital'), createCamp);
router.post('/:id/register', protect, authorize('donor'), registerForCamp);
router.post('/:id/reminders', protect, authorize('admin', 'hospital'), sendReminders);

module.exports = router;
