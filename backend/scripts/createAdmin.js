require('dotenv').config();
const connectDB = require('../config/database');
const User = require('../models/User');

const run = async () => {
  try {
    const [,, emailArg, passwordArg, nameArg] = process.argv;

    const email = emailArg || process.env.ADMIN_EMAIL;
    const password = passwordArg || process.env.ADMIN_PASSWORD;
    const name = nameArg || process.env.ADMIN_NAME || 'Administrator';

    if (!email || !password) {
      console.error('Uso: node scripts/createAdmin.js <email> <password> [name]  OU defina ADMIN_EMAIL e ADMIN_PASSWORD no .env');
      process.exit(1);
    }

    await connectDB();

    let existing = await User.findOne({ email });
    if (existing) {
      console.log('Usuário com esse email já existe. Atualizando para isAdmin=true.');
      existing.isAdmin = true;
      await existing.save();
      console.log('Atualizado para administrador com sucesso.');
      process.exit(0);
    }

    const user = await User.create({ name, email, password, isAdmin: true });
    console.log('Administrador criado com sucesso: ', user.email);
    process.exit(0);
  } catch (error) {
    console.error('Erro ao criar administrador:', error.message);
    process.exit(1);
  }
};

run();
