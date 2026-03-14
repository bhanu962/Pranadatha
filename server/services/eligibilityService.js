/**
 * Eligibility Service
 * Determines donor eligibility based on donation history
 */

const MINIMUM_DAYS_BETWEEN_DONATIONS = 90;

/**
 * Check if a donor is eligible to donate
 * @param {Object} donor - User document
 * @returns {Object} Eligibility result
 */
const checkEligibility = (donor) => {
  const result = {
    eligible: true,
    reason: null,
    nextEligibleDate: null,
    daysSinceLastDonation: null,
    daysUntilEligible: null,
  };

  if (!donor.medicalEligible) {
    result.eligible = false;
    result.reason = 'Medically ineligible - consult your doctor.';
    return result;
  }

  if (donor.lastDonationDate) {
    const lastDonation = new Date(donor.lastDonationDate);
    const now = new Date();
    const daysSince = Math.floor(
      (now.getTime() - lastDonation.getTime()) / (1000 * 60 * 60 * 24)
    );

    result.daysSinceLastDonation = daysSince;

    if (daysSince < MINIMUM_DAYS_BETWEEN_DONATIONS) {
      const daysUntil = MINIMUM_DAYS_BETWEEN_DONATIONS - daysSince;
      const nextDate = new Date(lastDonation);
      nextDate.setDate(nextDate.getDate() + MINIMUM_DAYS_BETWEEN_DONATIONS);

      result.eligible = false;
      result.daysUntilEligible = daysUntil;
      result.nextEligibleDate = nextDate;
      result.reason = `You can donate again in ${daysUntil} days (after ${nextDate.toDateString()}).`;
    }
  }

  return result;
};

/**
 * Calculate the next eligible donation date
 * @param {Date} lastDonationDate
 * @returns {Date} Next eligible date
 */
const getNextEligibleDate = (lastDonationDate) => {
  if (!lastDonationDate) return new Date();
  const next = new Date(lastDonationDate);
  next.setDate(next.getDate() + MINIMUM_DAYS_BETWEEN_DONATIONS);
  return next;
};

/**
 * Calculate donor level based on total donations
 * @param {number} totalDonations
 * @returns {string} Level name
 */
const getDonorLevel = (totalDonations) => {
  if (totalDonations >= 10) return 'gold';
  if (totalDonations >= 4) return 'silver';
  return 'bronze';
};

/**
 * Get badge info for a donor level
 * @param {string} level
 */
const getBadgeInfo = (level) => {
  const badges = {
    bronze: {
      icon: '🥉',
      label: 'Bronze Donor',
      color: '#CD7F32',
      minDonations: 1,
      maxDonations: 3,
    },
    silver: {
      icon: '🥈',
      label: 'Silver Donor',
      color: '#C0C0C0',
      minDonations: 4,
      maxDonations: 9,
    },
    gold: {
      icon: '🥇',
      label: 'Gold Donor',
      color: '#FFD700',
      minDonations: 10,
      maxDonations: Infinity,
    },
  };
  return badges[level] || badges.bronze;
};

module.exports = {
  checkEligibility,
  getNextEligibleDate,
  getDonorLevel,
  getBadgeInfo,
  MINIMUM_DAYS_BETWEEN_DONATIONS,
};
