/**
 * Donor Controller
 * Manages donor profiles, availability, search, history
 */
const User = require('../models/User');
const Donation = require('../models/Donation');
const { checkEligibility, getBadgeInfo, getDonorLevel } = require('../services/eligibilityService');
const { findNearbyDonors } = require('../services/matchingService');
const logger = require('../utils/logger');

// GET /api/donors - Get all donors (paginated, filterable)
exports.getAllDonors = async (req, res) => {
  try {
    const {
      bloodGroup,
      city,
      available,
      page = 1,
      limit = 20,
    } = req.query;

    const query = { role: 'donor', isActive: true };
    if (bloodGroup) query.bloodGroup = bloodGroup;
    if (city) query.city = new RegExp(city, 'i');
    if (available !== undefined) query.isAvailable = available === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [donors, total] = await Promise.all([
      User.find(query)
        .select('name bloodGroup phone city location isAvailable lastDonationDate totalDonations donorLevel')
        .skip(skip)
        .limit(parseInt(limit))
        .sort({ totalDonations: -1 }),
      User.countDocuments(query),
    ]);

    res.json({
      success: true,
      donors,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error(`Get donors error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch donors.' });
  }
};

// GET /api/donors/search - Search nearby donors
exports.searchNearby = async (req, res) => {
  try {
    const { bloodGroup, latitude, longitude, radius = 10, compatible = 'true' } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({ success: false, message: 'Latitude and longitude required.' });
    }

    const donors = await findNearbyDonors({
      bloodGroup,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      radiusKm: parseFloat(radius),
      useCompatibility: compatible === 'true',
    });

    res.json({
      success: true,
      count: donors.length,
      radius: parseFloat(radius),
      donors,
    });
  } catch (error) {
    logger.error(`Search nearby error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Search failed.' });
  }
};

// GET /api/donors/:id - Get single donor profile
exports.getDonorById = async (req, res) => {
  try {
    const donor = await User.findOne({ _id: req.params.id, role: 'donor' })
      .select('name bloodGroup city location isAvailable lastDonationDate totalDonations donorLevel createdAt');

    if (!donor) {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    const eligibility = checkEligibility(donor);
    const badge = getBadgeInfo(donor.donorLevel);

    res.json({ success: true, donor, eligibility, badge });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch donor.' });
  }
};

// PUT /api/donors/toggle-availability
exports.toggleAvailability = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.isAvailable = !user.isAvailable;
    await user.save({ validateBeforeSave: false });

    res.json({
      success: true,
      isAvailable: user.isAvailable,
      message: `You are now ${user.isAvailable ? 'available' : 'unavailable'} for donations.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to toggle availability.' });
  }
};

// GET /api/donors/my-donations - Get current donor's donation history
exports.getDonationHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [donations, total] = await Promise.all([
      Donation.find({ donor: req.user._id })
        .populate('bloodRequest', 'hospitalName bloodGroup urgencyLevel')
        .populate('camp', 'title address')
        .sort({ donationDate: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Donation.countDocuments({ donor: req.user._id }),
    ]);

    const user = await User.findById(req.user._id);
    const eligibility = checkEligibility(user);
    const badge = getBadgeInfo(user.donorLevel);

    res.json({
      success: true,
      donations,
      eligibility,
      badge,
      totalDonations: user.totalDonations,
      pagination: { page: parseInt(page), limit: parseInt(limit), total },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch donation history.' });
  }
};

// GET /api/donors/leaderboard - Top donors
exports.getLeaderboard = async (req, res) => {
  try {
    const donors = await User.find({ role: 'donor', isActive: true, totalDonations: { $gt: 0 } })
      .select('name bloodGroup city totalDonations donorLevel')
      .sort({ totalDonations: -1 })
      .limit(20);

    const leaderboard = donors.map((d, idx) => ({
      rank: idx + 1,
      ...d.toObject(),
      badge: getBadgeInfo(d.donorLevel),
    }));

    res.json({ success: true, leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard.' });
  }
};

// POST /api/donors/record-donation - Admin/hospital records a donation
exports.recordDonation = async (req, res) => {
  try {
    const { donorId, bloodGroup, units = 1, hospitalName, donationDate, donationType } = req.body;

    const donor = await User.findById(donorId);
    if (!donor || donor.role !== 'donor') {
      return res.status(404).json({ success: false, message: 'Donor not found.' });
    }

    const eligibility = checkEligibility(donor);
    if (!eligibility.eligible) {
      return res.status(400).json({ success: false, message: eligibility.reason });
    }

    const donation = await Donation.create({
      donor: donorId,
      bloodGroup: bloodGroup || donor.bloodGroup,
      units,
      hospitalName,
      donationDate: donationDate || new Date(),
      donationType: donationType || 'voluntary',
      verified: true,
      verifiedBy: req.user._id,
    });

    // Update donor stats
    donor.lastDonationDate = donation.donationDate;
    donor.totalDonations += 1;
    donor.donorLevel = getDonorLevel(donor.totalDonations);
    await donor.save({ validateBeforeSave: false });

    res.status(201).json({ success: true, donation, message: 'Donation recorded successfully.' });
  } catch (error) {
    logger.error(`Record donation error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Failed to record donation.' });
  }
};
