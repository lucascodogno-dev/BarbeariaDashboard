// frontend/src/pages/Admin/AdminLogin.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import MessageBox from '../../components/Common/MessageBox';
import '../../styles/App.css'; // Para estilos gerais de formulário e botões

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState('info');
  const { login } = useAuth(); // Obtém a função de login do contexto de autenticação
  const navigate = useNavigate(); // Hook para navegação

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null); // Limpa mensagens anteriores

    if (!username || !password) {
      setMessage('Por favor, preencha o nome de usuário e a senha.');
      setMessageType('warning');
      return;
    }

    const success = await login(username, password); // Tenta fazer login
    if (success) {
      setMessage('Login bem-sucedido! Redirecionando...');
      setMessageType('success');
      setTimeout(() => {
        navigate('/admin'); // Redireciona para o dashboard do admin
      }, 1000);
    } else {
      setMessage('Falha no login. Verifique seu nome de usuário e senha.');
      setMessageType('error');
    }
  };

  return (
    <div className="admin-login-container">
      <h1>Login do Administrador</h1>
      <MessageBox message={message} type={messageType} onClose={() => setMessage(null)} />
      <form onSubmit={handleSubmit} className="login-form">
        <input
          type="text"
          placeholder="Nome de Usuário"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
};

export default AdminLogin;
