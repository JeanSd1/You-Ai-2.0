require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

async function check(email, plainPassword) {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const user = await User.findOne({ email: email.toLowerCase() }).select('+password').lean();
  if (!user) {
    console.log('User not found for email:', email);
    await mongoose.disconnect();
    return;
  }

  console.log('User found:', { id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin });
  console.log('Stored password (hash):', user.password ? (user.password.length > 20 ? user.password.substring(0,20) + '...' : user.password) : '(none)');

  if (!user.password) {
    console.log('No stored password found for user.');
  } else {
    const match = await bcrypt.compare(plainPassword, user.password);
    console.log('Password match:', match);
  }

  await mongoose.disconnect();
}

const email = process.argv[2];
const pass = process.argv[3];
if (!email || !pass) {
  console.error('Usage: node checkUserPassword.js email@example.com plainPassword');
  process.exit(1);
}

check(email, pass).catch(err => { console.error(err); process.exit(2); });
