// backend/src/controllers/appointmentController.js
const Appointment = require('../models/Appointment');
const Schedule = require('../models/Schedule');
const moment = require('moment'); // Biblioteca para manipulação de datas e horas

// Função auxiliar para gerar slots de tempo
const generateTimeSlots = (startTime, endTime, intervalMinutes = 30) => {
  const slots = [];
  let current = moment(startTime, 'HH:mm');
  const end = moment(endTime, 'HH:mm');

  while (current.isBefore(end)) {
    slots.push(current.format('HH:mm'));
    current.add(intervalMinutes, 'minutes');
  }
  return slots;
};

// Obtém os horários disponíveis para agendamento em uma data específica
exports.getAvailableTimes = async (req, res) => {
  try {
    const { date } = req.params; // Data no formato YYYY-MM-DD
    const { serviceId } = req.query; // ID do serviço para filtrar agendamentos

    if (!moment(date, 'YYYY-MM-DD', true).isValid()) {
      return res.status(400).json({ message: 'Formato de data inválido. Use YYYY-MM-DD.' });
    }

    const selectedDate = moment(date).startOf('day');
    const dayOfWeek = selectedDate.format('dddd'); // Ex: "Sunday", "Monday"
    const dayOfWeekPortuguese = {
      'Sunday': 'Domingo',
      'Monday': 'Segunda-feira',
      'Tuesday': 'Terça-feira',
      'Wednesday': 'Quarta-feira',
      'Thursday': 'Quinta-feira',
      'Friday': 'Sexta-feira',
      'Saturday': 'Sábado'
    }[dayOfWeek];

    const schedule = await Schedule.findOne({ dayOfWeek: dayOfWeekPortuguese });

    if (!schedule) {
      return res.status(200).json([]); // Nenhum horário de atendimento configurado para este dia
    }

    let allPossibleSlots = [];
    schedule.availableTimes.forEach(interval => {
      if (!interval.isBreak) { // Apenas considera intervalos que não são de quebra/bloqueio
        allPossibleSlots = allPossibleSlots.concat(generateTimeSlots(interval.startTime, interval.endTime));
      }
    });

    // Remover duplicatas e ordenar
    allPossibleSlots = [...new Set(allPossibleSlots)].sort();

    // Obter agendamentos existentes para a data e serviço
    const existingAppointments = await Appointment.find({
      date: selectedDate.toDate(),
      service: serviceId,
      status: { $in: ['pending', 'confirmed'] } // Considera agendamentos pendentes ou confirmados
    }).select('time lockedBy'); // Seleciona apenas a hora e o lockedBy

    const bookedTimes = new Set();
    const lockedTimes = new Set();

    existingAppointments.forEach(appt => {
      if (appt.lockedBy) {
        lockedTimes.add(appt.time);
      } else {
        bookedTimes.add(appt.time);
      }
    });

    // Filtrar horários disponíveis
    const availableSlots = allPossibleSlots.map(time => {
      const isBooked = bookedTimes.has(time);
      const isLocked = lockedTimes.has(time); // Temporariamente bloqueado por outro cliente

      return {
        time: time,
        isBooked: isBooked,
        isLocked: isLocked,
        // Se estiver bloqueado, podemos adicionar o ID do socket que o bloqueou (para o frontend saber se é ele mesmo)
        lockedBy: existingAppointments.find(appt => appt.time === time && appt.lockedBy)?.lockedBy || null
      };
    });

    res.status(200).json(availableSlots);

  } catch (error) {
    console.error('Erro ao obter horários disponíveis:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao obter horários disponíveis.' });
  }
};

// Bloqueia temporariamente um horário para um cliente específico
exports.lockTime = async (req, res) => {
  const io = req.app.get('socketio');
  const { date, time, serviceId, socketId } = req.body;

  try {
    const appointmentDate = moment(date).startOf('day').toDate();

    // 1. Verificar se já existe um agendamento definitivo ou bloqueio para este horário/serviço
    const existingAppointment = await Appointment.findOne({
      date: appointmentDate,
      time: time,
      service: serviceId,
      $or: [
        { status: { $in: ['pending', 'confirmed'] } }, // Agendamento definitivo
        { lockedBy: { $ne: null } } // Bloqueio temporário
      ]
    });

    if (existingAppointment) {
      if (existingAppointment.lockedBy === socketId) {
        // Se o horário já está bloqueado por este mesmo socket, apenas retorna sucesso.
        // Isso evita criar múltiplos bloqueios temporários ou erros se o cliente clicar rápido.
        return res.status(200).json({ message: 'Horário já bloqueado por você.', tempAppointmentId: existingAppointment._id });
      } else if (existingAppointment.lockedBy && existingAppointment.lockedBy !== socketId) {
        // Já está bloqueado por outra sessão
        return res.status(409).json({ message: 'Horário indisponível. Já está sendo selecionado por outro cliente.' });
      } else if (!existingAppointment.lockedBy && existingAppointment.status !== 'canceled') {
        // Já está agendado definitivamente
        return res.status(409).json({ message: 'Horário já agendado.' });
      }
    }

    // 2. Tentar criar um "bloqueio temporário" no banco de dados.
    // Isso é feito criando um Appointment com o campo `lockedBy` preenchido.
    // Se a criação falhar por chave duplicada (índice unique em date, time, service),
    // significa que outro cliente conseguiu bloquear/agendar no mesmo instante.
    const tempAppointment = new Appointment({
      clientName: `temp-${socketId}`, // Nome temporário para identificar o bloqueio
      clientPhone: '',
      clientEmail: '',
      service: serviceId,
      date: appointmentDate,
      time: time,
      status: 'pending', // Pode ser 'locked' ou 'temp-pending' se quiser um status mais específico
      lockedBy: socketId
    });

    await tempAppointment.save();

    // Notificar o Admin e outros clientes que o horário está bloqueado
    io.emit('timeLocked', {
      date: moment(appointmentDate).format('YYYY-MM-DD'),
      time: time,
      serviceId: serviceId,
      lockedBy: socketId,
      tempAppointmentId: tempAppointment._id // Envia o ID do bloqueio temporário
    });

    res.status(200).json({ message: 'Horário bloqueado temporariamente.', tempAppointmentId: tempAppointment._id });

  } catch (error) {
    if (error.code === 11000) { // Erro de chave duplicada (índice unique)
      return res.status(409).json({ message: 'Horário já está sendo selecionado por outro cliente ou já foi agendado.' });
    }
    console.error('Erro ao bloquear horário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao bloquear horário.' });
  }
};

