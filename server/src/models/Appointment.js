const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientPhone: { type: String },
  clientEmail: { type: String },
  service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service', required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true }, // Ex: "10:30"
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'completed', 'canceled'],
    default: 'pending'
  },
  lockedBy: { type: String, default: null } // Usado para bloqueio temporário por sessão (Socket ID)
}, { timestamps: true });

// Adicionar índice composto para evitar agendamentos duplicados no mesmo dia/hora/serviço
// backend/src/models/Appointment.js
appointmentSchema.index({ date: 1, time: 1, service: 1 }, { 
  unique: true,
  partialFilterExpression: {
    status: { $in: ['pending', 'confirmed'] },
    lockedBy: { $exists: false }
  }
});
module.exports = mongoose.model('Appointment', appointmentSchema);