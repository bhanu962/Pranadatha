const express = require('express');
const router = express.Router();
const {
  subscribe, unsubscribe, sendTestNotification, getPublicKey, getSubscriptions,
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');

router.get('/public-key', getPublicKey);
router.post('/subscribe', protect, subscribe);
router.delete('/unsubscribe', protect, unsubscribe);
router.post('/test', protect, sendTestNotification);
router.get('/subscriptions', protect, authorize('admin'), getSubscriptions);

module.exports = router;
