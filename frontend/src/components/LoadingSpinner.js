import React from 'react';

/**
 * Componente de carga
 */
const LoadingSpinner = ({
  message = 'Cargando...',
  size = 'md',
}) => {
  const sizeClass = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
  }[size] || 'h-10 w-10';

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-8">
      <div className={`spinner ${sizeClass}`}></div>
      <p className="text-gray-600">{message}</p>
    </div>
  );
};

export default LoadingSpinner;
