const User = require('../models/User');

const adminOnly = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('isAdmin');
    if (!user || !user.isAdmin) {
      return res.status(403).json({ success: false, message: 'Acesso negado. Requer permissão de administrador.' });
    }
    next();
  } catch (error) {
    console.error('Erro no middleware admin:', error.message);
    res.status(500).json({ success: false, message: 'Erro do servidor' });
  }
};

module.exports = adminOnly;
