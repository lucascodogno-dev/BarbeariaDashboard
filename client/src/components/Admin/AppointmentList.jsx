// // frontend/src/components/Admin/AppointmentList.js
// import React, { useState, useEffect } from 'react';
// import api from '../../api/api';
// import { useSocket } from '../../contexts/SocketContext';
// import moment from 'moment';
// import MessageBox from '../Common/MessageBox';

// const AppointmentList = () => {
//   const [appointments, setAppointments] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [message, setMessage] = useState(null);
//   const [messageType, setMessageType] = useState('info');
//   const socket = useSocket();

//   const fetchAppointments = async () => {
//     try {
//       setLoading(true);
//       const response = await api.get('/admin/appointments');
//       setAppointments(response.data);
//       setError(null);
//     } catch (err) {
//       console.error('Erro ao buscar agendamentos:', err);
//       setError('Erro ao carregar agendamentos.');
//       setAppointments([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchAppointments();

//     if (socket) {
//       // Listener para novos agendamentos em tempo real
//       socket.on('newAppointment', (newAppointment) => {
//         setMessage(`Novo agendamento de ${newAppointment.clientName} para ${moment(newAppointment.date).format('DD/MM/YYYY')} às ${newAppointment.time}!`);
//         setMessageType('info');
//         fetchAppointments(); // Atualiza a lista completa
//       });

//       // Listener para agendamentos atualizados
//       socket.on('appointmentUpdated', (updatedAppointment) => {
//         setMessage(`Agendamento de ${updatedAppointment.clientName} atualizado para status: ${updatedAppointment.status}.`);
//         setMessageType('info');
//         fetchAppointments();
//       });

//       // Listener para agendamentos deletados
//       socket.on('appointmentDeleted', ({ id, date, time, service }) => {
//         setMessage(`Agendamento de ${moment(date).format('DD/MM/YYYY')} às ${time} foi deletado.`);
//         setMessageType('warning');
//         fetchAppointments();
//       });

//       // Listener para horários bloqueados (para visualização no admin)
//       socket.on('timeLocked', ({ date, time, serviceId, lockedBy, tempAppointmentId }) => {
//         setMessage(`Horário ${time} em ${moment(date).format('DD/MM/YYYY')} está sendo selecionado por um cliente.`);
//         setMessageType('info');
//         // Você pode adicionar uma lógica para marcar visualmente o horário no dashboard se quiser
//         // Por exemplo, uma lista de "horários em seleção"
//       });

//       // Listener para horários desbloqueados
//       socket.on('timeUnlocked', ({ appointmentId }) => {
//         setMessage(`Um horário que estava em seleção foi liberado.`);
//         setMessageType('info');
//         // Pode ser necessário atualizar a lista de agendamentos se você tiver uma visualização de slots
//       });

//       // Listener para limpeza de bloqueios por desconexão
//       socket.on('timeUnlockedByDisconnect', ({ socketId }) => {
//         setMessage(`Bloqueios temporários do cliente ${socketId.substring(0, 5)}... foram liberados.`);
//         setMessageType('warning');
//         fetchAppointments(); // Re-fetch para garantir a consistência
//       });
//     }

//     return () => {
//       if (socket) {
//         socket.off('newAppointment');
//         socket.off('appointmentUpdated');
//         socket.off('appointmentDeleted');
//         socket.off('timeLocked');
//         socket.off('timeUnlocked');
//         socket.off('timeUnlockedByDisconnect');
//       }
//     };
//   }, [socket]); // Dependência do socket para re-registrar listeners

//   const handleStatusChange = async (id, newStatus) => {
//     try {
//       await api.put(`/admin/appointments/${id}`, { status: newStatus });
//       setMessage('Status do agendamento atualizado com sucesso!');
//       setMessageType('success');
//       fetchAppointments(); // Atualiza a lista após a mudança
//     } catch (err) {
//       console.error('Erro ao atualizar status:', err);
//       setMessage('Erro ao atualizar status do agendamento.');
//       setMessageType('error');
//     }
//   };

