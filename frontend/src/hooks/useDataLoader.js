import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import API_CONFIG from "../config-api";
const API_URL = API_CONFIG.BASE_URL_BACKEND;

function formatError(err) {
  if (!err) return null;

  // Sin conexión
  if (err.code === "ERR_NETWORK") {
    return "No se puede conectar con el servidor. Verificá que el backend esté corriendo.";
  }

  // Timeout
  if (err.code === "ECONNABORTED") {
    return "El servidor no respondió a tiempo. Probá de nuevo más tarde.";
  }

  // HTTP error con mensaje del backend
  const serverMsg = err.response?.data?.detail;
  if (serverMsg) {
    // Limpiar mensajes técnicos de FastAPI
    if (serverMsg.includes("GOOGLE_CLOUD_SERVICE_ACCOUNT")) {
      return "Error de configuración: la cuenta de servicio de Google no está configurada.";
    }
    if (serverMsg.includes("gspread") || serverMsg.includes("Google Sheets")) {
      return "Error al leer la planilla de Google Sheets. Revisá que tenga acceso la cuenta de servicio.";
    }
    return serverMsg;
  }

  return err.message || "Error desconocido al cargar los datos.";
}

export default function useDataLoader(resource = "escrituracion", tryLimit = 10000) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: [resource],
    queryFn: async () => {
      const first = await axios.get(`${API_URL}/${resource}?limit=${tryLimit}`);
      const total = first.data?.total ?? null;
      let all = Array.isArray(first.data?.data) ? first.data.data : Array.isArray(first.data) ? first.data : [];

      if (total && all.length < total) {
        const pageSize = all.length || 50;
        for (let offset = pageSize; all.length < total; offset += pageSize) {
          const resp = await axios.get(`${API_URL}/${resource}?limit=${pageSize}&skip=${offset}`);
          const chunk = Array.isArray(resp.data?.data) ? resp.data.data : Array.isArray(resp.data) ? resp.data : [];
          if (!chunk.length) break;
          all = all.concat(chunk);
        }
      }
      return all;
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
    refetchOnWindowFocus: false,
  });

  return {
    data: data ?? [],
    loading: isLoading,
    error: formatError(error),
    reload: refetch,
  };
}
