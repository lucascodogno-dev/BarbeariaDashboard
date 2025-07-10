// backend/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs'); // Importa bcryptjs para hash de senhas

// Define o schema para o usuário
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true, // Garante que o nome de usuário seja único
    trim: true    // Remove espaços em branco do início e fim
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['admin', 'barber'], // Define os papéis possíveis para o usuário
    default: 'admin' // Por padrão, será 'admin' para este caso
  }
}, { timestamps: true }); // Adiciona `createdAt` e `updatedAt`

// Middleware (pré-save) para fazer hash da senha antes de salvar no banco de dados
userSchema.pre('save', async function(next) {
  // Só faz hash da senha se ela foi modificada (ou é nova)
  if (!this.isModified('password')) {
    return next();
  }
  try {
    const salt = await bcrypt.genSalt(10); // Gera um salt com custo de 10
    this.password = await bcrypt.hash(this.password, salt); // Faz o hash da senha
    next();
  } catch (error) {
    next(error); // Passa o erro para o próximo middleware
  }
});

// Método para comparar a senha fornecida com a senha hash no banco de dados
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Exporta o modelo 'User'
module.exports = mongoose.model('User', userSchema);