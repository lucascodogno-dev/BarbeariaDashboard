// frontend/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet, Link } from 'react-router-dom'; // Importa Link
import { SocketProvider } from './contexts/SocketContext';
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Importa AuthProvider e useAuth
import AdminDashboard from './pages/Admin/AdminDashboard';
import ClientBooking from './pages/Client/ClientBooking';
import AdminLogin from './pages/Admin/AdminLogin'; // Importa a página de Login do Admin
import AdminLayout from './components/Layout/AdminLayout';
import './styles/App.css';
import './styles/AdminLayout.css';
import './styles/ClientBooking.css';

// Componente para proteger rotas
const PrivateRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    // Exibe uma tela de carregamento enquanto a autenticação está sendo verificada
    return <div className="loading-screen">Carregando autenticação...</div>;
  }

  if (!isAuthenticated) {
    // Redireciona para a página de login se o usuário não estiver autenticado
    return <Navigate to="/admin/login" replace />;
  }

  // Verifica se o usuário tem a role permitida para acessar a rota
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <div className="access-denied">
        <h1>Acesso Negado</h1>
        <p>Você não tem permissão para acessar esta página.</p>
        <Link to="/admin/login">Voltar para o Login</Link>
      </div>
    );
  }

  return children; // Renderiza os componentes filhos se autenticado e autorizado
};

function App() {
  return (
    // AuthProvider envolve toda a aplicação para que o contexto de autenticação esteja disponível
    <AuthProvider>
      <SocketProvider>
        <Router>
          <Routes>
            {/* Rota inicial que redireciona para a área do cliente */}
            <Route path="/" element={<Navigate to="/client" />} />

            {/* Rota do Cliente (pública, acessível a todos) */}
            <Route path="/client" element={<ClientBooking />} />

            {/* Rota de Login do Admin (pública, para que o admin possa se autenticar) */}
            <Route path="/admin/login" element={<AdminLogin />} />

            {/* Rotas do Admin (PROTEGIDAS) */}
            {/* O componente AdminLayout agora é um wrapper para as rotas protegidas.
                A PrivateRoute garante que apenas usuários autenticados com a role 'admin'
                possam acessar as rotas aninhadas. */}
            <Route
              path="/admin/*" // Usa /* para capturar todas as sub-rotas do admin
              element={
                <PrivateRoute allowedRoles={['admin']}> {/* Apenas usuários com role 'admin' */}
                  <AdminLayout /> {/* Renderiza o layout do admin */}
                </PrivateRoute>
              }
            >
              {/* Rotas aninhadas dentro do AdminLayout (renderizadas pelo <Outlet />) */}
              <Route index element={<AdminDashboard />} /> {/* Rota padrão para o Admin (Dashboard) */}
              <Route path="appointments" element={<AdminDashboard />} />
              <Route path="services" element={<AdminDashboard />} />
              <Route path="schedules" element={<AdminDashboard />} />
              {/* Adicione outras sub-rotas do admin aqui, se houver */}
            </Route>

            {/* Rota para 404 (Página Não Encontrada) */}
            <Route path="*" element={<div className="not-found"><h1>404</h1><p>Página Não Encontrada</p><Link to="/">Voltar para o Início</Link></div>} />
          </Routes>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
