require('dotenv').config();
const mongoose = require('mongoose');
const Client = require('../models/Client');
const axios = require('axios');

async function main(){
  try{
    const clientId = process.argv[2] || '691ddedb2532790ddbd895e2';
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const client = await Client.findById(clientId).lean();
    if(!client) throw new Error('Client not found: '+clientId);
    if(!client.aiApiKey) throw new Error('No aiApiKey for client');
    const apiKey = client.aiApiKey;
    const endpoints = [
      'https://api.publicai.co/v1/complete',
      'https://api.publicai.co/v1/completions',
      'https://api.publicai.co/v1/chat/completions',
      'https://api.publicai.com/v1/complete',
      'https://api.publicai.com/v1/completions',
      'https://api.publicai.com/v1/chat/completions',
      'https://api.publicai.cloud/v1/complete'
    ];

    for(const e of endpoints){
      try{
        console.log('\nTrying', e);
        const resp = await axios.post(e, { input: 'test' }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 5000 });
        console.log('SUCCESS', e, resp.status, (typeof resp.data === 'string' ? resp.data.slice(0,200) : JSON.stringify(resp.data).slice(0,300)));
      }catch(err){
        if(err.response){
          console.log('RESPONSE', e, err.response.status, JSON.stringify(err.response.data).slice(0,300));
        } else {
          console.log('ERROR', e, err.message);
        }
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Fatal:', e.message);
    if(e.stack) console.error(e.stack);
    process.exit(1);
  }
}
main();
