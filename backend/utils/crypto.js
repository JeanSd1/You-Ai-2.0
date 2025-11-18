const crypto = require('crypto');

const getKey = () => {
  const key = process.env.ENCRYPTION_KEY || '';
  if (!key) throw new Error('ENCRYPTION_KEY is not set');
  // Derive a 32-byte key from the provided passphrase
  return crypto.createHash('sha256').update(key).digest();
};

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(16);
  const key = getKey();
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'base64');
  encrypted += cipher.final('base64');
  // store iv + encrypted (both base64) separated by ':'
  return iv.toString('base64') + ':' + encrypted;
}

function decrypt(encrypted) {
  if (!encrypted) return encrypted;
  try {
    const [ivB64, data] = encrypted.split(':');
    if (!ivB64 || !data) return null;
    const iv = Buffer.from(ivB64, 'base64');
    const key = getKey();
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let decrypted = decipher.update(data, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decrypt error:', err.message);
    return null;
  }
}

module.exports = { encrypt, decrypt };
