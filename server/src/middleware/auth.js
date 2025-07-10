// backend/src/middleware/auth.js
const jwt = require('jsonwebtoken'); // Importa jsonwebtoken
const User = require('../models/User'); // Importa o modelo de usuário

// Middleware de proteção de rota
const protect = async (req, res, next) => {
  let token;

  // Verifica se o token está presente no cabeçalho 'Authorization'
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extrai o token (remove 'Bearer ')
      token = req.headers.authorization.split(' ')[1];

      // Verifica o token usando a chave secreta
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Encontra o usuário pelo ID decodificado e anexa ao objeto de requisição (sem a senha)
      req.user = await User.findById(decoded.id).select('-password');
      if (!req.user) {
        return res.status(401).json({ message: 'Não autorizado, usuário não encontrado.' });
      }

      next(); // Prossegue para a próxima função middleware/rota
    } catch (error) {
      console.error('Erro de autenticação:', error);
      res.status(401).json({ message: 'Não autorizado, token falhou.' });
    }
  }

  // Se nenhum token for encontrado
  if (!token) {
    res.status(401).json({ message: 'Não autorizado, nenhum token.' });
  }
};

// Middleware para verificar o papel do usuário (autorização)
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: `Acesso negado. Requer um dos seguintes papéis: ${roles.join(', ')}` });
    }
    next();
  };
};

module.exports = { protect, authorize };
