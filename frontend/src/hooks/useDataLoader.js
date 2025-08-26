import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import API_CONFIG from "../config-api";
const API_URL = API_CONFIG.BASE_URL_BACKEND;

export default function useDataLoader(resource = "escrituracion", tryLimit = 10000) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const first = await axios.get(`${API_URL}/${resource}?limit=${tryLimit}`);
      const total = (first.data && first.data.total) ?? null;
      let all = Array.isArray(first.data?.data) ? first.data.data : Array.isArray(first.data) ? first.data : [];

      if (total && all.length < total) {
        const pageSize = all.length || 50;
        for (let offset = pageSize; all.length < total; offset += pageSize) {
          const resp = await axios.get(`${API_URL}/${resource}?limit=${pageSize}&offset=${offset}`);
          const chunk = Array.isArray(resp.data?.data) ? resp.data.data : Array.isArray(resp.data) ? resp.data : [];
          if (!chunk.length) break;
          all = all.concat(chunk);
        }
      }

      setData(all);
    } catch (err) {
      setError(err?.message || "Error al cargar datos");
    } finally {
      setLoading(false);
    }
  }, [resource, tryLimit]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return { data, setData, loading, error, reload: fetchAll };
}