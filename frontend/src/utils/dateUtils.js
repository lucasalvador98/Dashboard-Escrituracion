import { parseISO, differenceInDays, format } from 'date-fns';
import { es } from 'date-fns/locale';

/**
 * Parsea una fecha en formato string a objeto Date
 * @param {string} dateString - Fecha en formato "dd/mm/yyyy" o ISO
 * @returns {Date|null}
 */
export const parseDate = (dateString) => {
  if (!dateString || dateString === 'N/A') return null;
  
  try {
    if (dateString.includes('/')) {
      const [day, month, year] = dateString.split('/');
      return new Date(year, month - 1, day);
    }
    return parseISO(dateString);
  } catch {
    return null;
  }
};

/**
 * Calcula la diferencia en días entre dos fechas
 * @param {string} fecha1 - Fecha inicio
 * @param {string} fecha2 - Fecha fin
 * @returns {number|string}
 */
export const calcularDiferenciaDias = (fecha1, fecha2) => {
  if (!fecha1 || !fecha2 || fecha1 === 'N/A' || fecha2 === 'N/A') return 'N/A';
  
  const date1 = parseDate(fecha1);
  const date2 = parseDate(fecha2);
  
  if (!date1 || !date2) return 'N/A';
  
  try {
    return differenceInDays(date2, date1);
  } catch {
    return 'N/A';
  }
};

/**
 * Formatea una fecha para mostrar
 * @param {string|Date} date - Fecha a formatear
 * @param {string} formatStr - Formato de salida (ej: 'dd/MM/yyyy')
 * @returns {string}
 */
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return 'N/A';
  
  try {
    const parsedDate = typeof date === 'string' ? parseDate(date) : date;
    if (!parsedDate) return 'N/A';
    return format(parsedDate, formatStr, { locale: es });
  } catch {
    return 'N/A';
  }
};

/**
 * Obtiene color según el estado de diferencia en días
 * @param {number} dias - Número de días
 * @returns {string} - Código de color
 */
export const getStatusColor = (dias) => {
  if (dias === 'N/A' || dias === null) return 'default';
  if (dias <= 3) return 'success';
  if (dias <= 7) return 'warning';
  return 'error';
};

/**
 * Obtiene etiqueta de estado
 * @param {number} dias - Número de días
 * @returns {string}
 */
export const getStatusLabel = (dias) => {
  if (dias === 'N/A' || dias === null) return 'Sin datos';
  if (dias <= 3) return 'Rápido';
  if (dias <= 7) return 'Normal';
  return 'Atrasado';
};
