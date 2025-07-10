// backend/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Rota para login do administrador
router.post('/login', authController.adminLogin);

// Rota para criar um usuário administrador (USE COM CAUTELA E REMOVA/PROTEJA EM PRODUÇÃO)
router.post('/register-admin', authController.createAdminUser);

module.exports = router;
