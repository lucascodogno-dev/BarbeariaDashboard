const express = require('express');
const router = express.Router();
const appointmentController = require('../controllers/appointmentController');
const serviceController = require('../controllers/serviceController');
const scheduleController = require('../controllers/scheduleController');

// Serviços
router.post('/services', serviceController.createService);
router.get('/services', serviceController.getServices);
router.put('/services/:id', serviceController.updateService);
router.delete('/services/:id', serviceController.deleteService);

// Agendamentos
router.get('/appointments', appointmentController.getAllAppointments);
router.put('/appointments/:id', appointmentController.updateAppointment);
router.delete('/appointments/:id', appointmentController.deleteAppointment);

// Horários de Atendimento
router.post('/schedules', scheduleController.createSchedule);
router.get('/schedules', scheduleController.getSchedules);
router.put('/schedules/:id', scheduleController.updateSchedule);
router.delete('/schedules/:id', scheduleController.deleteSchedule);

module.exports = router;