//   const handleDeleteAppointment = async (id) => {
//     if (window.confirm('Tem certeza que deseja deletar este agendamento?')) {
//       try {
//         await api.delete(`/admin/appointments/${id}`);
//         setMessage('Agendamento deletado com sucesso!');
//         setMessageType('success');
//         fetchAppointments(); // Atualiza a lista após a exclusão
//       } catch (err) {
//         console.error('Erro ao deletar agendamento:', err);
//         setMessage('Erro ao deletar agendamento.');
//         setMessageType('error');
//       }
//     }
//   };

//   if (loading) return <p>Carregando agendamentos...</p>;
//   if (error) return <p className="error-message">{error}</p>;

//   return (
//     <div className="appointment-list-container">
//       <h2>Todos os Agendamentos</h2>
//       <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />
//       {appointments.length === 0 ? (
//         <p>Nenhum agendamento encontrado.</p>
//       ) : (
//         <table>
//           <thead>
//             <tr>
//               <th>Cliente</th>
//               <th>Contato</th>
//               <th>Serviço</th>
//               <th>Data</th>
//               <th>Hora</th>
//               <th>Status</th>
//               <th>Ações</th>
//             </tr>
//           </thead>
//           <tbody>
//             {appointments.map((appt) => (
//               <tr key={appt._id}>
//                 <td>{appt.clientName}</td>
//                 <td>{appt.clientPhone || 'N/A'} {appt.clientEmail && `(${appt.clientEmail})`}</td>
//                 <td>{appt.service ? appt.service.name : 'Serviço Removido'}</td>
//                 <td>{moment(appt.date).format('DD/MM/YYYY')}</td>
//                 <td>{appt.time}</td>
//                 <td>
//                   <select
//                     value={appt.status}
//                     onChange={(e) => handleStatusChange(appt._id, e.target.value)}
//                   >
//                     <option value="pending">Pendente</option>
//                     <option value="confirmed">Confirmado</option>
//                     <option value="completed">Concluído</option>
//                     <option value="canceled">Cancelado</option>
//                   </select>
//                 </td>
//                 <td>
//                   <button onClick={() => handleDeleteAppointment(appt._id)} className="delete-button">Deletar</button>
//                 </td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       )}
//     </div>
//   );
// };

// export default AppointmentList;
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { useSocket } from '../../contexts/SocketContext';
import moment from 'moment';
import MessageBox from '../Common/MessageBox';
import '../../styles/AppointmentList.css'; // Arquivo CSS adicional

const AppointmentList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');
  const [activeLocks, setActiveLocks] = useState({});
  const socket = useSocket();
