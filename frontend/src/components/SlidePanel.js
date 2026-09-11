import React from "react";
import Drawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";
import CloseIcon from "@mui/icons-material/Close";

/**
 * Slide-over detail panel (UI-2). Rebuilt on the MUI temporary Drawer anchored
 * to the right: same props contract ({ isOpen, onClose, title, children }),
 * same 600px max width, same slide transition, and ESC/backdrop/close-button
 * dismissal are handled natively by the Drawer's Modal. The header title keeps
 * its h3 heading role (INV-3) and the Paper surface uses the theme's
 * background.paper token so the panel stays legible in dark mode.
 *
 * `ModalProps.disablePortal` keeps the drawer inside the page's DOM subtree
 * instead of portaling to <body>: no ancestor creates a containing block
 * (transform/filter), so the fixed overlay still covers the viewport, and
 * existing tests asserting container.textContent for open panels keep passing.
 */
export default function SlidePanel({ isOpen, onClose, title, children }) {
  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={onClose}
      ModalProps={{ disablePortal: true }}
      PaperProps={{ sx: { width: 600, maxWidth: "100%" } }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 3,
          py: 2,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          flexShrink: 0,
        }}
      >
        <Typography component="h3" sx={{ fontSize: 18, fontWeight: 600, color: "text.primary" }}>
          {title}
        </Typography>
        <IconButton
          onClick={onClose}
          aria-label="Close panel"
          size="small"
          sx={{ color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
      <Box sx={{ flexGrow: 1, overflowY: "auto" }}>{children}</Box>
    </Drawer>
  );
}