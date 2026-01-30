import client from './client';

/**
 * Obtener datos de escrituración
 * @param {number} skip - Registros a saltar (paginación)
 * @param {number} limit - Cantidad de registros a obtener
 * @param {string} filtro_estado - Filtro por estado (opcional)
 */
export const getEscrituraciones = (skip = 0, limit = 50, filtro_estado = null) => {
  const params = { skip, limit };
  if (filtro_estado) params.filtro_estado = filtro_estado;
  return client.get('/escrituracion', { params });
};

/**
 * Obtener datos de stock
 */
export const getStock = () => {
  return client.get('/stock');
};

/**
 * Obtener datos de montos
 */
export const getMontos = () => {
  return client.get('/montos');
};

/**
 * Obtener datos de análisis de diferencias
 */
export const getDiferencias = () => {
  return client.get('/diferencias');
};

/**
 * Obtener opciones de filtro (departamentos, localidades, etc)
 */
export const getFilterOptions = () => {
  return client.get('/filter-options');
};

export default {
  getEscrituraciones,
  getStock,
  getMontos,
  getDiferencias,
  getFilterOptions,
};
