// backend/src/controllers/scheduleController.js
const Schedule = require('../models/Schedule');

// Cria um novo horário de atendimento para um dia da semana
exports.createSchedule = async (req, res) => {
  try {
    const newSchedule = new Schedule(req.body);
    await newSchedule.save();
    res.status(201).json(newSchedule);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Já existe um horário de atendimento para este dia da semana.' });
    }
    console.error('Erro ao criar horário de atendimento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar horário de atendimento.' });
  }
};

// Obtém todos os horários de atendimento
exports.getSchedules = async (req, res) => {
  try {
    const schedules = await Schedule.find();
    res.status(200).json(schedules);
  } catch (error) {
    console.error('Erro ao obter horários de atendimento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao obter horários de atendimento.' });
  }
};

// Atualiza um horário de atendimento existente
exports.updateSchedule = async (req, res) => {
  try {
    const updatedSchedule = await Schedule.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedSchedule) {
      return res.status(404).json({ message: 'Horário de atendimento não encontrado.' });
    }
    res.status(200).json(updatedSchedule);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Já existe um horário de atendimento para este dia da semana.' });
    }
    console.error('Erro ao atualizar horário de atendimento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar horário de atendimento.' });
  }
};

// Deleta um horário de atendimento
exports.deleteSchedule = async (req, res) => {
  try {
    const deletedSchedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!deletedSchedule) {
      return res.status(404).json({ message: 'Horário de atendimento não encontrado.' });
    }
    res.status(200).json({ message: 'Horário de atendimento deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar horário de atendimento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar horário de atendimento.' });
  }
};
