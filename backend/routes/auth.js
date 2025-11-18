const express = require('express');
const { login, getProfile, createUserByAdmin } = require('../controllers/authController');
const protect = require('../middleware/auth');
const adminOnly = require('../middleware/admin');

const router = express.Router();

// Rota: POST /api/auth/login
// - Recebe { email, password } e retorna um JWT em caso de sucesso.
router.post('/login', login);

// Rota: GET /api/auth/profile
// - Protegida por `protect` (verifica JWT). Retorna os dados do usuário autenticado.
router.get('/profile', protect, getProfile);

// Rota: POST /api/auth/create-user
// - Protegida por `protect` + `adminOnly`. Apenas administradores podem criar outros usuários.
// - Foi intencionalmente removido o registro público para evitar criação de contas sem controle.
router.post('/create-user', protect, adminOnly, createUserByAdmin);

module.exports = router;
