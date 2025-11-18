const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Gerar Token JWT com o `JWT_SECRET` do .env
// O token carrega apenas o id do usuário e expira em 7 dias.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

// ============== Rota: createUserByAdmin ==============
// Cria um novo usuário. Esta rota deve ser protegida por middleware
// que valida se o requisitante é um administrador (isAdmin=true).
// Uso: rota chamada por admin para criar contas de usuário.
exports.createUserByAdmin = async (req, res) => {
  try {
    const { name, email, password, phone, company, isAdmin } = req.body;

    // Validação básica de campos obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Nome, email e senha são obrigatórios' });
    }

    // Verifica se já existe um usuário com esse email
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ success: false, message: 'Email já registrado' });
    }

    // Cria e salva o novo usuário (o hashing da senha é feito no model)
    user = await User.create({
      name,
      email,
      password,
      phone,
      company,
      isAdmin: !!isAdmin,
    });

    // Retorna dados mínimos do usuário criado (não inclui senha)
    res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error('Erro ao criar usuário pelo admin:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao criar usuário', error: error.message });
  }
};

// ============== Rota: login ==============
// Faz a autenticação do usuário por email/senha.
// Também suporta um "login mestre" definido por variáveis de ambiente
// `LOGIN_FIXO_EMAIL` e `LOGIN_FIXO_SENHA`. Esse login mestre cria ou promove
// automaticamente o usuário a administrador (útil para setup inicial).
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Se as variáveis de ambiente do login mestre estiverem configuradas
    // e as credenciais vierem iguais, criamos/promovemos o admin automaticamente.
    if (
      process.env.LOGIN_FIXO_EMAIL &&
      process.env.LOGIN_FIXO_SENHA &&
      email === process.env.LOGIN_FIXO_EMAIL &&
      password === process.env.LOGIN_FIXO_SENHA
    ) {
      // Busca usuário existente
      let admin = await User.findOne({ email });
      if (!admin) {
        // Cria usuário admin (senha será hashed pelo model)
        admin = await User.create({
          name: process.env.LOGIN_FIXO_NAME || 'Master Admin',
          email,
          password,
          isAdmin: true,
        });
      } else if (!admin.isAdmin) {
        // Se existir mas não for admin, promove para admin
        admin.isAdmin = true;
        await admin.save();
      }

      // Emite token JWT para uso pelo frontend
      const token = generateToken(admin._id);

      return res.status(200).json({
        success: true,
        token,
        user: {
          id: admin._id,
          name: admin.name,
          email: admin.email,
          isAdmin: admin.isAdmin,
        },
      });
    }

    // Validação de entrada
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email e senha são obrigatórios',
      });
    }

    // Busca usuário e traz o campo `password` para comparação
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
      });
    }

    // Compara a senha enviada com a senha hash armazenada
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
      });
    }

    // Gera token JWT e retorna dados básicos do usuário
    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao fazer login',
      error: error.message,
    });
  }
};

// ============== Rota: getProfile ==============
// Retorna os dados do usuário atualmente autenticado. O middleware `protect`
// deve injetar `req.user` com o id do usuário (ver `middleware/auth.js`).
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao obter perfil',
      error: error.message,
    });
  }
};
