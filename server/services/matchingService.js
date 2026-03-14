/**
 * Donor Matching Service
 * Finds eligible donors near a blood request location
 */
const User = require('../models/User');
const { calculateDistance } = require('../utils/distance');
const logger = require('../utils/logger');

const COMPATIBLE_DONORS = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

/**
 * Find eligible donors near a blood request
 * @param {Object} params
 * @param {string} params.bloodGroup - Required blood group
 * @param {number} params.latitude - Request location latitude
 * @param {number} params.longitude - Request location longitude
 * @param {number} params.radiusKm - Search radius (default 10km)
 * @param {boolean} params.useCompatibility - If true, use compatible blood groups
 * @returns {Array} Matched donors with distance
 */
const findNearbyDonors = async ({
  bloodGroup,
  latitude,
  longitude,
  radiusKm = 10,
  useCompatibility = true,
}) => {
  const eligibleBloodGroups =
    useCompatibility && COMPATIBLE_DONORS[bloodGroup]
      ? COMPATIBLE_DONORS[bloodGroup]
      : [bloodGroup];

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  // Use MongoDB $nearSphere for efficient geo-query
  const donors = await User.find({
    role: 'donor',
    isAvailable: true,
    isActive: true,
    medicalEligible: true,
    bloodGroup: { $in: eligibleBloodGroups },
    // Match donors who either never donated OR donated >90 days ago
    // Using $not: { $gt: date } correctly handles null, undefined, and old dates
    lastDonationDate: { $not: { $gt: ninetyDaysAgo } },
    location: {
      $nearSphere: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude],
        },
        $maxDistance: radiusKm * 1000, // convert km to meters
      },
    },
  })
    .select('name bloodGroup phone email city location lastDonationDate totalDonations donorLevel')
    .limit(100);

  // Calculate exact distances using Haversine
  const donorsWithDistance = donors.map((donor) => {
    const [donorLon, donorLat] = donor.location.coordinates;
    const distance = calculateDistance(latitude, longitude, donorLat, donorLon);
    return {
      ...donor.toObject(),
      distance: parseFloat(distance.toFixed(2)),
    };
  });

  return donorsWithDistance.sort((a, b) => a.distance - b.distance);
};

/**
 * Get blood group compatibility info
 * @param {string} bloodGroup
 */
const getCompatibleGroups = (bloodGroup) => ({
  bloodGroup,
  canDonateTo: Object.keys(COMPATIBLE_DONORS).filter((bg) =>
    COMPATIBLE_DONORS[bg].includes(bloodGroup)
  ),
  canReceiveFrom: COMPATIBLE_DONORS[bloodGroup] || [],
});

module.exports = { findNearbyDonors, getCompatibleGroups, COMPATIBLE_DONORS };
