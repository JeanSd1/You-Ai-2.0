require('dotenv').config();
const mongoose = require('mongoose');
const Prompt = require('../models/Prompt');

async function main(){
  try{
    const clientId = process.argv[2] || '691ddedb2532790ddbd895e2';
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri){
      console.error('MONGODB_URI not set');
      process.exit(1);
    }
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    const prompts = await Prompt.find({ clientId }).sort({ createdAt: -1 }).lean();
    if(!prompts || prompts.length === 0){
      console.log('Nenhum Prompt/QR encontrado para o clientId:', clientId);
    } else {
      console.log('Prompts encontrados:', prompts.length);
      console.log(JSON.stringify(prompts.map(p=>({ _id: p._id, title: p.title, qrCodeUrl: p.qrCodeUrl, qrAppUrl: p.qrAppUrl, hasData: !!p.qrCodeData, createdAt: p.createdAt })), null, 2));
    }
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Erro:', e && e.message || e);
    if(e && e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
