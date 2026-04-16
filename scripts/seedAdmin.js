/**
 * Seed an admin account that bypasses team/approval restrictions.
 *
 * Usage:  node scripts/seedAdmin.js
 *
 * The admin can log in via the normal login page with:
 *   email:    admin@sauce.app
 *   password: Admin123!
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const userDao = require('../model/userDao');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/capstone-sauce';
const ADMIN_EMAIL = 'admin@sauce.app';
const ADMIN_PASSWORD = 'Admin123!';
const ADMIN_NAME = 'SAUCE Admin';

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);

    const existing = await userDao.findByEmail(ADMIN_EMAIL);
    if (existing) {
      console.log('Admin account already exists — skipping.');
      process.exit(0);
    }

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 12);

    await userDao.create({
      email: ADMIN_EMAIL,
      password: hashed,
      name: ADMIN_NAME,
      role: 'admin',
      status: 'approved',
    });

    console.log('Admin account created successfully.');
    console.log(`  email:    ${ADMIN_EMAIL}`);
    console.log(`  password: ${ADMIN_PASSWORD}`);
  } catch (err) {
    console.error('Failed to seed admin:', err);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
})();
