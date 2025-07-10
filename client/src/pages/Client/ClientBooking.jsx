// frontend/src/pages/Client/ClientBooking.js
import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import moment from 'moment'; // Biblioteca para manipulação de datas e horas
import api from '../../api/api'; // Instância do Axios para requisições HTTP
import MessageBox from '../../components/Common/MessageBox'; // Componente para exibir mensagens ao usuário
import '../../styles/ClientBooking.css'; // Estilos específicos para a página do cliente

const ClientBooking = () => {
  const socket = useSocket(); // Hook para acessar a instância do Socket.io
  const [step, setStep] = useState(1); // Controla o passo atual do processo de agendamento (1: Info Cliente, 2: Seleção, 3: Confirmação)
  const [clientInfo, setClientInfo] = useState({ name: '', phone: '', email: '' }); // Informações do cliente
  const [selectedDate, setSelectedDate] = useState(null); // Data selecionada para o agendamento
  const [availableTimes, setAvailableTimes] = useState([]); // Horários disponíveis para a data e serviço selecionados
  const [selectedTime, setSelectedTime] = useState(null); // Horário selecionado pelo cliente
  const [services, setServices] = useState([]); // Lista de serviços disponíveis na barbearia
  const [selectedService, setSelectedService] = useState(''); // ID do serviço selecionado
  // Estado para gerenciar o horário temporariamente bloqueado pela sessão do cliente
  const [lockedTime, setLockedTime] = useState(null); // { date, time, serviceId, socketId, tempAppointmentId }
  const [myPastAppointment, setMyPastAppointment] = useState(null); // Agendamento salvo no Local Storage
  const [message, setMessage] = useState(null); // Mensagem para exibir ao usuário
  const [messageType, setMessageType] = useState('info'); // Tipo da mensagem (info, success, error, warning)

  // Efeito para carregar os serviços disponíveis da API ao montar o componente
  useEffect(() => {
    const fetchServices = async () => {
      try {
        const response = await api.get('/admin/services');
        setServices(response.data);
        if (response.data.length > 0) {
          setSelectedService(response.data[0]._id); // Seleciona o primeiro serviço por padrão
        }
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        setMessage('Erro ao carregar serviços disponíveis.');
        setMessageType('error');
      }
    };
    fetchServices();
  }, []); // Executa apenas uma vez na montagem

  // Efeito para verificar e remover agendamentos passados do Local Storage
  useEffect(() => {
    const storedAppointment = localStorage.getItem('myBarberAppointment');
    if (storedAppointment) {
      try {
        const appt = JSON.parse(storedAppointment);
        // Converte a data e hora do agendamento para um objeto Moment para comparação
        const appointmentDateTime = moment(`${moment(appt.date).format('YYYY-MM-DD')} ${appt.time}`, 'YYYY-MM-DD HH:mm');

        // Se o agendamento já passou, remove-o do Local Storage
        if (appointmentDateTime.isBefore(moment())) {
          console.log('Agendamento passado, removendo do Local Storage.');
          localStorage.removeItem('myBarberAppointment');
          setMyPastAppointment(null);
          setMessage('Seu agendamento anterior já passou e foi removido.');
          setMessageType('info');
        } else {
          // Se o agendamento ainda não passou, mantém no estado
          setMyPastAppointment(appt);
          setMessage(`Você tem um agendamento para ${moment(appt.date).format('DD/MM/YYYY')} às ${appt.time}.`);
          setMessageType('info');
        }
      } catch (e) {
        console.error('Erro ao parsear agendamento do Local Storage:', e);
        localStorage.removeItem('myBarberAppointment'); // Limpa dados corrompidos
      }
    }
  }, []); // Executa apenas uma vez na montagem

  // Efeito para configurar os listeners do Socket.io para atualizações em tempo real
  useEffect(() => {
    if (!socket) return; // Não faz nada se o socket não estiver conectado

    // Listener para quando um horário é bloqueado por qualquer cliente (incluindo esta sessão)
    socket.on('timeLocked', ({ date, time, serviceId, lockedBy, tempAppointmentId }) => {
      // Atualiza a lista de horários disponíveis apenas se a data e o serviço corresponderem à seleção atual
      if (selectedDate && moment(date).isSame(selectedDate, 'day') && selectedService === serviceId) {
        setAvailableTimes(prevTimes =>
          prevTimes.map(slot =>
            slot.time === time
              ? { ...slot, isLocked: true, lockedBy: lockedBy, tempAppointmentId: tempAppointmentId }
              : slot
          )
        );
      }
    });

    // Listener para quando um horário é desbloqueado
    socket.on('timeUnlocked', ({ appointmentId }) => {
      setAvailableTimes(prevTimes =>
        prevTimes.map(slot =>
          slot.tempAppointmentId === appointmentId // Identifica o slot pelo ID do agendamento temporário
            ? { ...slot, isLocked: false, lockedBy: null, tempAppointmentId: null }
            : slot
        )
      );
    });

    // Listener para quando um horário é desbloqueado devido à desconexão de um cliente
    socket.on('timeUnlockedByDisconnect', ({ socketId: disconnectedSocketId }) => {
      setAvailableTimes(prevTimes =>
        prevTimes.map(slot =>
          slot.lockedBy === disconnectedSocketId // Identifica slots bloqueados por aquele socket ID
            ? { ...slot, isLocked: false, lockedBy: null, tempAppointmentId: null }
            : slot
        )
      );
      setMessage(`Um horário que estava em seleção foi liberado devido à desconexão de um cliente.`);
      setMessageType('info');
    });

    // Listener para quando um novo agendamento é criado (notifica todos os clientes e o admin)
    socket.on('newAppointment', (newAppointment) => {
      if (selectedDate && moment(newAppointment.date).isSame(selectedDate, 'day') && selectedService === newAppointment.service) {
        setAvailableTimes(prevTimes =>
          prevTimes.map(slot =>
            slot.time === newAppointment.time
              ? { ...slot, isBooked: true, isLocked: false, lockedBy: null, tempAppointmentId: null }
              : slot
          )
        );
        // Se o agendamento recém-criado foi feito por este cliente, atualiza o Local Storage
        if (newAppointment.clientName === clientInfo.name && newAppointment.time === selectedTime) {
          localStorage.setItem('myBarberAppointment', JSON.stringify(newAppointment));
          setMyPastAppointment(newAppointment);
        }
      }
    });

    // Listener para quando um agendamento é atualizado pelo admin (ex: status mudou)
    socket.on('appointmentUpdated', (updatedAppointment) => {
      // Se o agendamento atualizado for o que está salvo no Local Storage deste cliente
      if (myPastAppointment && myPastAppointment._id === updatedAppointment._id) {
        setMyPastAppointment(updatedAppointment);
        setMessage(`Seu agendamento para ${moment(updatedAppointment.date).format('DD/MM/YYYY')} às ${updatedAppointment.time} foi atualizado para status: ${updatedAppointment.status}.`);
        setMessageType('info');
      }
      // Se a atualização afetar um horário visível na tela de seleção (ex: status mudou para 'cancelado', liberando o horário)
      if (selectedDate && moment(updatedAppointment.date).isSame(selectedDate, 'day') && selectedService === updatedAppointment.service._id) {
        setAvailableTimes(prevTimes =>
          prevTimes.map(slot =>
            slot.time === updatedAppointment.time
              ? {
                  ...slot,
                  isBooked: updatedAppointment.status !== 'canceled', // Se não for cancelado, continua como agendado
                  isLocked: false, // Garante que não está mais bloqueado temporariamente
                  lockedBy: null,
                  tempAppointmentId: null
                }
              : slot
          )
        );
      }
    });

    // Listener para quando um agendamento é deletado pelo admin
    socket.on('appointmentDeleted', ({ id, date, time, service }) => {
      // Se o agendamento deletado for o que está salvo no Local Storage deste cliente
      if (myPastAppointment && myPastAppointment._id === id) {
        localStorage.removeItem('myBarberAppointment');
        setMyPastAppointment(null);
        setMessage(`Seu agendamento para ${moment(date).format('DD/MM/YYYY')} às ${time} foi cancelado pelo administrador.`);
        setMessageType('warning');
      }
      // Atualiza a visualização de horários disponíveis, liberando o slot
      if (selectedDate && moment(date).isSame(selectedDate, 'day') && selectedService === service) {
         setAvailableTimes(prevTimes =>
          prevTimes.map(slot =>
            slot.time === time
              ? { ...slot, isBooked: false, isLocked: false, lockedBy: null, tempAppointmentId: null }
              : slot
          )
        );
      }
    });

    // Função de limpeza: remove os listeners do socket ao desmontar o componente
    return () => {
      if (socket) {
        socket.off('timeLocked');
        socket.off('timeUnlocked');
        socket.off('timeUnlockedByDisconnect');
        socket.off('newAppointment');
        socket.off('appointmentUpdated');
        socket.off('appointmentDeleted');
      }
    };
  }, [socket, selectedDate, selectedService, clientInfo.name, selectedTime, myPastAppointment]); // Dependências para re-registrar listeners se necessário

  // Lida com o envio das informações iniciais do cliente
  const handleClientInfoSubmit = (e) => {
    e.preventDefault();
    if (!clientInfo.name.trim()) {
      setMessage('Por favor, digite seu nome.');
      setMessageType('warning');
      return;
    }
    setStep(2); // Avança para o próximo passo
    setMessage(null); // Limpa mensagens anteriores
  };

  // Função useCallback para buscar horários disponíveis, otimizando performance
  const fetchAvailableTimes = useCallback(async (dateToFetch, serviceIdToFetch) => {
    try {
      const formattedDate = moment(dateToFetch).format('YYYY-MM-DD');
      const response = await api.get(`/client/available-times/${formattedDate}?serviceId=${serviceIdToFetch}`);
      setAvailableTimes(response.data);
      setMessage(null); // Limpa qualquer erro anterior
    } catch (error) {
      console.error('Erro ao carregar horários disponíveis:', error);
      setMessage('Erro ao carregar horários disponíveis para esta data e serviço.');
      setMessageType('error');
      setAvailableTimes([]); // Limpa a lista em caso de erro
    }
  }, []); // Dependência vazia, pois as variáveis são passadas como argumentos

  // Lida com a mudança da data selecionada
  const handleDateChange = (date) => {
    setSelectedDate(date);
    setSelectedTime(null); // Limpa o horário selecionado ao mudar a data

    // Se houver um horário bloqueado anteriormente por esta sessão, tenta liberá-lo
    if (lockedTime && socket) {
      api.post('/client/unlock-time', { appointmentId: lockedTime.tempAppointmentId, socketId: socket.id })
        .then(() => {
          setLockedTime(null); // Limpa o estado de bloqueio
          // Atualiza o slot no estado local para refletir o desbloqueio visualmente
          setAvailableTimes(prevTimes =>
            prevTimes.map(slot =>
              slot.tempAppointmentId === lockedTime.tempAppointmentId
                ? { ...slot, isLocked: false, lockedBy: null, tempAppointmentId: null }
                : slot
            )
          );
        })
        .catch(err => console.error('Erro ao desbloquear horário anterior ao mudar data:', err));
    }
    // Se a data e o serviço estiverem selecionados, busca os novos horários
    if (date && selectedService) {
      fetchAvailableTimes(date, selectedService);
    }
  };

  // Lida com a mudança do serviço selecionado
  const handleServiceChange = (serviceId) => {
    setSelectedService(serviceId);
    setSelectedTime(null); // Limpa o horário selecionado ao mudar o serviço

    // Se houver um horário bloqueado anteriormente por esta sessão, tenta liberá-lo
    if (lockedTime && socket) {
      api.post('/client/unlock-time', { appointmentId: lockedTime.tempAppointmentId, socketId: socket.id })
        .then(() => {
          setLockedTime(null); // Limpa o estado de bloqueio
          // Atualiza o slot no estado local para refletir o desbloqueio visualmente
          setAvailableTimes(prevTimes =>
            prevTimes.map(slot =>
              slot.tempAppointmentId === lockedTime.tempAppointmentId
                ? { ...slot, isLocked: false, lockedBy: null, tempAppointmentId: null }
                : slot
            )
          );
        })
        .catch(err => console.error('Erro ao desbloquear horário anterior ao mudar serviço:', err));
    }
    // Se a data e o serviço estiverem selecionados, busca os novos horários
    if (selectedDate && serviceId) {
      fetchAvailableTimes(selectedDate, serviceId);
    }
  };

  // Lida com a seleção de um horário disponível
  const handleTimeSelect = useCallback(async (timeSlot) => {
    // Verifica se o socket está conectado e se o horário não está já bloqueado ou agendado
    if (!socket || timeSlot.isLocked || timeSlot.isBooked) {
      setMessage('Este horário não está disponível.');
      setMessageType('warning');
      return;
    }

    // PASSO 1: DESBLOQUEAR O HORÁRIO ANTERIOR (se houver e pertencer a esta sessão)
    if (lockedTime && lockedTime.tempAppointmentId && lockedTime.socketId === socket.id) {
      try {
        await api.post('/client/unlock-time', { appointmentId: lockedTime.tempAppointmentId, socketId: socket.id });
        // Atualiza o estado local para refletir o desbloqueio do slot anterior
        setAvailableTimes(prevTimes =>
          prevTimes.map(slot =>
            slot.tempAppointmentId === lockedTime.tempAppointmentId
              ? { ...slot, isLocked: false, lockedBy: null, tempAppointmentId: null }
              : slot
          )
        );
        setLockedTime(null); // Limpa o bloqueio anterior do estado
        setSelectedTime(null); // Limpa a seleção visual anterior
      } catch (err) {
        console.error('Erro ao tentar desbloquear horário anterior:', err);
        // Não exibe um erro grave aqui para o usuário, pois o objetivo é prosseguir com o novo bloqueio.
        // Apenas loga o erro para depuração.
      }
    }

    // PASSO 2: TENTAR BLOQUEAR O NOVO HORÁRIO
    try {
      const response = await api.post('/client/lock-time', {
        date: moment(selectedDate).format('YYYY-MM-DD'),
        time: timeSlot.time,
        serviceId: selectedService,
        socketId: socket.id
      });

      if (response.status === 200) {
        setSelectedTime(timeSlot.time); // Define o horário selecionado
        // Armazena as informações do bloqueio temporário
        setLockedTime({
          date: moment(selectedDate).format('YYYY-MM-DD'),
          time: timeSlot.time,
          serviceId: selectedService,
          socketId: socket.id,
          tempAppointmentId: response.data.tempAppointmentId
        });
        // Atualiza o estado local para refletir o bloqueio do novo slot
        setAvailableTimes(prevTimes =>
          prevTimes.map(slot =>
            slot.time === timeSlot.time
              ? { ...slot, isLocked: true, lockedBy: socket.id, tempAppointmentId: response.data.tempAppointmentId }
              : slot
          )
        );
        setMessage('Horário selecionado. Você tem alguns minutos para confirmar.');
        setMessageType('info');
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setMessage(error.response.data.message); // Exibe mensagem de erro do backend (ex: "Horário já ocupado")
        setMessageType('error');
        // Re-fetch para garantir a lista de horários mais atualizada após um conflito
        fetchAvailableTimes(selectedDate, selectedService);
      } else {
        console.error('Erro ao bloquear horário:', error);
        setMessage('Erro ao tentar bloquear o horário. Tente novamente.');
        setMessageType('error');
      }
      setSelectedTime(null); // Garante que a seleção visual seja removida em caso de falha
      setLockedTime(null);   // Garante que o bloqueio interno seja removido em caso de falha
    }
  }, [socket, selectedDate, selectedService, lockedTime, fetchAvailableTimes]); // Dependências do useCallback

  // Lida com a confirmação final do agendamento
  const handleBookingConfirm = async () => {
    // Validações antes de finalizar
    if (!selectedDate || !selectedTime || !selectedService || !lockedTime) {
      setMessage('Por favor, selecione a data, o horário e o serviço, e certifique-se de que o horário está bloqueado.');
      setMessageType('warning');
      return;
    }

    try {
      const newAppointmentData = {
        clientName: clientInfo.name,
        clientPhone: clientInfo.phone,
        clientEmail: clientInfo.email,
        service: selectedService,
        date: moment(selectedDate).format('YYYY-MM-DD'),
        time: selectedTime,
        socketId: socket.id, // Envia o socketId para o backend
        tempAppointmentId: lockedTime.tempAppointmentId // Envia o ID do bloqueio temporário para o backend
      };

      const response = await api.post('/client/appointments', newAppointmentData);

      if (response.status === 201) {
        setMessage('Agendamento realizado com sucesso!');
        setMessageType('success');
        localStorage.setItem('myBarberAppointment', JSON.stringify(response.data)); // Salva no Local Storage
        setMyPastAppointment(response.data); // Atualiza o estado do agendamento passado

        setLockedTime(null); // O backend já remove o lockedBy, mas limpa o estado local
        setStep(3); // Navega para a tela de confirmação
      }
    } catch (error) {
      if (error.response && error.response.status === 409) {
        setMessage(error.response.data.message); // Exibe mensagem de conflito (ex: "Horário já agendado")
        setMessageType('error');
        // Atualiza a lista de horários para refletir o estado real do banco de dados
        fetchAvailableTimes(selectedDate, selectedService);
      } else {
        console.error('Erro ao finalizar agendamento:', error);
        setMessage('Erro ao finalizar agendamento. Tente novamente.');
        setMessageType('error');
      }
    }
  };

  // Efeito para limpar o bloqueio temporário ao sair da página ou desmontar o componente
  // Isso é um fallback, pois o backend também tem uma lógica de limpeza na desconexão do socket.
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (lockedTime && socket && lockedTime.tempAppointmentId) {
        // Envia uma requisição síncrona ou tenta com um pequeno atraso
        // para dar tempo de a requisição ser enviada antes da página fechar.
        // `fetch` é preferível a `axios` para `beforeunload`, pois `axios` é assíncrono.
        try {
          await fetch(`${process.env.REACT_APP_API_URL}/client/unlock-time`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ appointmentId: lockedTime.tempAppointmentId, socketId: socket.id })
          });
        } catch (e) {
          console.error('Erro ao desbloquear horário no beforeunload:', e);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Função de limpeza que é executada ao desmontar o componente
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Garante que o bloqueio seja liberado ao sair da página (se o socket ainda estiver ativo)
      if (lockedTime && socket && lockedTime.tempAppointmentId) {
        api.post('/client/unlock-time', { appointmentId: lockedTime.tempAppointmentId, socketId: socket.id })
          .catch(err => console.error('Erro ao desbloquear horário no unmount:', err));
      }
    };
  }, [lockedTime, socket]); // Dependências: lockedTime e socket

  // Função para resetar o formulário para um novo agendamento
  const startNewBooking = () => {
    setStep(1); // Volta para o primeiro passo
    setClientInfo({ name: '', phone: '', email: '' }); // Limpa as informações do cliente
    setSelectedDate(null); // Limpa a data selecionada
    setAvailableTimes([]); // Limpa os horários disponíveis
    setSelectedTime(null); // Limpa o horário selecionado
    setLockedTime(null); // Limpa qualquer bloqueio temporário
    setMessage(null); // Limpa as mensagens
    setMessageType('info');
    // Não limpa 'myPastAppointment' para que o cliente possa ver o último agendamento
  };

  return (
    <div className="client-booking-container">
      <h1>Agende seu Horário na Barbearia</h1>
      {/* Componente para exibir mensagens ao usuário */}
      <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />

      {/* Exibe o agendamento anterior se existir e não estiver na tela de confirmação final */}
      {myPastAppointment && step !== 3 && (
        <div className="past-appointment-info">
          <h2>Seu Último Agendamento:</h2>
          <p>Nome: {myPastAppointment.clientName}</p>
          <p>Serviço: {myPastAppointment.service?.name || 'N/A'}</p> {/* Exibe o nome do serviço ou 'N/A' */}
          <p>Data: {moment(myPastAppointment.date).format('DD/MM/YYYY')}</p>
          <p>Hora: {myPastAppointment.time}</p>
          <p>Status: {myPastAppointment.status}</p>
          <button onClick={startNewBooking} className="new-booking-button">Fazer Novo Agendamento</button>
          <hr/>
        </div>
      )}

      {/* Passo 1: Informações do Cliente */}
      {step === 1 && (
        <form onSubmit={handleClientInfoSubmit} className="client-info-form">
          <h2>1. Seus Dados</h2>
          <input
            type="text"
            placeholder="Nome Completo"
            value={clientInfo.name}
            onChange={(e) => setClientInfo({ ...clientInfo, name: e.target.value })}
            required
            aria-label="Nome Completo"
          />
          <input
            type="tel"
            placeholder="Telefone (Opcional)"
            value={clientInfo.phone}
            onChange={(e) => setClientInfo({ ...clientInfo, phone: e.target.value })}
            aria-label="Telefone"
          />
          <input
            type="email"
            placeholder="E-mail (Opcional)"
            value={clientInfo.email}
            onChange={(e) => setClientInfo({ ...clientInfo, email: e.target.value })}
            aria-label="E-mail"
          />
          <button type="submit">Próximo</button>
        </form>
      )}

      {/* Passo 2: Seleção de Serviço, Data e Horário */}
      {step === 2 && (
        <div className="booking-details">
          <h2>2. Escolha o Serviço, Data e Horário</h2>

          <div className="service-selection">
            <h3>Selecione o Serviço:</h3>
            <select
              value={selectedService}
              onChange={(e) => handleServiceChange(e.target.value)}
              aria-label="Selecione o Serviço"
            >
              {services.length === 0 ? (
                <option value="">Carregando serviços...</option>
              ) : (
                <>
                  <option value="">Selecione um serviço</option>
                  {services.map(service => (
                    <option key={service._id} value={service._id}>
                      {service.name} (R${service.price.toFixed(2)})
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>

          <div className="date-picker">
            <h3>Selecione a Data:</h3>
            <input
              type="date"
              min={moment().format('YYYY-MM-DD')} // Data mínima: hoje
              max={moment().add(2, 'weeks').format('YYYY-MM-DD')} // Data máxima: daqui a 2 semanas
              onChange={(e) => handleDateChange(e.target.value)}
              value={selectedDate ? moment(selectedDate).format('YYYY-MM-DD') : ''}
              disabled={!selectedService} // Desabilita se nenhum serviço for selecionado
              aria-label="Selecione a Data"
            />
          </div>

          {/* Exibe os horários disponíveis apenas se uma data e um serviço forem selecionados */}
          {selectedDate && selectedService && (
            <div className="time-slots">
              <h3>Horários Disponíveis para {moment(selectedDate).format('DD/MM/YYYY')}:</h3>
              {availableTimes.length > 0 ? (
                <div className="time-grid">
                  {availableTimes.map((slot, index) => (
                    <button
                      key={index}
                      className={`time-slot-button
                        ${selectedTime === slot.time && !slot.isLocked && !slot.isBooked ? 'selected' : ''}
                        ${slot.isLocked ? 'locked' : ''}
                        ${slot.isBooked ? 'booked' : ''}
                      `}
                      onClick={() => handleTimeSelect(slot)}
                      disabled={slot.isLocked || slot.isBooked} // Desabilita se estiver bloqueado ou agendado
                      aria-label={`Horário ${slot.time}`}
                    >
                      {slot.time}
                      {slot.isLocked && slot.lockedBy !== socket?.id ? ' (Ocupado)' : ''} {/* Ocupado por outro */}
                      {slot.isLocked && slot.lockedBy === socket?.id ? ' (Você)' : ''} {/* Ocupado por você */}
                      {slot.isBooked && ' (Agendado)'} {/* Já agendado permanentemente */}
                    </button>
                  ))}
                </div>
              ) : (
                <p>Nenhum horário disponível para esta data ou serviço. Verifique as configurações de horário do administrador.</p>
              )}
            </div>
          )}

          {/* Botão para finalizar o agendamento, desabilitado se não houver seleção ou bloqueio */}
          <button onClick={handleBookingConfirm} disabled={!selectedTime || !selectedService || !lockedTime}>
            Finalizar Agendamento
          </button>
          <button onClick={() => setStep(1)}>Voltar</button>
        </div>
      )}

      {/* Passo 3: Confirmação de Agendamento */}
      {step === 3 && (
        <div className="booking-success">
          <h2>Agendamento Confirmado!</h2>
          <p>Obrigado por agendar conosco, {clientInfo.name}!</p>
          <p>Seu agendamento para **{myPastAppointment?.service?.name || 'Serviço'}** está marcado para **{moment(myPastAppointment?.date).format('DD/MM/YYYY')}** às **{myPastAppointment?.time}**.</p>
          <button onClick={startNewBooking}>Fazer Novo Agendamento</button>
        </div>
      )}
    </div>
  );
};

export default ClientBooking;
