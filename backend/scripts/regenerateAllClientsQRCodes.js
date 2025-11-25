require('dotenv').config();
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const Client = require('../models/Client');
const Prompt = require('../models/Prompt');

async function main(){
  try{
    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const clients = await Client.find({});
    console.log('Found', clients.length, 'clients');

    let totalPrompts = 0;
    let updated = 0;
    for(const client of clients){
      if(!client.phone){
        console.log('- skipping client', client._id, 'no phone');
        continue;
      }
      const serverNumberRaw = process.env.WA_SERVER_NUMBER || (process.env.TWILIO_WHATSAPP_FROM ? process.env.TWILIO_WHATSAPP_FROM.replace('whatsapp:', '') : undefined);
      let targetNumber = serverNumberRaw ? String(serverNumberRaw).replace(/\D/g, '') : String(client.phone || '').replace(/\D/g, '');
      const defaultCountry = process.env.DEFAULT_COUNTRY_CODE;
      if (defaultCountry && targetNumber && !targetNumber.startsWith(defaultCountry) && (targetNumber.length === 10 || targetNumber.length === 11)) {
        targetNumber = `${defaultCountry}${targetNumber}`;
      }

      const prompts = await Prompt.find({ clientId: client._id });
      totalPrompts += prompts.length;
      for(const p of prompts){
        try{
          const finalContent = p.content || p.title || '';
          const messageWithClientTag = `[client:${client._id}|prompt:${p._id}] ${finalContent}`;
          const waLink = `https://wa.me/${targetNumber}?text=${encodeURIComponent(messageWithClientTag)}`;
          const appLink = `whatsapp://send?phone=${targetNumber}&text=${encodeURIComponent(messageWithClientTag)}`;
          const qrCodeDataURL = await QRCode.toDataURL(waLink);
          p.qrCodeUrl = waLink;
          p.qrAppUrl = appLink;
          p.qrCodeData = qrCodeDataURL;
          await p.save();
          updated++;
        }catch(err){
          console.error('Failed updating prompt', p._id, err && err.message);
        }
      }
    }

    console.log('Done. Total prompts scanned:', totalPrompts, 'Updated:', updated);
    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error(e && e.message || e);
    if(e && e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
