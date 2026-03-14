/**
 * Seed Script — Blood Donor Finder
 *
 * Creates:
 *  - 1 admin account (admin@bloodfinder.app / admin123456)
 *  - 10 donors across Indian cities with various blood groups
 *  - 2 hospitals (apollo@hospital.com / hospital1234)
 *  - 5 blood requests (mix of urgency levels)
 *  - 3 donation camps (upcoming events)
 *  - 5 donation records
 *
 * Usage: node scripts/seed.js
 * Safe to re-run: skips existing emails
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const User = require('../models/User')
const BloodRequest = require('../models/BloodRequest')
const Donation = require('../models/Donation')
const Camp = require('../models/Camp')

// ── Indian cities with coords ──────────────────────────────────────────────
const CITIES = [
  { city: 'Mumbai',    lat: 19.0760, lon: 72.8777 },
  { city: 'Delhi',     lat: 28.7041, lon: 77.1025 },
  { city: 'Bengaluru', lat: 12.9716, lon: 77.5946 },
  { city: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  { city: 'Chennai',   lat: 13.0827, lon: 80.2707 },
  { city: 'Kolkata',   lat: 22.5726, lon: 88.3639 },
  { city: 'Pune',      lat: 18.5204, lon: 73.8567 },
  { city: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { city: 'Jaipur',    lat: 26.9124, lon: 75.7873 },
  { city: 'Lucknow',   lat: 26.8467, lon: 80.9462 },
]

function makeLocation(lat, lon) {
  return { type: 'Point', coordinates: [lon, lat] }
}

function jitter(coord, amount = 0.02) {
  return coord + (Math.random() - 0.5) * amount
}

function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d
}

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d
}

async function seed() {
  console.log('\n🌱 Blood Donor Finder — Seeding Database\n')
  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ Connected to MongoDB Atlas\n')

  // ── 1. Admin ─────────────────────────────────────────────────────────────
  let admin = await User.findOne({ email: 'admin@bloodfinder.app' })
  if (!admin) {
    admin = await User.create({
      name: 'Admin User',
      email: 'admin@bloodfinder.app',
      password: 'admin123456',   // pre-save hook hashes this
      role: 'admin',
      phone: '+919000000000',
      city: 'Mumbai',
      location: makeLocation(19.0760, 72.8777),
      isActive: true,
      isAvailable: false,
      isEmailVerified: true,
    })
    console.log('👤 Admin created: admin@bloodfinder.app / admin123456')
  } else {
    console.log('👤 Admin already exists — skipped')
  }

  // ── 2. Donors ─────────────────────────────────────────────────────────────
  const donorMap = {}
  const donorSeeds = [
    { name: 'Arjun Sharma',   email: 'arjun@donor.com',   bloodGroup: 'O+',  city: CITIES[0], donations: 8,  daysAgo: 95 },
    { name: 'Priya Patel',    email: 'priya@donor.com',   bloodGroup: 'A+',  city: CITIES[1], donations: 3,  daysAgo: 60 },
    { name: 'Rohan Mehta',    email: 'rohan@donor.com',   bloodGroup: 'B+',  city: CITIES[2], donations: 12, daysAgo: 100 },
    { name: 'Sneha Reddy',    email: 'sneha@donor.com',   bloodGroup: 'AB+', city: CITIES[3], donations: 1,  daysAgo: 200 },
    { name: 'Vikram Singh',   email: 'vikram@donor.com',  bloodGroup: 'O-',  city: CITIES[4], donations: 5,  daysAgo: 92 },
    { name: 'Kavya Nair',     email: 'kavya@donor.com',   bloodGroup: 'B-',  city: CITIES[5], donations: 2,  daysAgo: 150 },
    { name: 'Aditya Kumar',   email: 'aditya@donor.com',  bloodGroup: 'A-',  city: CITIES[6], donations: 7,  daysAgo: 120 },
    { name: 'Pooja Iyer',     email: 'pooja@donor.com',   bloodGroup: 'AB-', city: CITIES[7], donations: 0,  daysAgo: null },
    { name: 'Rahul Verma',    email: 'rahul@donor.com',   bloodGroup: 'O+',  city: CITIES[8], donations: 15, daysAgo: 200 },
    { name: 'Anjali Gupta',   email: 'anjali@donor.com',  bloodGroup: 'A+',  city: CITIES[9], donations: 4,  daysAgo: 90 },
  ]

  for (const d of donorSeeds) {
    const existing = await User.findOne({ email: d.email })
    if (existing) { donorMap[d.email] = existing; process.stdout.write('.'); continue }

    const donor = await User.create({
      name: d.name,
      email: d.email,
      password: 'donor1234',
      role: 'donor',
      bloodGroup: d.bloodGroup,
      phone: `+9198765${String(Math.floor(Math.random() * 90000) + 10000)}`,
      city: d.city.city,
      location: makeLocation(jitter(d.city.lat), jitter(d.city.lon)),
      isAvailable: d.daysAgo ? d.daysAgo >= 90 : true,
      isActive: true,
      isEmailVerified: true,
      totalDonations: d.donations,
      donorLevel: d.donations >= 10 ? 'gold' : d.donations >= 4 ? 'silver' : 'bronze',
      lastDonationDate: d.daysAgo ? daysAgo(d.daysAgo) : null,
      medicalEligible: true,
    })
    donorMap[d.email] = donor
    process.stdout.write('🩸')
  }
  console.log('\n✅ 10 donors seeded (password: donor1234)\n')

  // ── 3. Hospitals ──────────────────────────────────────────────────────────
  const hospitalSeeds = [
    { name: 'Apollo Hospital Mumbai',  email: 'apollo@hospital.com', city: CITIES[0] },
    { name: 'Fortis Hospital Delhi',   email: 'fortis@hospital.com', city: CITIES[1] },
  ]
  const hospitals = []
  for (const h of hospitalSeeds) {
    let hosp = await User.findOne({ email: h.email })
    if (!hosp) {
      hosp = await User.create({
        name: h.name,
        email: h.email,
        password: 'hospital1234',
        role: 'hospital',
        hospitalName: h.name,
        phone: `+9122${Math.floor(Math.random() * 90000000) + 10000000}`,
        city: h.city.city,
        location: makeLocation(h.city.lat, h.city.lon),
        isActive: true,
        isEmailVerified: true,
      })
      console.log(`🏥 Hospital created: ${h.email}`)
    } else {
      console.log(`🏥 Hospital already exists: ${h.email}`)
    }
    hospitals.push(hosp)
  }

  // ── 4. Blood Requests ─────────────────────────────────────────────────────
  const existingRequests = await BloodRequest.countDocuments()
  if (existingRequests === 0) {
    const requests = [
      {
        bloodGroup: 'O-', unitsRequired: 4, urgencyLevel: 'critical',
        hospitalName: 'Apollo Hospital Mumbai', contactPhone: '+912266006600',
        patientName: 'ICU Patient', address: 'Juhu, Mumbai',
        location: makeLocation(19.0760, 72.8777),
        status: 'active', requestedBy: hospitals[0]._id,
        expiresAt: new Date(Date.now() + 6 * 3600000),
      },
      {
        bloodGroup: 'AB+', unitsRequired: 2, urgencyLevel: 'urgent',
        hospitalName: 'Fortis Hospital Delhi', contactPhone: '+911141414141',
        patientName: 'Surgery Patient', address: 'Vasant Kunj, Delhi',
        location: makeLocation(28.7041, 77.1025),
        status: 'active', requestedBy: hospitals[1]._id,
        expiresAt: new Date(Date.now() + 12 * 3600000),
      },
      {
        bloodGroup: 'B+', unitsRequired: 1, urgencyLevel: 'normal',
        hospitalName: 'Manipal Hospital Bengaluru', contactPhone: '+918066564444',
        patientName: 'Raj Kumar', address: 'Whitefield, Bengaluru',
        location: makeLocation(12.9716, 77.5946),
        status: 'active', requestedBy: hospitals[0]._id,
        expiresAt: new Date(Date.now() + 24 * 3600000),
      },
      {
        bloodGroup: 'A+', unitsRequired: 3, urgencyLevel: 'urgent',
        hospitalName: 'AIIMS Hyderabad', contactPhone: '+914023688000',
        patientName: 'Accident Victim', address: 'Banjara Hills, Hyderabad',
        location: makeLocation(17.3850, 78.4867),
        status: 'fulfilled', requestedBy: hospitals[0]._id,
        expiresAt: daysAgo(-1),
      },
      {
        bloodGroup: 'O+', unitsRequired: 2, urgencyLevel: 'critical',
        hospitalName: 'KEM Hospital Mumbai', contactPhone: '+912224136051',
        patientName: 'Emergency Patient', address: 'Parel, Mumbai',
        location: makeLocation(jitter(19.0760, 0.05), jitter(72.8777, 0.05)),
        status: 'active', requestedBy: hospitals[0]._id,
        expiresAt: new Date(Date.now() + 3 * 3600000),
      },
    ]
    await BloodRequest.insertMany(requests)
    console.log('🚨 5 blood requests created')
  } else {
    console.log('🚨 Blood requests already exist — skipped')
  }

  // ── 5. Donation Camps ─────────────────────────────────────────────────────
  const existingCamps = await Camp.countDocuments()
  if (existingCamps === 0) {
    const campDocs = [
      {
        title: 'Mumbai Mega Blood Drive 2026',
        organizer: hospitals[0]._id,
        organizerName: hospitals[0].name,
        description: 'Join us for the largest blood donation camp in Mumbai. All blood groups welcome.',
        location: makeLocation(19.0760, 72.8777),
        address: 'Juhu Beach Grounds, Mumbai',
        city: 'Mumbai',
        startDate: daysFromNow(7),
        endDate: daysFromNow(7),
        bloodGroupsNeeded: ['All'],
        expectedDonors: 200,
        contactPhone: '+912266006600',
        contactEmail: 'apollo@hospital.com',
        status: 'upcoming',
      },
      {
        title: 'Delhi National Donate Day',
        organizer: hospitals[1]._id,
        organizerName: hospitals[1].name,
        description: 'National blood donation day event organized by Fortis Hospital Delhi.',
        location: makeLocation(28.7041, 77.1025),
        address: 'India Gate Lawns, New Delhi',
        city: 'Delhi',
        startDate: daysFromNow(14),
        endDate: daysFromNow(14),
        bloodGroupsNeeded: ['O+', 'O-', 'B+'],
        expectedDonors: 150,
        contactPhone: '+911141414141',
        contactEmail: 'fortis@hospital.com',
        status: 'upcoming',
      },
      {
        title: 'Bengaluru Tech Park Camp',
        organizer: hospitals[0]._id,
        organizerName: hospitals[0].name,
        description: 'Blood donation camp exclusively for tech park employees and residents.',
        location: makeLocation(12.9716, 77.5946),
        address: 'Electronic City Phase 1, Bengaluru',
        city: 'Bengaluru',
        startDate: daysFromNow(21),
        endDate: daysFromNow(21),
        bloodGroupsNeeded: ['A+', 'A-', 'AB+'],
        expectedDonors: 100,
        contactPhone: '+918066564444',
        status: 'upcoming',
      },
    ]
    await Camp.insertMany(campDocs)
    console.log('🎪 3 donation camps created')
  } else {
    console.log('🎪 Donation camps already exist — skipped')
  }

  // ── 6. Donation records ───────────────────────────────────────────────────
  const existingDonations = await Donation.countDocuments()
  if (existingDonations === 0) {
    const eligibleDonors = Object.values(donorMap).filter((d) => d.totalDonations > 0)
    const donationDocs = eligibleDonors.slice(0, 5).map((donor, i) => ({
      donor: donor._id,
      bloodGroup: donor.bloodGroup,
      donationDate: daysAgo(90 + i * 10),
      hospitalName: 'Apollo Hospital Mumbai',
      city: donor.city,
      verified: true,
      notes: 'Voluntary donation',
    }))
    if (donationDocs.length) {
      await Donation.insertMany(donationDocs)
      console.log(`💉 ${donationDocs.length} donation records created`)
    }
  } else {
    console.log('💉 Donations already exist — skipped')
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const counts = await Promise.all([
    User.countDocuments({ role: 'admin' }),
    User.countDocuments({ role: 'donor' }),
    User.countDocuments({ role: 'hospital' }),
    BloodRequest.countDocuments(),
    Camp.countDocuments(),
    Donation.countDocuments(),
  ])
  console.log('\n═══════════════════════════════════')
  console.log('  Database Summary')
  console.log('═══════════════════════════════════')
  console.log(`  Admins:    ${counts[0]}`)
  console.log(`  Donors:    ${counts[1]}`)
  console.log(`  Hospitals: ${counts[2]}`)
  console.log(`  Requests:  ${counts[3]}`)
  console.log(`  Camps:     ${counts[4]}`)
  console.log(`  Donations: ${counts[5]}`)
  console.log('═══════════════════════════════════')
  console.log('\n🎉 Seeding complete!\n')
  console.log('  Admin:    admin@bloodfinder.app / admin123456')
  console.log('  Donor:    arjun@donor.com / donor1234')
  console.log('  Hospital: apollo@hospital.com / hospital1234')
  console.log()

  await mongoose.disconnect()
}

seed().catch((err) => { console.error('❌ Seed failed:', err); process.exit(1) })
