/**
 * clear-db.js — Pranadatha
 * Clears the entire database and seeds only the admin account.
 * Usage: node scripts/clear-db.js
 *
 * ⚠️  DESTRUCTIVE: ALL data will be wiped.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const ADMIN_EMAIL = 'admin@gmail.com'
const ADMIN_PASSWORD = 'admin123'
const ADMIN_NAME = 'Super Admin'

async function clearAndSeedAdmin() {
  console.log('\n🔥 Pranadatha — Clear DB & Seed Admin\n')
  console.log('⚠️  This will permanently delete ALL data!\n')

  await mongoose.connect(process.env.MONGO_URI)
  console.log('✅ Connected to MongoDB Atlas\n')

  // ── Drop all collections ──────────────────────────────────────────────────
  const db = mongoose.connection.db
  const collections = await db.listCollections().toArray()

  if (collections.length === 0) {
    console.log('ℹ️  No collections to drop.\n')
  } else {
    for (const col of collections) {
      await db.collection(col.name).drop()
      console.log(`🗑️  Dropped collection: ${col.name}`)
    }
    console.log()
  }

  // ── Re-initialize models (ensure indexes are created) ────────────────────
  // Import models to trigger index creation
  require('../models/User')
  require('../models/BloodRequest')
  require('../models/Donation')
  require('../models/Camp')
  require('../models/Subscription')
  await mongoose.syncIndexes()

  // ── Seed admin ────────────────────────────────────────────────────────────
  const User = require('../models/User')

  const admin = await User.create({
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD, // hashed by pre-save hook
    role: 'admin',
    phone: '+919000000000',
    city: 'Mumbai',
    location: { type: 'Point', coordinates: [72.8777, 19.0760] },
    isActive: true,
    isAvailable: false,
    isEmailVerified: true,
  })

  console.log('✅ Admin account created:')
  console.log(`   Email   : ${ADMIN_EMAIL}`)
  console.log(`   Password: ${ADMIN_PASSWORD}`)
  console.log(`   ID      : ${admin._id}\n`)

  const counts = await Promise.all([
    mongoose.connection.db.collection('users').countDocuments(),
  ])
  console.log(`📊 Users in DB: ${counts[0]}`)
  console.log('\n🎉 Done! Database is clean with only admin.\n')

  await mongoose.disconnect()
}

clearAndSeedAdmin().catch((err) => {
  console.error('❌ Error:', err.message)
  process.exit(1)
})
