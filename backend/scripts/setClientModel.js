require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');

async function main(){
  try{
    const clientId = process.argv[2] || '691ddedb2532790ddbd895e2';
    const model = process.argv[3];
    if(!model){
      console.error('Usage: node setClientModel.js <clientId> <model>');
      process.exit(1);
    }
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const client = await Client.findById(clientId);
    if(!client) { console.error('Client not found'); process.exit(1); }
    client.aiProviderModel = model;
    await client.save();
    console.log('Set aiProviderModel for', clientId, 'to', model);
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e && e.message || e);
    process.exit(1);
  }
}

main();
