// frontend/src/components/Layout/AdminLayout.js
import React, { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import '../../styles/AdminLayout.css'; // Estilos para o layout do admin

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Alterna a visibilidade da sidebar
  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  return (
    <div className="admin-layout">
      {/* Botão para abrir/fechar a sidebar em mobile */}
      <button className="sidebar-toggle" onClick={toggleSidebar}>
        ☰
      </button>
      {/* Sidebar - a classe 'open' controla a visibilidade */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <nav>
          <ul>
            <li><Link to="/admin" onClick={() => setIsSidebarOpen(false)}>Dashboard</Link></li>
            <li><Link to="/admin/appointments" onClick={() => setIsSidebarOpen(false)}>Agendamentos</Link></li>
            <li><Link to="/admin/services" onClick={() => setIsSidebarOpen(false)}>Serviços</Link></li>
            <li><Link to="/admin/schedules" onClick={() => setIsSidebarOpen(false)}>Horários</Link></li>
          </ul>
        </nav>
      </aside>
      {/* Conteúdo principal - renderiza as rotas filhas do Admin */}
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;