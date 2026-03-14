/**
 * Camp Controller
 * Manages blood donation camps/events
 */
const Camp = require('../models/Camp');
const User = require('../models/User');
const { sendToUser, broadcast, buildPayload } = require('../services/pushService');
const logger = require('../utils/logger');

// POST /api/camps - Create a camp
exports.createCamp = async (req, res) => {
  try {
    const {
      title, description, address, city, latitude, longitude,
      startDate, endDate, bloodGroupsNeeded, expectedDonors,
      contactPhone, contactEmail,
    } = req.body;

    const camp = await Camp.create({
      title,
      organizer: req.user._id,
      organizerName: req.user.name,
      description,
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)],
      },
      address,
      city,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      bloodGroupsNeeded: bloodGroupsNeeded || ['All'],
      expectedDonors: parseInt(expectedDonors) || 50,
      contactPhone,
      contactEmail,
    });

    res.status(201).json({ success: true, camp });
  } catch (error) {
    logger.error(`Create camp error: ${error.message}`);
    if (error.name === 'ValidationError') {
      const msgs = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: msgs.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Failed to create camp.' });
  }
};

// GET /api/camps - List camps
exports.getCamps = async (req, res) => {
  try {
    const { city, status = 'upcoming', page = 1, limit = 12 } = req.query;
    const query = {};
    if (city) query.city = new RegExp(city, 'i');
    if (status) query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [camps, total] = await Promise.all([
      Camp.find(query)
        .populate('organizer', 'name')
        .sort({ startDate: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Camp.countDocuments(query),
    ]);

    res.json({ success: true, camps, total, pagination: { page: parseInt(page), limit: parseInt(limit), total } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch camps.' });
  }
};

// GET /api/camps/nearby
exports.getNearbyCamps = async (req, res) => {
  try {
    const { latitude, longitude, radius = 25 } = req.query;
    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Coordinates required.' });
    }

    const camps = await Camp.find({
      status: { $in: ['upcoming', 'ongoing'] },
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseFloat(radius) * 1000,
        },
      },
    }).limit(20);

    res.json({ success: true, count: camps.length, camps });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch nearby camps.' });
  }
};

// GET /api/camps/:id
exports.getCampById = async (req, res) => {
  try {
    const camp = await Camp.findById(req.params.id)
      .populate('organizer', 'name email')
      .populate('registeredDonors.donor', 'name bloodGroup');

    if (!camp) return res.status(404).json({ success: false, message: 'Camp not found.' });

    res.json({ success: true, camp });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch camp.' });
  }
};

// POST /api/camps/:id/register - Donor registers for camp
exports.registerForCamp = async (req, res) => {
  try {
    const camp = await Camp.findById(req.params.id);
    if (!camp) return res.status(404).json({ success: false, message: 'Camp not found.' });
    if (camp.status === 'completed' || camp.status === 'cancelled') {
      return res.status(400).json({ success: false, message: 'Camp is not open for registration.' });
    }

    const alreadyRegistered = camp.registeredDonors.some(
      (r) => r.donor.toString() === req.user._id.toString()
    );
    if (alreadyRegistered) {
      return res.status(409).json({ success: false, message: 'Already registered for this camp.' });
    }

    camp.registeredDonors.push({ donor: req.user._id });
    await camp.save();

    res.json({ success: true, message: `Registered for "${camp.title}"! You'll receive a reminder before the event.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to register for camp.' });
  }
};

// POST /api/camps/:id/send-reminders - Admin/organizer sends reminders
exports.sendReminders = async (req, res) => {
  try {
    const camp = await Camp.findById(req.params.id).populate('registeredDonors.donor', '_id');
    if (!camp) return res.status(404).json({ success: false, message: 'Camp not found.' });

    const donorIds = camp.registeredDonors.map((r) => r.donor._id.toString());
    if (!donorIds.length) {
      return res.json({ success: true, message: 'No registered donors to notify.' });
    }

    const payload = buildPayload('camp_reminder', {
      campTitle: camp.title,
      location: camp.address,
      campId: camp._id.toString(),
    });

    const sent = await broadcast(donorIds, payload);
    camp.remindersSent = true;
    await camp.save();

    res.json({ success: true, message: `Reminders sent to ${sent} donors.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to send reminders.' });
  }
};
