const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');

// Disponibilidade de horários
router.get('/available-times/:date', appointmentController.getAvailableTimes);

// Bloqueio temporário de horário (para evitar duplicação em tempo real)
router.post('/lock-time', appointmentController.lockTime);
router.post('/unlock-time', appointmentController.unlockTime);
// Agendamento
router.post('/appointments', appointmentController.createAppointment);

module.exports = router;