console.log(message);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/appointments');
      setAppointments(response.data);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar agendamentos:', err);
      setError('Erro ao carregar agendamentos.');
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();

    if (socket) {
      socket.on('newAppointment', (newAppointment) => {
        setMessage(`Novo agendamento de ${newAppointment.clientName} para ${moment(newAppointment.date).format('DD/MM/YYYY')} às ${newAppointment.time}!`);
        setMessageType('info');
        fetchAppointments();
      });

      socket.on('appointmentUpdated', (updatedAppointment) => {
        setMessage(`Agendamento de ${updatedAppointment.clientName} atualizado para status: ${updatedAppointment.status}.`);
        setMessageType('info');
        fetchAppointments();
      });

      socket.on('appointmentDeleted', ({ id, date, time, service }) => {
        setMessage(`Agendamento de ${moment(date).format('DD/MM/YYYY')} às ${time} foi deletado.`);
        setMessageType('warning');
        fetchAppointments();
      });

      socket.on('timeLocked', (data) => {
        setMessage(`Horário ${data.time} em ${moment(data.date).format('DD/MM/YYYY')} está sendo selecionado por um cliente.`);
        setMessageType('info');
      });

      socket.on('timeUnlocked', (data) => {
        setMessage(`Um horário que estava em seleção foi liberado.`);
        setMessageType('info');
      });

      socket.on('timeUnlockedByDisconnect', ({ socketId }) => {
        setMessage(`Bloqueios temporários do cliente ${socketId.substring(0, 5)}... foram liberados.`);
        setMessageType('warning');
        fetchAppointments();
      });

      // Novo listener para múltiplos bloqueios
      socket.on('activeLocks', (locks) => {
        setActiveLocks(locks);
      });

      // Solicita o estado atual dos bloqueios ao conectar
      socket.emit('getActiveLocks');
    }

    return () => {
      if (socket) {
        socket.off('newAppointment');
        socket.off('appointmentUpdated');
        socket.off('appointmentDeleted');
        socket.off('timeLocked');
        socket.off('timeUnlocked');
        socket.off('timeUnlockedByDisconnect');
        socket.off('activeLocks');
      }
    };
  }, [socket]);

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/admin/appointments/${id}`, { status: newStatus });
      setMessage('Status do agendamento atualizado com sucesso!');
      setMessageType('success');
      fetchAppointments();
    } catch (err) {
      console.error('Erro ao atualizar status:', err);
      setMessage('Erro ao atualizar status do agendamento.');
      setMessageType('error');
    }
  };

  const handleDeleteAppointment = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este agendamento?')) {
      try {
        await api.delete(`/admin/appointments/${id}`);
        setMessage('Agendamento deletado com sucesso!');
        setMessageType('success');
        fetchAppointments();
      } catch (err) {
        console.error('Erro ao deletar agendamento:', err);
        setMessage('Erro ao deletar agendamento.');
        setMessageType('error');
      }
    }
  };

  const renderActiveLocks = () => {
    const locksList = Object.entries(activeLocks).flatMap(([key, locks]) => {
      const [date, time, serviceId] = key.split('-');
      return locks.map((lock, index) => (
        <div key={`${lock.socketId}-${index}`} className="active-lock-item">
          <div className="lock-time">
            <strong>{moment(date).format('DD/MM/YYYY')} às {time}</strong>
          </div>
          <div className="lock-client">
            Cliente #{lock.socketId.substring(0, 5)}
          </div>
          <div className="lock-duration">
            Selecionando há {Math.floor((new Date() - new Date(lock.lockedAt)) / 1000 / 60)} minutos
          </div>
        </div>
      ));
    });

    if (locksList.length === 0) {
      return null;
    }

    return (
      <div className="active-locks-container">
        <h3>Horários em Seleção</h3>
        <div className="active-locks-grid">
          {locksList}
        </div>
      </div>
    );
  };

  if (loading) return <p>Carregando agendamentos...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="appointment-list-container">
      <h2>Todos os Agendamentos</h2>
      <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />
      
      {renderActiveLocks()}
      
      {appointments.length === 0 ? (
        <p>Nenhum agendamento encontrado.</p>
      ) : (
        <table className="appointments-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Contato</th>
              <th>Serviço</th>
              <th>Data</th>
              <th>Hora</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appt) => (
              <tr key={appt._id}>
                <td>{appt.clientName}</td>
                <td>{appt.clientPhone || 'N/A'} {appt.clientEmail && `(${appt.clientEmail})`}</td>
                <td>{appt.service ? appt.service.name : 'Serviço Removido'}</td>
                <td>{moment(appt.date).format('DD/MM/YYYY')}</td>
                <td>{appt.time}</td>
                <td>
                  <select
                    value={appt.status}
                    onChange={(e) => handleStatusChange(appt._id, e.target.value)}
                    className="status-select"
                  >
                    <option value="pending">Pendente</option>
                    <option value="confirmed">Confirmado</option>
                    <option value="completed">Concluído</option>
                    <option value="canceled">Cancelado</option>
                  </select>
                </td>
                <td>
                  <button 
                    onClick={() => handleDeleteAppointment(appt._id)} 
                    className="delete-button"
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AppointmentList;