// Desbloqueia um horário temporariamente bloqueado
exports.unlockTime = async (req, res) => {
  const io = req.app.get('socketio');
  const { appointmentId, socketId } = req.body;

  try {
    // Apagar o agendamento temporário se o `lockedBy` corresponder ao `socketId`
    const result = await Appointment.deleteOne({ _id: appointmentId, lockedBy: socketId });

    if (result.deletedCount > 0) {
      // Notificar que o horário foi liberado
      io.emit('timeUnlocked', { appointmentId: appointmentId });
      return res.status(200).json({ message: 'Horário desbloqueado.' });
    } else {
      // Se não encontrou ou não pertence a esta sessão, pode ser que já foi agendado
      // ou o bloqueio já foi limpo por outro motivo (ex: desconexão).
      // Retorna 200 OK para indicar que, do ponto de vista do cliente, o horário não está mais bloqueado por ele.
      return res.status(200).json({ message: 'Bloqueio não encontrado ou já liberado.' });
    }
  } catch (error) {
    console.error('Erro ao desbloquear horário:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao desbloquear horário.' });
  }
};


// Cria um novo agendamento (chamado após o cliente confirmar o bloqueio)
exports.createAppointment = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    const { clientName, clientPhone, clientEmail, service, date, time, socketId, tempAppointmentId } = req.body;

    const appointmentDate = moment(date).startOf('day').toDate(); // Normaliza a data para início do dia

    // Tenta encontrar e atualizar o agendamento temporário para torná-lo permanente
    // Ou cria um novo se não houver um temporário (caso de reconexão ou falha anterior)
    let newAppointment;
    if (tempAppointmentId) {
      newAppointment = await Appointment.findOneAndUpdate(
        { _id: tempAppointmentId, lockedBy: socketId },
        {
          clientName,
          clientPhone,
          clientEmail,
          service,
          date: appointmentDate,
          time,
          status: 'pending',
          $unset: { lockedBy: 1 } // Remove o campo lockedBy
        },
        { new: true }
      );
    }

    // Se não encontrou o temporário ou não foi fornecido, tenta criar um novo
    if (!newAppointment) {
      // Verifica novamente se o horário já está permanentemente agendado
      const existingPermanentAppointment = await Appointment.findOne({
        date: appointmentDate,
        time: time,
        service: service,
        status: { $in: ['pending', 'confirmed'] }
      });

      if (existingPermanentAppointment) {
        return res.status(409).json({ message: 'Horário já agendado por outro cliente.' });
      }

      newAppointment = new Appointment({
        clientName,
        clientPhone,
        clientEmail,
        service,
        date: appointmentDate,
        time,
        status: 'pending'
      });
      await newAppointment.save();
    }

    if (!newAppointment) {
      return res.status(400).json({ message: 'Não foi possível confirmar o agendamento. Tente novamente.' });
    }

    // Notificar o Admin em tempo real sobre o novo agendamento
    io.emit('newAppointment', newAppointment);

    res.status(201).json(newAppointment);
  } catch (error) {
    if (error.code === 11000) { // Erro de chave duplicada (índice unique)
      return res.status(409).json({ message: 'Este horário já está agendado.' });
    }
    console.error('Erro ao criar agendamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao criar agendamento.' });
  }
};

// Obtém todos os agendamentos (para o Admin)
exports.getAllAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().populate('service').sort({ date: 1, time: 1 });
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Erro ao obter todos os agendamentos:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao obter agendamentos.' });
  }
};

// Obtém um agendamento específico (pode ser usado para o cliente verificar o próprio agendamento)
exports.getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate('service');
    if (!appointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }
    res.status(200).json(appointment);
  } catch (error) {
    console.error('Erro ao obter agendamento por ID:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao obter agendamento.' });
  }
};

// Atualiza um agendamento (para o Admin)
exports.updateAppointment = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    const updatedAppointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, { new: true }).populate('service');
    if (!updatedAppointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }
    // Notificar o Admin e, se possível, o cliente sobre a atualização
    io.emit('appointmentUpdated', updatedAppointment);
    res.status(200).json(updatedAppointment);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Já existe um agendamento para esta data e horário com este serviço.' });
    }
    console.error('Erro ao atualizar agendamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao atualizar agendamento.' });
  }
};

// Deleta um agendamento (para o Admin)
exports.deleteAppointment = async (req, res) => {
  const io = req.app.get('socketio');
  try {
    const deletedAppointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!deletedAppointment) {
      return res.status(404).json({ message: 'Agendamento não encontrado.' });
    }
    // Notificar o Admin e, se possível, o cliente sobre a exclusão
    io.emit('appointmentDeleted', { id: req.params.id, date: deletedAppointment.date, time: deletedAppointment.time, service: deletedAppointment.service });
    res.status(200).json({ message: 'Agendamento deletado com sucesso.' });
  } catch (error) {
    console.error('Erro ao deletar agendamento:', error);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar agendamento.' });
  }
};