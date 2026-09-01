import React, { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import CircularProgress from "@mui/material/CircularProgress";
import RefreshIcon from "@mui/icons-material/Refresh";
import API_CONFIG from "../config-api";

const API_URL = API_CONFIG.BASE_URL_BACKEND;

// SH-3: refresh action — same POST /refresh + query invalidation + timestamp
// semantics as before, now rendered with MUI Button/Typography.
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
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
      <Button
        onClick={handleRefresh}
        disabled={refreshing}
        size="small"
        variant="outlined"
        color="primary"
        title="Forzar recarga desde Google Sheets"
        startIcon={
          refreshing ? <CircularProgress size={16} thickness={5} /> : <RefreshIcon fontSize="small" />
        }
      >
        {refreshing ? "Actualizando..." : "Actualizar datos"}
      </Button>
      {lastUpdate && (
        <Typography variant="caption" color="text.secondary">
          Última actualización: {lastUpdate.toLocaleTimeString()}
        </Typography>
      )}
    </Box>
  );
}
