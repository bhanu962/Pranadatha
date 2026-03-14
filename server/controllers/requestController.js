/**
 * Blood Request Controller
 * Handles emergency blood requests, donor matching, and fulfillment
 */
const BloodRequest = require('../models/BloodRequest');
const User = require('../models/User');
const Donation = require('../models/Donation');
const { findNearbyDonors } = require('../services/matchingService');
const { sendToUser, broadcast, buildPayload, isVapidConfigured } = require('../services/pushService');
const { sendBloodRequestAlertEmail } = require('../services/emailService');
const { checkEligibility } = require('../services/eligibilityService');
const { calculateDistance } = require('../utils/distance');
const logger = require('../utils/logger');

// POST /api/requests - Create emergency blood request
exports.createRequest = async (req, res) => {
  try {
    const {
      bloodGroup, unitsRequired, hospitalName, contactPhone,
      latitude, longitude, address, urgencyLevel, description, expiresInHours,
    } = req.body;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Location coordinates required.' });
    }

    const expiresAt = expiresInHours
      ? new Date(Date.now() + parseFloat(expiresInHours) * 60 * 60 * 1000)
      : new Date(Date.now() + 24 * 60 * 60 * 1000);

    const request = await BloodRequest.create({
      requestedBy: req.user._id,
      bloodGroup,
      unitsRequired: parseInt(unitsRequired),
      hospitalName,
      contactPhone,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      address,
      urgencyLevel: urgencyLevel || 'urgent',
      description,
      expiresAt,
    });

    // Asynchronously find and notify nearby donors (push + email)
    setImmediate(async () => {
      try {
        const radius = urgencyLevel === 'critical' ? 25 : 10;
        const nearbyDonors = await findNearbyDonors({
          bloodGroup,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radiusKm: radius,
          useCompatibility: true,
        });

        const donorIds = nearbyDonors.map((d) => d._id);

        if (donorIds.length > 0 && isVapidConfigured()) {
          const notifPayload = buildPayload('emergency_request', {
            bloodGroup,
            hospital: hospitalName,
            requestId: request._id.toString(),
          });

          const totalSent = await broadcast(donorIds, notifPayload);
          await BloodRequest.findByIdAndUpdate(request._id, {
            notificationsSent: totalSent,
          });
        }

        // Email alerts to all matching available donors (system-wide, up to 50)
        try {
          const emailDonors = await User.find({
            role: 'donor',
            bloodGroup,
            isAvailable: true,
            isActive: true,
            isEmailVerified: true,
          }).select('name email').limit(50);

          const results = await Promise.allSettled(
            emailDonors.map((d) =>
              sendBloodRequestAlertEmail(d.email, d.name, {
                bloodGroup, hospitalName, urgencyLevel,
                address, contactPhone, _id: request._id,
              })
            )
          );
          const sentCount = results.filter((r) => r.status === 'fulfilled').length;
          logger.info(`Blood request email alerts: ${sentCount}/${emailDonors.length} sent for request ${request._id}`);
        } catch (emailErr) {
          logger.warn(`Email alert batch failed for request ${request._id}: ${emailErr.message}`);
        }

        logger.info(`Emergency request ${request._id}: push notified ${donorIds.length} donors`);

      } catch (err) {
        logger.error(`Notification error for request ${request._id}: ${err.message}`);
      }
    });

    await request.populate('requestedBy', 'name email');
    res.status(201).json({ success: true, request, message: 'Blood request created. Donors are being notified.' });
  } catch (error) {
    logger.error(`Create request error: ${error.message}`);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Failed to create blood request.' });
  }
};

