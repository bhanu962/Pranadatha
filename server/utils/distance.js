/**
 * Haversine Distance Calculator
 * Calculates the distance between two geographic coordinates
 */

const EARTH_RADIUS_KM = 6371;

/**
 * Convert degrees to radians
 * @param {number} deg - Degrees
 * @returns {number} Radians
 */
const toRad = (deg) => (deg * Math.PI) / 180;

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in kilometers
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
};

/**
 * Filter an array of donors by distance from a reference point
 * @param {Array} donors - Array of donor objects with location.coordinates
 * @param {number} refLat - Reference latitude
 * @param {number} refLon - Reference longitude
 * @param {number} radiusKm - Maximum radius in kilometers
 * @returns {Array} Donors within the radius, with distance property added
 */
const filterByRadius = (donors, refLat, refLon, radiusKm = 10) => {
  return donors
    .map((donor) => {
      const [donorLon, donorLat] = donor.location.coordinates;
      const distance = calculateDistance(refLat, refLon, donorLat, donorLon);
      return { ...donor.toObject(), distance: parseFloat(distance.toFixed(2)) };
    })
    .filter((donor) => donor.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance);
};

module.exports = { calculateDistance, filterByRadius };
