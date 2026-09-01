import React from "react";
import { Outlet } from "react-router-dom";
import IconButton from "@mui/material/IconButton";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useThemeMode } from "./theme/ThemeContext";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import RefreshBar from "./components/RefreshBar";

// Shared chrome for every route: desktop sidebar, header, main outlet and footer.
export default function AppLayout() {
  const { mode, toggle } = useThemeMode();
  return (
    <div className="app-root">
      <Sidebar />

      <div className="app-content">
        <header className="app-header flex items-center justify-between">
          <RefreshBar />
          <IconButton
            onClick={toggle}
            aria-label={mode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
            data-testid="theme-toggle"
            edge="end"
          >
            {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
          </IconButton>
        </header>
        <main className="app-main">
          <Outlet />
        </main>

        <footer className="app-footer" role="contentinfo">
          <div className="text-center space-y-1">
            <div className="font-medium">Elaborado por Dirección de Tecnología</div>
            <div className="text-xs text-gray-500">Ministerio de Desarrollo Social y Promoción del Empleo</div>
          </div>
        </footer>
      </div>

      <BottomNav />
    </div>
  );
}
