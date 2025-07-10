// // frontend/src/contexts/SocketContext.js
// import React, { createContext, useContext, useEffect, useState } from 'react';
// import io from 'socket.io-client';

// const SocketContext = createContext();

// export const useSocket = () => useContext(SocketContext);

// export const SocketProvider = ({ children }) => {
//   const [socket, setSocket] = useState(null);

//   useEffect(() => {
//     const newSocket = io('http://localhost:5000'); // A URL do seu backend
//     setSocket(newSocket);

//     return () => newSocket.close();
//   }, []);

//   return (
//     <SocketContext.Provider value={socket}>
//       {children}
//     </SocketContext.Provider>
//   );
// };
import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    const newSocket = io('http://localhost:5000', {
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      transports: ['websocket']
    });
    
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};