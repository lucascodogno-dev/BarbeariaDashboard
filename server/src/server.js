// // backend/src/server.js
// const express = require('express');
// const mongoose = require('mongoose');
// const http = require('http');
// const { Server } = require('socket.io');
// const cors = require('cors');
// require('dotenv').config(); // Carrega variáveis de ambiente do .env

// // Importa as rotas
// const adminRoutes = require('./routes/adminRoutes');
// const clientRoutes = require('./routes/clientRoutes');

// const app = express();
// const server = http.createServer(app);

// // Configuração do CORS para o Express (HTTP requests)
// // Permite requisições de qualquer origem, ajuste para a URL do seu frontend em produção
// app.use(cors({
//   origin: '*', // Ex: 'http://localhost:3000' para o frontend
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Content-Type', 'Authorization']
// }));

// app.use(express.json()); // Middleware para parsear JSON no corpo das requisições

// // Configuração do Socket.io com CORS
// const io = new Server(server, {
//   cors: {
//     origin: '*', // Ex: 'http://localhost:3000' para o frontend
//     methods: ['GET', 'POST', 'PUT', 'DELETE'],
//     allowedHeaders: ['Content-Type', 'Authorization']
//   }
// });

// // Conexão com o MongoDB
// const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber_scheduling';
// mongoose.connect(MONGODB_URI, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true,
//   serverSelectionTimeoutMS: 5000 // Aumenta o timeout para conexão inicial
// })
// .then(() => console.log('Conectado ao MongoDB!'))
// .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// // Torna o 'io' (instância do Socket.io) disponível em todas as requisições
// app.set('socketio', io);

// // Rotas da API
// app.use('/api/admin', adminRoutes);
// app.use('/api/client', clientRoutes);

// // Eventos do Socket.io
// io.on('connection', (socket) => {
//   console.log('Cliente conectado ao Socket.io:', socket.id);

//   // Lógica para lidar com a desconexão do cliente
//   socket.on('disconnect', async () => {
//     console.log('Cliente desconectado do Socket.io:', socket.id);
//     // Ao desconectar, limpa quaisquer bloqueios temporários feitos por este socket
//     const Appointment = require('./models/Appointment'); // Importa o modelo aqui para evitar circular dependency
//     try {
//       const result = await Appointment.deleteMany({ lockedBy: socket.id });
//       if (result.deletedCount > 0) {
//         console.log(`Limpeza de ${result.deletedCount} bloqueios temporários para o socket ${socket.id}`);
//         // Notifica outros clientes e o admin que esses horários foram liberados
//         io.emit('timeUnlockedByDisconnect', { socketId: socket.id });
//       }
//     } catch (error) {
//       console.error('Erro ao limpar bloqueios temporários na desconexão:', error);
//     }
//   });

//   // Exemplo de evento customizado (você pode adicionar mais conforme necessário)
//   socket.on('message', (data) => {
//     console.log('Mensagem recebida:', data);
//     io.emit('message', data); // Retransmite a mensagem para todos os clientes conectados
//   });
// });

// // Porta do servidor
// const PORT = process.env.PORT || 3001;
// server.listen(PORT, () => {
//   console.log(`Servidor rodando na porta ${PORT}`);
// });
const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

// Importa as rotas
const adminRoutes = require('./routes/adminRoutes');
const clientRoutes = require('./routes/clientRoutes');
const authRoutes = require('./routes/authRoutes'); // NOVO: Rotas de autenticação

// Importa o middleware de autenticação
const { protect, authorize } = require('./middleware/auth'); // NOVO: Middleware de autenticação

const app = express();
const server = http.createServer(app);

// Configuração do CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuração do Socket.io
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  }
});

// Conexão com o MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/barber_scheduling';
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => console.log('Conectado ao MongoDB!'))
.catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Objeto para armazenar múltiplos bloqueios
const lockedTimes = {};

app.set('socketio', io);

// Rotas da API
// Rotas de Autenticação (não precisam de proteção)
app.use('/api/auth', authRoutes); // NOVO: Adiciona as rotas de autenticação

app.use('/api/client', clientRoutes);
// Rotas do Admin (AGORA PROTEGIDAS)
// Aplica o middleware 'protect' para verificar o token JWT
// E o middleware 'authorize' para garantir que apenas usuários com a role 'admin' acessem
app.use('/api/admin', protect, authorize('admin'), adminRoutes); // ATUALIZADO

// Eventos do Socket.io
io.on('connection', (socket) => {
  console.log('Cliente conectado ao Socket.io:', socket.id);

  // Limpeza de bloqueios ao desconectar
  socket.on('disconnect', async () => {
    console.log('Cliente desconectado do Socket.io:', socket.id);
    
    // Remove todos os bloqueios deste socket
    let locksRemoved = 0;
    for (const key in lockedTimes) {
      lockedTimes[key] = lockedTimes[key].filter(lock => lock.socketId !== socket.id);
      if (lockedTimes[key].length === 0) {
        delete lockedTimes[key];
        locksRemoved++;
      }
    }
    
    if (locksRemoved > 0) {
      io.emit('timeUnlockedByDisconnect', { socketId: socket.id });
      io.emit('activeLocks', lockedTimes);
    }
  });

  // Evento para bloquear horário
  socket.on('timeLocked', (data) => {
    const key = `${data.date}-${data.time}-${data.serviceId}`;
    
    if (!lockedTimes[key]) {
      lockedTimes[key] = [];
    }
    
    // Verifica se já existe um bloqueio para este socket
    const existingLockIndex = lockedTimes[key].findIndex(lock => lock.socketId === socket.id);
    
    if (existingLockIndex === -1) {
      lockedTimes[key].push({
        socketId: socket.id,
        tempAppointmentId: data.tempAppointmentId,
        lockedAt: new Date(),
        clientInfo: data.clientInfo || {}
      });
    } else {
      // Atualiza o bloqueio existente
      lockedTimes[key][existingLockIndex] = {
        ...lockedTimes[key][existingLockIndex],
        lockedAt: new Date()
      };
    }
    
    io.emit('activeLocks', lockedTimes);
    io.emit('timeLocked', { 
      ...data,
      lockedBy: socket.id,
      activeLocks: lockedTimes[key].length
    });
  });

  // Evento para desbloquear horário
  socket.on('timeUnlocked', (data) => {
    const key = `${data.date}-${data.time}-${data.serviceId}`;
    
    if (lockedTimes[key]) {
      lockedTimes[key] = lockedTimes[key].filter(lock => lock.socketId !== socket.id);
      
      if (lockedTimes[key].length === 0) {
        delete lockedTimes[key];
      }
      
      io.emit('activeLocks', lockedTimes);
      io.emit('timeUnlocked', { 
        ...data,
        activeLocks: lockedTimes[key] ? lockedTimes[key].length : 0
      });
    }
  });

  // Evento para limpar bloqueios expirados
  setInterval(() => {
    const now = new Date();
    const timeoutMinutes = 5; // Tempo máximo de bloqueio em minutos
    
    let changed = false;
    for (const key in lockedTimes) {
      const originalLength = lockedTimes[key].length;
      lockedTimes[key] = lockedTimes[key].filter(lock => {
        return (now - new Date(lock.lockedAt)) < timeoutMinutes * 60 * 1000;
      });
      
      if (lockedTimes[key].length === 0) {
        delete lockedTimes[key];
      }
      
      if (lockedTimes[key].length !== originalLength) {
        changed = true;
      }
    }
    
    if (changed) {
      io.emit('activeLocks', lockedTimes);
    }
  }, 60000); // Verifica a cada minuto
});

// Porta do servidor
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});