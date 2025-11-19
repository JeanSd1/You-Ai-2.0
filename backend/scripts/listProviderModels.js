require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Client = require('../models/Client');
const { decrypt } = require('../utils/crypto');

async function main(){
  try{
    const clientId = process.argv[2] || '691ddedb2532790ddbd895e2';
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const client = await Client.findById(clientId).lean();
    if(!client) {
      console.error('Client not found:', clientId);
      process.exit(1);
    }
    console.log('Client found:', { _id: client._id, name: client.name, provider: client.aiProvider, endpoint: client.aiProviderEndpoint });
    if(!client.aiApiKey){
      console.error('No aiApiKey for client');
      process.exit(1);
    }
    const apiKey = decrypt(client.aiApiKey);
    console.log('Decrypted apiKey present:', !!apiKey);

    // Determine models URL
    let modelsUrl;
    if(client.aiProviderEndpoint){
      try{
        const u = new URL(client.aiProviderEndpoint);
        modelsUrl = u.origin + '/v1/models';
      }catch(e){
        modelsUrl = client.aiProviderEndpoint.replace(/\/+$/, '') + '/v1/models';
      }
    }else{
      if((client.aiProvider||'').toLowerCase() === 'publicai') modelsUrl = 'https://api.publicai.co/v1/models';
      else modelsUrl = 'https://api.openai.com/v1/models';
    }

    console.log('Querying models at:', modelsUrl);
    try{
      const resp = await axios.get(modelsUrl, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 20000 });
      console.log('Models response status:', resp.status);
      console.log(JSON.stringify(resp.data, null, 2));
    }catch(err){
      if(err.response){
        console.error('Provider responded with status', err.response.status);
        console.error('Body:', JSON.stringify(err.response.data, null, 2));
      }else{
        console.error('Request error:', err.message);
      }
      process.exit(1);
    }

    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Failed:', e && e.message || e);
    if(e && e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