// GET /api/requests - List blood requests (with filters)
exports.getRequests = async (req, res) => {
  try {
    const { bloodGroup, status = 'active', urgency, page = 1, limit = 20 } = req.query;
    const query = {};
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (status) query.status = status;
    if (urgency) query.urgencyLevel = urgency;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [requests, total] = await Promise.all([
      BloodRequest.find(query)
        .populate('requestedBy', 'name role hospitalName')
        .sort({ urgencyLevel: 1, createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      BloodRequest.countDocuments(query),
    ]);

    res.json({
      success: true,
      requests,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch requests.' });
  }
};

// GET /api/requests/nearby - Get requests near user location
exports.getNearbyRequests = async (req, res) => {
  try {
    const { latitude, longitude, radius = 25 } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Coordinates required.' });
    }

    const requests = await BloodRequest.find({
      status: 'active',
      expiresAt: { $gt: new Date() },
      location: {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    })
      .populate('requestedBy', 'name role hospitalName')
      .limit(50);

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch nearby requests.' });
  }
};

// GET /api/requests/:id
exports.getRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requestedBy', 'name email phone role hospitalName')
      .populate('respondedDonors.donor', 'name bloodGroup phone');

    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    res.json({ success: true, request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch request.' });
  }
};

// PUT /api/requests/:id/respond - Donor responds to request
exports.respondToRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request || request.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Request not found or no longer active.' });
    }

    // Check if request has expired
    if (request.expiresAt < new Date()) {
      return res.status(400).json({ success: false, message: 'This request has expired.' });
    }

    // Check if donor already responded
    const alreadyResponded = request.respondedDonors.some(
      (r) => r.donor.toString() === req.user._id.toString()
    );
    if (alreadyResponded) {
      return res.status(409).json({ success: false, message: 'You have already responded to this request.' });
    }

    // Check donor eligibility before allowing response
    const donor = await User.findById(req.user._id);
    const eligibility = checkEligibility(donor);
    if (!eligibility.eligible) {
      return res.status(400).json({
        success: false,
        message: `You are not currently eligible to donate: ${eligibility.reason}`,
      });
    }

    if (!donor.isAvailable) {
      return res.status(400).json({
        success: false,
        message: 'You are marked as unavailable. Please update your availability first.',
      });
    }

    request.respondedDonors.push({ donor: req.user._id, status: 'pending' });
    await request.save();

    // Calculate approximate distance if request has coordinates
    let distance = null;
    if (donor.location?.coordinates && request.location?.coordinates) {
      const [donorLon, donorLat] = donor.location.coordinates;
      const [reqLon, reqLat] = request.location.coordinates;
      distance = parseFloat(calculateDistance(donorLat, donorLon, reqLat, reqLon).toFixed(1));
    }

    // Notify request creator
    if (isVapidConfigured()) {
      await sendToUser(
        request.requestedBy.toString(),
        buildPayload('request_matched', {
          bloodGroup: request.bloodGroup,
          hospital: request.hospitalName,
          requestId: request._id.toString(),
          distance: distance !== null ? `${distance}km` : 'nearby',
        })
      );
    }

    res.json({ success: true, message: 'Response recorded. The requester has been notified.' });
  } catch (error) {
    logger.error(`Respond to request error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to respond to request.' });
  }
};

// PUT /api/requests/:id/fulfill - Mark request as fulfilled
exports.fulfillRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: 'Request not found.' });
    }

    // Only requester or admin can fulfill
    if (
      request.requestedBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    request.status = 'fulfilled';
    request.fulfilledAt = new Date();
    request.unitsFulfilled = req.body.unitsFulfilled || request.unitsRequired;
    await request.save();

    // Notify the requester
    if (isVapidConfigured()) {
      await sendToUser(
        request.requestedBy.toString(),
        buildPayload('request_fulfilled', {
          bloodGroup: request.bloodGroup,
          hospital: request.hospitalName,
          requestId: request._id.toString(),
        })
      );
    }

    res.json({ success: true, message: 'Blood request marked as fulfilled.', request });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fulfill request.' });
  }
};

// DELETE /api/requests/:id - Cancel request
exports.cancelRequest = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ success: false, message: 'Not found.' });

    if (
      request.requestedBy.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Unauthorized.' });
    }

    request.status = 'cancelled';
    await request.save();

    res.json({ success: true, message: 'Request cancelled.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to cancel request.' });
  }
};

// GET /api/requests/user/my-requests - Get user's own requests (paginated)
exports.getMyRequests = async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [requests, total] = await Promise.all([
      BloodRequest.find({ requestedBy: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .populate('respondedDonors.donor', 'name bloodGroup phone'),
      BloodRequest.countDocuments({ requestedBy: req.user._id }),
    ]);

    res.json({
      success: true,
      requests,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch your requests.' });
  }
};
