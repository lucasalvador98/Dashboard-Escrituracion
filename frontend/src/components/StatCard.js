import React from 'react';

/**
 * Componente tarjeta de estadísticas
 */
const StatCard = ({
  title,
  value,
  icon,
  variant = 'default',
  className = '',
}) => {
  const variantClasses = {
    default: 'bg-gray-50 text-gray-700',
    success: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    error: 'bg-red-50 text-red-700',
    primary: 'bg-blue-50 text-blue-700',
  };

  return (
    <div className={`card ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        {icon && (
          <div className="text-4xl opacity-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
