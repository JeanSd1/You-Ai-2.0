// Carrega variáveis de ambiente do arquivo .env localizado na pasta do backend
const path = require('path');
const dotenv = require('dotenv');
let dotenvResult = dotenv.config({ path: path.join(__dirname, '.env') });

function tryParseEnvWithEncodings(envPath) {
  const fs = require('fs');
  const tryEncodings = ['utf8', 'utf16le', 'latin1'];
  for (const enc of tryEncodings) {
    try {
      const raw = fs.readFileSync(envPath, enc);
      // Normalize possible BOM for utf8 and utf16
      const normalized = raw.replace(/\uFEFF/, '');
      const parsed = dotenv.parse(Buffer.from(normalized));
      const keys = Object.keys(parsed || {});
      if (keys.length > 0) {
        for (const k of keys) {
          if (!(k in process.env)) process.env[k] = parsed[k];
        }
        return { parsed, encoding: enc };
      }
    } catch (e) {
      // continue to next encoding
    }
  }
  return null;
}

if (dotenvResult.error) {
  console.error('❌ Falha ao carregar .env via dotenv:', dotenvResult.error.message);
}

// Relatório básico
const hasMongo = !!process.env.MONGODB_URI;
console.log(`ℹ️ .env carregado: MONGODB_URI ${hasMongo ? 'encontrada' : 'não encontrada'}`);

// Se dotenv não trouxe chaves, tenta parse manual com encodings alternativos
if (!dotenvResult.parsed || Object.keys(dotenvResult.parsed).length === 0) {
  const envPath = path.join(__dirname, '.env');
  try {
    const fs = require('fs');
    if (fs.existsSync(envPath)) {
      const manual = tryParseEnvWithEncodings(envPath);
      if (manual) {
        dotenvResult.parsed = manual.parsed;
        console.log(`ℹ️ .env parseado com sucesso usando encoding: ${manual.encoding}`);
      } else {
        // Mostrar conteúdo bruto escapa para diagnóstico
        try {
          const raw = fs.readFileSync(envPath);
          console.log('ℹ️ Conteúdo cru do .env (escaped):', JSON.stringify(String(raw)));
        } catch (e) {
          console.error('❌ Não foi possível ler .env diretamente:', e.message);
        }
      }
    } else {
      console.log('ℹ️ Arquivo .env não existe em:', envPath);
    }
  } catch (e) {
    console.error('❌ Erro ao tentar parsear .env manualmente:', e.message);
  }
}

if (dotenvResult.parsed) {
  const keys = Object.keys(dotenvResult.parsed);
  const summary = keys.map(k => `${k}(${String(dotenvResult.parsed[k]).length} chars)`).join(', ');
  console.log('ℹ️ Chaves parseadas no .env:', summary || '<nenhuma>');
}

// Importações principais
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Conectar ao banco de dados (tenta usar MONGODB_URI / MONGO_URI)
// O connectDB foi escrito para não encerrar o processo em caso de erro
// para facilitar o debug local — ver `config/database.js`.
connectDB();

// Cria a aplicação Express
const app = express();

// Configuração de CORS: permite requisições do frontend definido em FRONTEND_URL
// `credentials: true` permite cookies/credenciais se forem usados.
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Parse do corpo das requisições em JSON e urlencoded (formulários)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Registra rotas principais da API
// - /api/auth: autenticação e perfil
// - /api/clients: CRUD de clientes (aplicação específica)
// - /api/qrcode: endpoints relacionados a geração/recuperação de QR codes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/qrcode', require('./routes/qrcode'));

// Rota de healthcheck simples (pode ser usada para verificar se o servidor responde)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '🚀 You-Ai Backend está rodando',
  });
});

// Middleware para rotas não encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
  });
});

// Middleware global de erro: captura exceções não tratadas nas rotas
app.use((err, req, res, next) => {
  // Log interno completo do erro para o desenvolvedor
  console.error(err.stack);
  // Retorna uma resposta genérica para o cliente (não vazar detalhes sensíveis)
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor',
    error: err.message,
  });
});

// Porta onde o servidor vai escutar (padrão 3001)
const PORT = process.env.PORT || 3001;

// Inicia o servidor e trata erro de porta em uso para ajudar no debug local
const server = app.listen(PORT, () => {
  console.log(`🚀 You-Ai Backend rodando em porta ${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Porta ${PORT} já está em uso. Verifique processos em execução ou altere a porta em ".env".`);
  } else {
    console.error('❌ Erro no servidor:', err.message);
  }
});
