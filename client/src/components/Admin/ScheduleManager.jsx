// frontend/src/components/Admin/ScheduleManager.js
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import MessageBox from '../Common/MessageBox';

const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

const ScheduleManager = () => {
  const [schedules, setSchedules] = useState([]);
  const [selectedDay, setSelectedDay] = useState('');
  const [newInterval, setNewInterval] = useState({ startTime: '09:00', endTime: '17:00', isBreak: false });
  const [editingScheduleId, setEditingScheduleId] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = async () => {
    try {
      const response = await api.get('/admin/schedules');
      setSchedules(response.data);
    } catch (err) {
      console.error('Erro ao buscar horários:', err);
      setMessage('Erro ao carregar horários de atendimento.');
      setMessageType('error');
    }
  };

  const handleAddOrUpdateSchedule = async (e) => {
    e.preventDefault();
    if (!selectedDay) {
      setMessage('Por favor, selecione um dia da semana.');
      setMessageType('warning');
      return;
    }

    const currentSchedule = schedules.find(s => s.dayOfWeek === selectedDay);
    let updatedAvailableTimes = currentSchedule ? [...currentSchedule.availableTimes] : [];

    // Adiciona o novo intervalo
    updatedAvailableTimes.push(newInterval);

    try {
      if (currentSchedule) {
        // Atualiza o horário existente
        const response = await api.put(`/admin/schedules/${currentSchedule._id}`, {
          dayOfWeek: selectedDay,
          availableTimes: updatedAvailableTimes,
        });
        setMessage('Horário de atendimento atualizado com sucesso!');
        setMessageType('success');
      } else {
        // Cria um novo horário
        const response = await api.post('/admin/schedules', {
          dayOfWeek: selectedDay,
          availableTimes: updatedAvailableTimes,
        });
        setMessage('Horário de atendimento criado com sucesso!');
        setMessageType('success');
      }
      fetchSchedules(); // Recarrega a lista
      setNewInterval({ startTime: '09:00', endTime: '17:00', isBreak: false });
      setSelectedDay('');
      setEditingScheduleId(null);
    } catch (err) {
      console.error('Erro ao salvar horário:', err);
      setMessage(err.response?.data?.message || 'Erro ao salvar horário de atendimento.');
      setMessageType('error');
    }
  };

  const handleRemoveInterval = async (scheduleId, intervalIndex) => {
    const scheduleToUpdate = schedules.find(s => s._id === scheduleId);
    if (!scheduleToUpdate) return;

    const updatedAvailableTimes = scheduleToUpdate.availableTimes.filter((_, index) => index !== intervalIndex);

    try {
      await api.put(`/admin/schedules/${scheduleId}`, { availableTimes: updatedAvailableTimes });
      setMessage('Intervalo de horário removido com sucesso!');
      setMessageType('success');
      fetchSchedules();
    } catch (err) {
      console.error('Erro ao remover intervalo:', err);
      setMessage('Erro ao remover intervalo de horário.');
      setMessageType('error');
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar todos os horários para este dia?')) {
      try {
        await api.delete(`/admin/schedules/${id}`);
        setMessage('Horário de atendimento deletado com sucesso!');
        setMessageType('success');
        fetchSchedules();
      } catch (err) {
        console.error('Erro ao deletar horário:', err);
        setMessage('Erro ao deletar horário de atendimento.');
        setMessageType('error');
      }
    }
  };

  return (
    <div className="schedule-manager-container">
      <h2>Gerenciar Horários de Atendimento</h2>
      <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />

      <form onSubmit={handleAddOrUpdateSchedule} className="schedule-form">
        <h3>{editingScheduleId ? 'Editar Horário' : 'Adicionar Horário'}</h3>
        <select
          value={selectedDay}
          onChange={(e) => setSelectedDay(e.target.value)}
          required
        >
          <option value="">Selecione o Dia da Semana</option>
          {daysOfWeek.map(day => (
            <option key={day} value={day} disabled={schedules.some(s => s.dayOfWeek === day && !editingScheduleId)}>
              {day}
            </option>
          ))}
        </select>
        <input
          type="time"
          value={newInterval.startTime}
          onChange={(e) => setNewInterval({ ...newInterval, startTime: e.target.value })}
          required
        />
        <input
          type="time"
          value={newInterval.endTime}
          onChange={(e) => setNewInterval({ ...newInterval, endTime: e.target.value })}
          required
        />
        <label>
          <input
            type="checkbox"
            checked={newInterval.isBreak}
            onChange={(e) => setNewInterval({ ...newInterval, isBreak: e.target.checked })}
          />
          Bloquear Horário (Intervalo)
        </label>
        <button type="submit">{editingScheduleId ? 'Atualizar Intervalo' : 'Adicionar Intervalo'}</button>
      </form>

      <h3>Horários Configurados</h3>
      {schedules.length === 0 ? (
        <p>Nenhum horário de atendimento configurado.</p>
      ) : (
        <div className="schedules-grid">
          {schedules.map(schedule => (
            <div key={schedule._id} className="schedule-card">
              <h4>{schedule.dayOfWeek}</h4>
              <ul>
                {schedule.availableTimes.map((interval, index) => (
                  <li key={index}>
                    {interval.startTime} - {interval.endTime} {interval.isBreak && '(Intervalo)'}
                    <button onClick={() => handleRemoveInterval(schedule._id, index)} className="remove-interval-button">X</button>
                  </li>
                ))}
              </ul>
              <button onClick={() => handleDeleteSchedule(schedule._id)} className="delete-button">Deletar Dia</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ScheduleManager;