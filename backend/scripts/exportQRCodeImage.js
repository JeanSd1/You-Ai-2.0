require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Prompt = require('../models/Prompt');

async function main(){
  try{
    const promptId = process.argv[2] || '691e23aa98de8cfa5b602281';
    const outDir = path.join(__dirname, '..', 'tmp');
    if(!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if(!uri) throw new Error('MONGODB_URI not set');
    await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });

    const prompt = await Prompt.findById(promptId).lean();
    if(!prompt){
      console.error('Prompt not found:', promptId);
      process.exit(1);
    }
    if(!prompt.qrCodeData){
      console.error('Prompt has no qrCodeData');
      process.exit(1);
    }

    const data = prompt.qrCodeData;
    const matches = data.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if(!matches){
      console.error('qrCodeData is not a base64 image data URL');
      process.exit(1);
    }
    const ext = matches[1] === 'jpeg' ? 'jpg' : 'png';
    const b64 = matches[2];
    const buffer = Buffer.from(b64, 'base64');
    const outPath = path.join(outDir, `${promptId}.${ext}`);
    fs.writeFileSync(outPath, buffer);
    console.log('Wrote QR image to', outPath);

    await mongoose.disconnect();
    process.exit(0);
  }catch(e){
    console.error('Error:', e && e.message || e);
    if(e && e.stack) console.error(e.stack);
    process.exit(1);
  }
}

main();
