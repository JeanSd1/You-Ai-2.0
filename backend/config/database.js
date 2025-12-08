const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Tenta extrair MONGODB_URI do arquivo .env do backend quando a variável
// de ambiente não estiver definida — isso ajuda quando o processo é iniciado
// com um cwd diferente ou quando o dotenv não foi carregado corretamente.
function tryLoadMongoFromEnvFile() {
  if (process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL) return;
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (!fs.existsSync(envPath)) return;
    const raw = fs.readFileSync(envPath, 'utf8');
    const lines = raw.split(/\r?\n/);
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === 'MONGODB_URI' && val) {
        process.env.MONGODB_URI = val;
        console.log('ℹ️ MONGODB_URI carregada a partir de backend/.env (fallback)');
        return;
      }
      // Suporta também MONGO_URI
      if (key === 'MONGO_URI' && val && !process.env.MONGODB_URI) {
        process.env.MONGO_URI = val;
        console.log('ℹ️ MONGO_URI carregada a partir de backend/.env (fallback)');
        return;
      }
    }
  } catch (e) {
    console.error('❌ Falha ao fazer fallback do .env para Mongo URI:', e.message);
  }
}

// Função que estabelece conexão com o MongoDB usando Mongoose.
// Aceita múltiplos nomes de variável de ambiente para compatibilidade
// entre diferentes setups: `MONGODB_URI`, `MONGO_URI` ou `MONGO_URL`.
const connectDB = async () => {
  try {
    // Tenta carregar a URI do .env caso ainda não exista no process.env
    tryLoadMongoFromEnvFile();

    const mongoURI = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_URL;

    if (!mongoURI) {
      // Notifica que a variável de conexão não foi configurada
      throw new Error('MONGODB_URI não está definida no arquivo .env');
    }

    // Conecta usando as opções recomendadas do Mongoose
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
          connectTimeoutMS: 30000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    w: 'majority',
    });

    console.log('✅ MongoDB conectado com sucesso');
    return mongoose.connection;
  } catch (error) {
    // Em ambiente de desenvolvimento, registramos o erro e retornamos null
    // em vez de encerrar o processo. Isso facilita corrigir o .env sem
    // ter que reiniciar manualmente a aplicação durante o debug.
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    console.error('O servidor continuará rodando para permitir debug local. Por favor verifique a variável MONGODB_URI / MONGO_URI no arquivo .env.');
    return null;
  }
};

module.exports = connectDB;
