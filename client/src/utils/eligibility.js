/**
 * Client-side eligibility utility (mirrors server logic)
 */
export const checkEligibility = (donor) => {
  if (!donor) return { eligible: false, reason: 'No donor data' }
  if (!donor.medicalEligible) {
    return { eligible: false, reason: 'Medically ineligible – consult your doctor.' }
  }
  if (!donor.lastDonationDate) {
    return { eligible: true, reason: null, daysUntilEligible: 0, daysSinceLastDonation: null }
  }
  const daysSince = Math.floor((Date.now() - new Date(donor.lastDonationDate)) / 86400000)
  if (daysSince < 90) {
    const daysUntil = 90 - daysSince
    const nextDate = new Date(donor.lastDonationDate)
    nextDate.setDate(nextDate.getDate() + 90)
    return {
      eligible: false,
      daysSinceLastDonation: daysSince,
      daysUntilEligible: daysUntil,
      nextEligibleDate: nextDate,
      reason: `You can donate again in ${daysUntil} days (${nextDate.toDateString()}).`,
    }
  }
  return { eligible: true, daysSinceLastDonation: daysSince, reason: null }
}

export const getDonorLevel = (count) => {
  if (count >= 10) return 'gold'
  if (count >= 4) return 'silver'
  return 'bronze'
}
