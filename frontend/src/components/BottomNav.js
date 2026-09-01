import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import Paper from "@mui/material/Paper";
import BottomNavigation from "@mui/material/BottomNavigation";
import BottomNavigationAction from "@mui/material/BottomNavigationAction";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HomeIcon from "@mui/icons-material/Home";
import TableChartIcon from "@mui/icons-material/TableChart";
import GroupsIcon from "@mui/icons-material/Groups";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon /> },
  { to: "/escrituracion", label: "Escrituración", icon: <HomeIcon /> },
  { to: "/stock", label: "Stock", icon: <TableChartIcon /> },
  { to: "/escribanos", label: "Escribanos", icon: <GroupsIcon /> },
];

// SH-2: MUI BottomNavigation, visible only below the md breakpoint (D2 — sx only).
export default function BottomNav() {
  const { pathname } = useLocation();
  return (
    <Paper
      component="nav"
      aria-label="Navegación inferior"
      elevation={3}
      data-testid="app-bottom-nav"
      sx={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1100,
        display: { xs: "block", md: "none" },
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      <BottomNavigation value={pathname} showLabels sx={{ height: 64, bgcolor: "background.paper" }}>
        {NAV_ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.to}
            component={NavLink}
            to={item.to}
            value={item.to}
            label={item.label}
            icon={item.icon}
            sx={{
              "& .MuiBottomNavigationAction-label": { fontSize: 11, fontWeight: 600 },
            }}
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
