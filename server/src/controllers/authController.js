// backend/src/controllers/authController.js
const User = require('../models/User'); // Importa o modelo de usuário
const jwt = require('jsonwebtoken');   // Importa jsonwebtoken

// Função auxiliar para gerar um JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '1h', // Token expira em 1 hora
  });
};

// Lógica de login do administrador
exports.adminLogin = async (req, res) => {
  const { username, password } = req.body;

  try {
    // 1. Encontrar o usuário pelo nome de usuário
    const user = await User.findOne({ username });

    // 2. Verificar se o usuário existe e se a senha está correta
    if (user && (await user.matchPassword(password))) {
      // 3. Se as credenciais estiverem corretas, gerar um token JWT
      // E retornar o token junto com as informações do usuário (sem a senha)
      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      // 4. Se as credenciais estiverem incorretas
      res.status(401).json({ message: 'Nome de usuário ou senha inválidos.' });
    }
  } catch (error) {
    console.error('Erro no login do administrador:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao tentar fazer login.' });
  }
};

// Rota para criar um usuário admin (apenas para configuração inicial, remover em produção ou proteger fortemente)
exports.createAdminUser = async (req, res) => {
  const { username, password } = req.body;

  // Validação básica
  if (!username || !password) {
    return res.status(400).json({ message: 'Nome de usuário e senha são obrigatórios.' });
  }

  try {
    // Verifica se já existe um usuário com este nome
    const userExists = await User.findOne({ username });
    if (userExists) {
      return res.status(409).json({ message: 'Nome de usuário já existe.' });
    }

    // Cria o novo usuário com o papel de 'admin'
    const user = await User.create({
      username,
      password,
      role: 'admin',
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      message: 'Usuário administrador criado com sucesso!'
    });
  } catch (error) {
    console.error('Erro ao criar usuário administrador:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar usuário administrador.' });
  }
};
