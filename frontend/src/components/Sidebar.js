import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Typography from "@mui/material/Typography";
import ArticleIcon from "@mui/icons-material/Article";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HomeIcon from "@mui/icons-material/Home";
import TableChartIcon from "@mui/icons-material/TableChart";
import GroupsIcon from "@mui/icons-material/Groups";

const DRAWER_WIDTH = 224;

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: <DashboardIcon fontSize="small" /> },
  { to: "/escrituracion", label: "Escrituración", icon: <HomeIcon fontSize="small" /> },
  { to: "/stock", label: "Stock", icon: <TableChartIcon fontSize="small" /> },
  { to: "/escribanos", label: "Escribanos", icon: <GroupsIcon fontSize="small" /> },
];

function Brand() {
  return (
    <Box
      sx={{
        px: 2.5,
        py: 2.25,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        borderBottom: 1,
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          borderRadius: 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
          color: "#fff",
          boxShadow: 2,
        }}
      >
        <ArticleIcon sx={{ fontSize: 22 }} />
      </Box>
      <Box>
        <Typography
          variant="caption"
          component="div"
          sx={{ fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.25, fontSize: 12 }}
        >
          Dirección de
        </Typography>
        <Typography
          variant="caption"
          component="div"
          sx={{ fontWeight: 900, letterSpacing: "-0.02em", lineHeight: 1.25, fontSize: 12, color: "primary.main" }}
        >
          Tecnología
        </Typography>
      </Box>
    </Box>
  );
}

// Shared navigation content, rendered inside both the permanent (desktop) and
// temporary (mobile) drawers. onNavigate closes the mobile drawer on selection.
function SidebarContent({ onNavigate }) {
  const { pathname } = useLocation();
  return (
    <Box
      role="complementary"
      aria-label="Navegación principal"
      sx={{ display: "flex", flexDirection: "column", height: "100%" }}
    >
      <Brand />
      <Box component="nav" aria-label="Pestañas" sx={{ flex: 1, overflowY: "auto" }}>
        <List sx={{ px: 1.5, py: 2 }}>
          {NAV_ITEMS.map((item) => (
            <ListItem key={item.to} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                component={NavLink}
                to={item.to}
                selected={pathname === item.to}
                onClick={onNavigate}
                sx={{
                  borderRadius: 2,
                  py: 1.25,
                  "&.Mui-selected": {
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    "&:hover": { bgcolor: "primary.dark" },
                  },
                  "&:hover": { bgcolor: "action.hover" },
                  "& .MuiListItemIcon-root": { color: "inherit", minWidth: 36 },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }}
                />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </Box>
      <Box sx={{ px: 2, py: 1.5, borderTop: 1, borderColor: "divider", textAlign: "center" }}>
        <Typography variant="caption" sx={{ fontSize: 10, fontWeight: 600, color: "text.secondary" }}>
          Dashboard Escrituración
        </Typography>
      </Box>
    </Box>
  );
}

// SH-1: persistent Drawer on >=md viewports (sx breakpoint, D2 — no useMediaQuery),
// temporary overlay Drawer on mobile, closed on backdrop/ESC/destination (SH-5).
export default function Sidebar({ mobileOpen = false, onClose = () => {} }) {
  return (
    <>
      <Drawer
        variant="permanent"
        open
        data-testid="app-sidebar"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          display: { xs: "none", md: "block" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <SidebarContent onNavigate={onClose} />
      </Drawer>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        data-testid="app-sidebar-mobile"
        transitionDuration={0}
        sx={{
          display: { xs: "block", md: "none" },
          "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
        }}
      >
        <SidebarContent onNavigate={onClose} />
      </Drawer>
    </>
  );
}
