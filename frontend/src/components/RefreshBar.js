import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import API_CONFIG from "../config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

export default function RefreshBar({ resource = "escrituracion" }) {
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const queryClient = useQueryClient();

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await axios.post(`${API_URL}/refresh`);
      await queryClient.invalidateQueries({ queryKey: [resource] });
      setLastUpdate(new Date());
    } catch (err) {
      console.error("Error al refrescar:", err);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="refresh-bar">
      <button
        onClick={handleRefresh}
        disabled={refreshing}
        className={`refresh-btn ${refreshing ? "refreshing" : ""}`}
        title="Forzar recarga desde Google Sheets"
      >
        <svg
          className={`refresh-icon ${refreshing ? "spin" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="14"
          height="14"
        >
          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15.36-6.36L21 8M3 22v-6h6M21 12a9 9 0 0 1-15.36 6.36L3 16" />
        </svg>
        {refreshing ? "Actualizando..." : "Actualizar datos"}
      </button>
      {lastUpdate && (
        <span className="refresh-timestamp">
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
