const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Definição do schema do usuário
// Campos principais:
// - name, email, password: informações básicas de autenticação
// - phone, company: dados opcionais do cliente
// - isAdmin: flag que indica se o usuário tem permissão de administrador
// - isActive: flag para desativar conta sem remover do banco
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Nome é obrigatório'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email é obrigatório'],
      unique: true,
      lowercase: true,
      // Validação simples de formato de email
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido'],
    },
    password: {
      type: String,
      required: [true, 'Senha é obrigatória'],
      minlength: 6,
      // `select: false` evita que a senha seja retornada por padrão em queries
      select: false,
    },
    phone: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Antes de salvar, se a senha foi modificada, faz hashing com bcrypt
userSchema.pre('save', async function (next) {
  // `this` é o documento atual. Se a senha não foi alterada, passa adiante.
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método de instância para comparar uma senha em texto com o hash armazenado
userSchema.methods.comparePassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
