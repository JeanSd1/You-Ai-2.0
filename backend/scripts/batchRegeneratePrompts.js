require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Prompt = require('../models/Prompt');
const Client = require('../models/Client');

async function main(){
  try{
    const clientId = process.argv[2];
    if(!clientId){
      console.error('Usage: node batchRegeneratePrompts.js <clientId>');
      process.exit(1);
    }
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const client = await Client.findById(clientId);
    if(!client) throw new Error('Client not found');
    if(!client.phone) throw new Error('Client has no phone');

    const serverNumberRaw = process.env.WA_SERVER_NUMBER || (process.env.TWILIO_WHATSAPP_FROM ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '') : undefined);
    const targetNumber = serverNumberRaw ? String(serverNumberRaw).replace(/\D/g, '') : String(client.phone).replace(/\D/g, '');

    const prompts = await Prompt.find({ clientId: client._id });
    console.log('Found', prompts.length, 'prompts for client', clientId);
    let updated = 0;
    for(const p of prompts){
      try{
        const finalContent = p.content || p.title || '';
        const messageWithClientTag = `[client:${client._id}|prompt:${p._id}] ${finalContent}`;
        const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(messageWithClientTag)}`;
        const qrCodeDataURL = await QRCode.toDataURL(waLink);
        p.qrCodeUrl = waLink;
        p.qrCodeData = qrCodeDataURL;
        await p.save();
        updated++;
      }catch(e){
        console.error('Failed regenerating prompt', p._id, e && e.message);
      }
    }

    console.log('Regeneration complete. Updated:', updated);
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e && e.message || e);
    if(e && e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
