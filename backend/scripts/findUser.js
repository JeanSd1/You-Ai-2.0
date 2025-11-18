require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function find(email) {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const user = await User.findOne({ email: email.toLowerCase() }).lean();
  console.log('Search email:', email);
  if (user) {
    console.log('FOUND user:', JSON.stringify({ id: user._id, email: user.email, name: user.name, isAdmin: user.isAdmin }, null, 2));
  } else {
    console.log('No user found with that email');
  }
  await mongoose.disconnect();
}

const email = process.argv[2] || '';
if (!email) {
  console.error('Usage: node findUser.js someone@example.com');
  process.exit(1);
}

find(email).catch(err => { console.error(err); process.exit(2); });
