require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const { decrypt } = require('../utils/crypto');
const { generateForClient } = require('../services/aiService');

async function main(){
  try{
    const clientId = process.argv[2] || '691ddedb2532790ddbd895e2';
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri){
      throw new Error('MONGODB_URI not set');
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const client = await Client.findById(clientId).lean();
    if(!client){
      console.error('Client not found:', clientId);
      process.exit(1);
    }
    console.log('Client found:', { _id: client._id, name: client.name, phone: client.phone, provider: client.aiProvider });
    if(!client.aiApiKey){
      console.error('No aiApiKey for client');
      process.exit(1);
    }
    const apiKey = decrypt(client.aiApiKey);
    console.log('Decrypted apiKey present:', !!apiKey);

    const provider = client.aiProvider || 'chatgpt';
    console.log('Calling generateForClient with provider:', provider);
    try{
      const options = { model: client.aiProviderModel };
      const reply = await generateForClient({ provider, apiKey, endpoint: client.aiProviderEndpoint, header: client.aiProviderHeader }, 'oi', options);
      console.log('AI reply:', reply);
    }catch(err){
      console.error('AI generation error (full):', err && err.response ? err.response.data || err.response.statusText : err.message);
      if(err.stack) console.error(err.stack);
      process.exit(1);
    }

    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Test failed:', e.message);
    if(e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
