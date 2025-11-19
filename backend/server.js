// Carrega variáveis de ambiente do arquivo .env localizado na pasta do backend
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

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

// Start billing job (reminders & automatic inactivation)
try {
  const billingJob = require('./services/billingJob');
  // run hourly in development; in production you can run less frequently
  billingJob.start(process.env.BILLING_INTERVAL_MS ? parseInt(process.env.BILLING_INTERVAL_MS, 10) : 1000 * 60 * 60);
} catch (err) {
  console.error('Failed to start billing job:', err.message);
}
