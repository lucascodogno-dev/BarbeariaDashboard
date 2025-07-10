// frontend/src/components/Common/MessageBox.js
import React from 'react';
import '../../styles/App.css'; // Reutiliza estilos gerais ou cria um específico

const MessageBox = ({ message, type = 'info', onClose }) => {
  if (!message) return null;

  const typeClass = {
    info: 'message-box-info',
    success: 'message-box-success',
    error: 'message-box-error',
    warning: 'message-box-warning',
  }[type];

  return (
    <div className={`message-box ${typeClass}`}>
      <p>{message}</p>
      {onClose && (
        <button className="message-box-close-button" onClick={onClose}>
          &times;
        </button>
      )}
    </div>
  );
};

export default MessageBox;