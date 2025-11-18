require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');

async function remove(email) {
  await mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
  const user = await User.findOneAndDelete({ email: email.toLowerCase() });
  if (user) {
    console.log('Deleted user:', { id: user._id.toString(), email: user.email, name: user.name });
  } else {
    console.log('No user found with that email');
  }
  await mongoose.disconnect();
}

const email = process.argv[2];
if (!email) {
  console.error('Usage: node deleteUser.js someone@example.com');
  process.exit(1);
}

remove(email).catch(err => { console.error(err); process.exit(2); });
