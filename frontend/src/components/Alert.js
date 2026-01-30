import React from 'react';

/**
 * Componente de alerta mejorado
 */
const Alert = ({
  type = 'error',
  title = '',
  message = '',
  onClose = null,
}) => {
  const typeClass = {
    error: 'alert-error',
    success: 'alert-success',
    warning: 'alert-warning',
  }[type] || 'alert-error';

  return (
    <div className={`alert ${typeClass} flex items-start justify-between gap-3`}>
      <div>
        {title && <p className="font-semibold">{title}</p>}
        {message && <p className="text-sm mt-1">{message}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="text-lg font-bold hover:opacity-70 transition-opacity"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default Alert;
