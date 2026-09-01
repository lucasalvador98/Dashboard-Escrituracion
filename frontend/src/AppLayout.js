import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import MenuIcon from "@mui/icons-material/Menu";
import LightModeIcon from "@mui/icons-material/LightMode";
import DarkModeIcon from "@mui/icons-material/DarkMode";
import { useThemeMode } from "./theme/ThemeContext";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import RefreshBar from "./components/RefreshBar";

// Shared chrome for every route: MUI shell (desktop sidebar / mobile drawer,
// header toolbar, main outlet and footer). Responsive via sx breakpoints only
// (D2 — useMediaQuery is avoided because jsdom matchMedia is always false).
export default function AppLayout() {
  const { mode, toggle } = useThemeMode();
  const [mobileOpen, setMobileOpen] = useState(false);
  const closeMobileNav = () => setMobileOpen(false);

  return (
    <Box sx={{ display: "flex", height: "100vh", bgcolor: "background.default" }}>
      <Sidebar mobileOpen={mobileOpen} onClose={closeMobileNav} />

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          height: "100vh",
          overflow: "hidden",
        }}
      >
        <AppBar
          position="static"
          color="transparent"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: "divider", bgcolor: "background.paper" }}
        >
          <Toolbar sx={{ gap: 1, px: { xs: 1.5, md: 3 } }}>
            <IconButton
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú de navegación"
              edge="start"
              sx={{ display: { xs: "inline-flex", md: "none" } }}
            >
              <MenuIcon />
            </IconButton>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <RefreshBar />
            </Box>
            <IconButton
              onClick={toggle}
              aria-label={mode === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
              data-testid="theme-toggle"
              edge="end"
            >
              {mode === "dark" ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          data-testid="app-content"
          sx={{
            flexGrow: 1,
            overflowY: "auto",
            width: "100%",
            maxWidth: 1600,
            mx: "auto",
            p: { xs: 2, md: 4 },
            pb: { xs: 10, md: 4 },
          }}
        >
          <Outlet />
        </Box>

        <Box
          component="footer"
          data-testid="app-footer"
          role="contentinfo"
          sx={{
            bgcolor: "background.paper",
            borderTop: 1,
            borderColor: "divider",
            px: { xs: 2, md: 4 },
            py: 1.5,
            textAlign: "center",
          }}
        >
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            Elaborado por Dirección de Tecnología
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Ministerio de Desarrollo Social y Promoción del Empleo
          </Typography>
        </Box>
      </Box>

      <BottomNav />
    </Box>
  );
}
