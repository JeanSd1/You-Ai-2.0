require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');

async function main(){
  try{
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri){
      console.error('MONGODB_URI not set in env');
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const clients = await Client.find({}).limit(50).lean();
    console.log(JSON.stringify(clients.map(c=>({ _id: c._id, name: c.name, phone: c.phone, aiApiKeyPresent: !!c.aiApiKey })), null, 2));
    await mongoose.disconnect();
  }catch(err){
    console.error('Error', err);
    process.exit(1);
  }
}

main();
