# 🚀 YouAi - Gerador de QR Code com WhatsApp

Sistema completo de geração de QR Codes integrado com WhatsApp para gerenciamento de clientes.

## 📋 Requisitos

- **Node.js** v14+ ([Download](https://nodejs.org/))
- **npm** ou **yarn**
- **MongoDB Atlas** (gratuito) ([Acesse](https://www.mongodb.com/cloud/atlas))

## 🔧 Configuração Inicial

### 1️⃣ Configurar MongoDB Atlas

1. Acesse [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie uma conta gratuita
3. Crie um novo cluster (gratuito)
4. Vá para "Database Access" e crie um usuário
5. Vá para "Network Access" e adicione seu IP (ou 0.0.0.0/0)
6. Copie a string de conexão (será algo como: `mongodb+srv://usuario:senha@cluster.mongodb.net/youai`)

### 2️⃣ Configurar Backend

```powershell
# Abra PowerShell no diretório do projeto

# Entre na pasta do backend
cd backend

# Instale as dependências
npm install

# Crie o arquivo .env baseado no .env.example
Copy-Item .env.example .env

# Edite o arquivo .env com suas credenciais
# Abra .env e adicione:
# MONGODB_URI=seu_mongodb_uri_aqui
# JWT_SECRET=sua_chave_secreta
```

### 3️⃣ Configurar Frontend

```powershell
# Em um novo terminal PowerShell

# Entre na pasta do frontend
cd frontend

# Instale as dependências
npm install

# Crie o arquivo .env baseado no .env.example
Copy-Item .env.example .env

# O arquivo .env já vem configurado corretamente por padrão
```

## 🚀 Iniciar o Projeto

### Terminal 1 - Backend

```powershell
cd backend
npm start
```

Você deve ver:
```
✅ MongoDB conectado com sucesso
🚀 You-Ai Backend rodando em porta 3001
```

### Terminal 2 - Frontend

```powershell
cd frontend
npm run dev
```

Você verá algo como:
```
Local:   http://localhost:5173/
```

## 📱 Como Usar

1. **Abra** `http://localhost:5173` no navegador
2. **Registre-se** com seu email e senha
3. **Crie clientes** no painel (nome e telefone obrigatórios)
4. **Gere QR Codes** selecionando um cliente e digitando o conteúdo
5. **Baixe** ou **compartilhe** os QR Codes gerados

## 📁 Estrutura do Projeto

```
You-Ai-2.0/
├── backend/
│   ├── config/
│   │   └── database.js          # Conexão MongoDB
│   ├── controllers/
│   │   ├── authController.js    # Autenticação
│   │   ├── clientController.js  # Clientes
│   │   └── qrcodeController.js  # QR Codes
│   ├── middleware/
│   │   └── auth.js              # JWT Middleware
│   ├── models/
│   │   ├── User.js              # Schema de Usuário
│   │   ├── Client.js            # Schema de Cliente
│   │   └── Prompt.js            # Schema de QR Code
│   ├── routes/
│   │   ├── auth.js              # Rotas de Auth
│   │   ├── clients.js           # Rotas de Clientes
│   │   └── qrcode.js            # Rotas de QR Code
│   ├── server.js                # Servidor Express
│   ├── package.json
│   └── .env                     # Variáveis de ambiente
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Login.jsx           # Página de Login
    │   │   ├── Dashboard.jsx       # Painel Principal
    │   │   ├── CreateClient.jsx    # Criar Cliente
    │   │   └── QRCodeGenerator.jsx # Gerar QR Code
    │   ├── styles/
    │   │   ├── Login.css
    │   │   ├── Dashboard.css
    │   │   ├── CreateClient.css
    │   │   └── QRCodeGenerator.css
    │   ├── App.jsx                # App Principal
    │   ├── main.jsx               # Entry Point
    │   └── index.css              # Estilos Globais
    ├── index.html
    ├── vite.config.js
    ├── package.json
    └── .env                       # Variáveis de ambiente
```

## 🔌 Endpoints da API

### Autenticação
- `POST /api/auth/register` - Registrar novo usuário
- `POST /api/auth/login` - Fazer login
- `GET /api/auth/profile` - Obter perfil (protegido)

### Clientes
- `POST /api/clients` - Criar cliente (protegido)
- `GET /api/clients` - Listar clientes (protegido)
- `GET /api/clients/:id` - Obter cliente (protegido)
- `PUT /api/clients/:id` - Atualizar cliente (protegido)
- `DELETE /api/clients/:id` - Deletar cliente (protegido)

### QR Codes
- `POST /api/qrcode/generate` - Gerar QR Code (protegido)
- `GET /api/qrcode` - Listar QR Codes (protegido)
- `GET /api/qrcode/:id` - Obter QR Code (protegido)
- `POST /api/qrcode/send-whatsapp` - Enviar via WhatsApp (protegido)
- `DELETE /api/qrcode/:id` - Deletar QR Code (protegido)

## 🛠️ Tecnologias Utilizadas

### Backend
- **Express.js** - Framework web
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação
- **bcryptjs** - Hash de senhas
- **qrcode** - Geração de QR Codes
- **CORS** - Comunicação entre frontend e backend

### Frontend
- **React 18** - Biblioteca UI
- **Vite** - Build tool
- **Axios** - HTTP Client
- **CSS3** - Estilização

## 🐛 Troubleshooting

### Erro de Conexão MongoDB
```
❌ MONGODB_URI não está definida no arquivo .env
```
**Solução:** Verifique se o arquivo `.env` existe e tem a variável `MONGODB_URI` configurada corretamente.

### Erro CORS
```
Access to XMLHttpRequest blocked by CORS policy
```
**Solução:** Verifique se o backend está rodando na porta 3001 e se a variável `FRONTEND_URL` está correta no `.env`.

### Porta já em uso
```
listen EADDRINUSE: address already in use :::3001
```
**Solução:** 
```powershell
# Encontre o processo usando a porta 3001 e encerre
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Erro ao instalar dependências
```powershell
# Limpe o cache do npm
npm cache clean --force

# Reinstale as dependências
rm -r node_modules
npm install
```

## 📝 Variáveis de Ambiente

### Backend (.env)
```
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/youai
JWT_SECRET=sua_chave_super_secreta_aqui
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001
VITE_APP_NAME=YouAi
```

## 🚢 Deploy

### Deploy do Backend (Render, Heroku, etc)
1. Configure as variáveis de ambiente no painel do serviço
2. Adicione o seu IP/domínio ao MongoDB Atlas Network Access
3. Configure o start script: `npm start`

### Deploy do Frontend (Vercel, Netlify, etc)
1. Configure `VITE_API_URL` apontando para seu backend em produção
2. Execute: `npm run build`
3. Deploy o diretório `dist`

## 📞 Suporte

Para dúvidas ou problemas, abra uma issue no repositório.

## 📄 Licença

MIT

---

**Desenvolvido com ❤️ para facilitar o gerenciamento de clientes e comunicação via WhatsApp**
