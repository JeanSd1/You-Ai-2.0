require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');

async function main(){
  try{
    const clientId = process.argv[2] || '691ddedb2532790ddbd895e2';
    const endpoint = process.argv[3] || 'https://api.publicai.co/v1/complete';
    const header = process.argv[4] || '';

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri){
      throw new Error('MONGODB_URI not set');
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const client = await Client.findById(clientId);
    if(!client){
      console.error('Client not found:', clientId);
      process.exit(1);
    }
    client.aiProviderEndpoint = endpoint;
    client.aiProviderHeader = header;
    await client.save();
    console.log('Updated client:', clientId, 'endpoint=', endpoint, 'header=', header);
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e.message);
    if(e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
