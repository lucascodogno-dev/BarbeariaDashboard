// frontend/src/contexts/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import Cookies from 'js-cookie'; // Importa js-cookie para gerenciar cookies
import api from '../api/api'; // Importa a instância do Axios

// Cria o contexto de autenticação
const AuthContext = createContext();

// Hook personalizado para usar o contexto de autenticação
export const useAuth = () => useContext(AuthContext);

// Provedor do contexto de autenticação
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // Armazena informações do usuário logado
  const [loading, setLoading] = useState(true); // Indica se o carregamento inicial da autenticação está completo

  // Efeito para carregar o token do cookie ao iniciar a aplicação
  useEffect(() => {
    const loadUserFromCookie = () => {
      const token = Cookies.get('adminToken'); // Tenta obter o token do cookie
      if (token) {
        // Se o token existir, configura o cabeçalho de autorização padrão para todas as requisições Axios
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        // Em uma aplicação real, você faria uma requisição para validar o token no backend
        // e obter os dados do usuário, mas para simplificar, vamos decodificar o token (apenas para fins de demonstração)
        // ou assumir que o token é válido e armazenar um objeto de usuário simples.
        try {
          // Decodificação simples do token (NÃO FAÇA ISSO EM PROD PARA DADOS SENSÍVEIS SEM VALIDAÇÃO DO BACKEND!)
          const decodedToken = JSON.parse(atob(token.split('.')[1]));
          setUser({
            _id: decodedToken.id,
            username: decodedToken.username || 'Admin', // Pode não ter username no payload do token, ajuste conforme seu backend
            role: decodedToken.role || 'admin'
          });
        } catch (error) {
          console.error('Erro ao decodificar token do cookie:', error);
          Cookies.remove('adminToken'); // Remove token inválido
          setUser(null);
        }
      }
      setLoading(false); // Carregamento inicial concluído
    };

    loadUserFromCookie();
  }, []); // Executa apenas uma vez na montagem

  // Função para lidar com o login
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password });
      const { token, ...userData } = response.data;

      Cookies.set('adminToken', token, { expires: 1/24 }); // Salva o token no cookie (expira em 1 hora)
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Configura o cabeçalho para futuras requisições
      setUser(userData); // Define o usuário no estado
      return true; // Login bem-sucedido
    } catch (error) {
      console.error('Erro no login:', error.response?.data?.message || error.message);
      setUser(null);
      return false; // Login falhou
    }
  };

  // Função para lidar com o logout
  const logout = () => {
    Cookies.remove('adminToken'); // Remove o token do cookie
    delete api.defaults.headers.common['Authorization']; // Remove o cabeçalho de autorização
    setUser(null); // Limpa o usuário do estado
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
