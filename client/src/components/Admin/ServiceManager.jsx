
// frontend/src/components/Admin/ServiceManager.js
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import MessageBox from '../Common/MessageBox';

const ServiceManager = () => {
  const [services, setServices] = useState([]);
  const [newService, setNewService] = useState({ name: '', price: '' });
  const [editingServiceId, setEditingServiceId] = useState(null);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');

  useEffect(() => {
    fetchServices();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await api.get('/admin/services');
      setServices(response.data);
    } catch (err) {
      console.error('Erro ao buscar serviços:', err);
      setMessage('Erro ao carregar serviços.');
      setMessageType('error');
    }
  };

  const handleAddOrUpdateService = async (e) => {
    e.preventDefault();
    if (!newService.name || !newService.price) {
      setMessage('Nome e preço do serviço são obrigatórios.');
      setMessageType('warning');
      return;
    }
    const serviceData = { ...newService, price: parseFloat(newService.price) };

    try {
      if (editingServiceId) {
        // Atualiza serviço existente
        await api.put(`/admin/services/${editingServiceId}`, serviceData);
        setMessage('Serviço atualizado com sucesso!');
        setMessageType('success');
      } else {
        // Adiciona novo serviço
        await api.post('/admin/services', serviceData);
        setMessage('Serviço adicionado com sucesso!');
        setMessageType('success');
      }
      setNewService({ name: '', price: '' }); // Limpa o formulário
      setEditingServiceId(null); // Sai do modo de edição
      fetchServices(); // Recarrega a lista de serviços
    } catch (err) {
      console.error('Erro ao salvar serviço:', err);
      setMessage(err.response?.data?.message || 'Erro ao salvar serviço.');
      setMessageType('error');
    }
  };

  const handleEditClick = (service) => {
    setNewService({ name: service.name, price: service.price });
    setEditingServiceId(service._id);
  };

  const handleDeleteService = async (id) => {
    if (window.confirm('Tem certeza que deseja deletar este serviço?')) {
      try {
        await api.delete(`/admin/services/${id}`);
        setMessage('Serviço deletado com sucesso!');
        setMessageType('success');
        fetchServices(); // Recarrega a lista
      } catch (err) {
        console.error('Erro ao deletar serviço:', err);
        setMessage('Erro ao deletar serviço.');
        setMessageType('error');
      }
    }
  };

  return (
    <div className="service-manager-container">
      <h2>Gerenciar Serviços</h2>
      <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />

      <form onSubmit={handleAddOrUpdateService} className="service-form">
        <h3>{editingServiceId ? 'Editar Serviço' : 'Adicionar Novo Serviço'}</h3>
        <input
          type="text"
          placeholder="Nome do Serviço"
          value={newService.name}
          onChange={(e) => setNewService({ ...newService, name: e.target.value })}
          required
        />
        <input
          type="number"
          step="0.01"
          placeholder="Preço (R$)"
          value={newService.price}
          onChange={(e) => setNewService({ ...newService, price: e.target.value })}
          required
        />
        <button type="submit">{editingServiceId ? 'Atualizar Serviço' : 'Adicionar Serviço'}</button>
        {editingServiceId && (
          <button type="button" onClick={() => { setNewService({ name: '', price: '' }); setEditingServiceId(null); }}>
            Cancelar Edição
          </button>
        )}
      </form>

      <h3>Serviços Atuais</h3>
      {services.length === 0 ? (
        <p>Nenhum serviço cadastrado.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Nome</th>
              <th>Preço</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service._id}>
                <td>{service.name}</td>
                <td>R${service.price.toFixed(2)}</td>
                <td>
                  <button onClick={() => handleEditClick(service)} className="edit-button">Editar</button>
                  <button onClick={() => handleDeleteService(service._id)} className="delete-button">Deletar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ServiceManager;