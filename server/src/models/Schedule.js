const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  dayOfWeek: {
    type: String,
    required: true,
    enum: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
    unique: true // Garante que não haverá dias duplicados
  },
  availableTimes: [
    {
      startTime: { type: String, required: true }, // Ex: "09:00"
      endTime: { type: String, required: true },   // Ex: "17:00"
      isBreak: { type: Boolean, default: false }    // Indica se é um intervalo/bloqueio
    }
  ]
});

module.exports = mongoose.model('Schedule', scheduleSchema);