const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Gerar Token JWT com o `JWT_SECRET` do .env
// O token carrega apenas o id do usuário e expira em 7 dias.
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const crypto = require('crypto');
const nodemailer = require('nodemailer');

// Helper: create nodemailer transporter if SMTP env vars provided
const getTransporter = () => {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
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

    // Send credentials email if SMTP configured
    try {
      const transporter = getTransporter();
      if (transporter) {
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: email,
          subject: 'Sua conta foi criada',
          text: `Olá ${name},\n\nSua conta no YouAi foi criada.\nEmail: ${email}\nSenha: ${password}\n\nAcesse: ${frontendUrl} e faça login.\n\nAtenciosamente,\nEquipe YouAi`,
        };

        await transporter.sendMail(mailOptions);
      }
    } catch (mailErr) {
      console.error('Erro ao enviar email de criação de conta:', mailErr.message);
    }

    // Retorna dados mínimos do usuário criado (não inclui senha)
    res.status(201).json({ success: true, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    console.error('Erro ao criar usuário pelo admin:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao criar usuário', error: error.message });
  }
};

// ============== Forgot password ==============
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email é obrigatório' });

    const user = await User.findOne({ email });
    if (!user) return res.status(200).json({ success: true, message: 'Se o email existir, enviamos instruções' });

    const token = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    const transporter = getTransporter();
    if (transporter) {
      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}?resetToken=${token}`;
      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: email,
        subject: 'YouAi - Redefinição de senha',
        text: `Você solicitou redefinir sua senha. Acesse o link abaixo e escolha uma nova senha (válido por 1 hora):\n\n${resetUrl}\n\nSe você não solicitou, ignore este email.`,
      };

      await transporter.sendMail(mailOptions);
    }

    res.status(200).json({ success: true, message: 'Se o email existir, enviamos instruções' });
  } catch (error) {
    console.error('Erro em forgotPassword:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao processar solicitação' });
  }
};

// ============== Reset password ==============
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) return res.status(400).json({ success: false, message: 'Token e nova senha são obrigatórios' });

    const user = await User.findOne({ resetPasswordToken: token, resetPasswordExpires: { $gt: Date.now() } }).select('+password');
    if (!user) return res.status(400).json({ success: false, message: 'Token inválido ou expirado' });

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({ success: true, message: 'Senha redefinida com sucesso' });
  } catch (error) {
    console.error('Erro em resetPassword:', error.message);
    res.status(500).json({ success: false, message: 'Erro ao resetar senha' });
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
    const emailLower = email ? email.toLowerCase() : '';
    if (
      process.env.LOGIN_FIXO_EMAIL &&
      process.env.LOGIN_FIXO_SENHA &&
      emailLower === (process.env.LOGIN_FIXO_EMAIL || '').toLowerCase() &&
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

    // Log de tentativa (útil para debug)
    console.log(`Login attempt for: ${emailLower}`);

    // Busca usuário (normalizando email) e traz o campo `password` para comparação
    const user = await User.findOne({ email: emailLower }).select('+password');

    if (!user) {
      console.warn(`Login failed: user not found for ${emailLower}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
      });
    }

    // Compara a senha enviada com a senha hash armazenada
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      console.warn(`Login failed: invalid password for ${emailLower}`);
      return res.status(401).json({
        success: false,
        message: 'Credenciais inválidas',
      });
    }

    // Gera token JWT e retorna dados básicos do usuário
    const token = generateToken(user._id);

    console.log(`Login success for: ${emailLower}`);

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

