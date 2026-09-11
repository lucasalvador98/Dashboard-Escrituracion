import React from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";

/**
 * Shared loading placeholder (P7b-migrate): replaces the old `.spinner`
 * Tailwind/CSS class with a themed MUI CircularProgress so the loading state is
 * legible in both light and dark mode.
 *
 * Props:
 *  - message: optional text shown under the spinner (e.g. "Cargando datos...")
 *  - py: vertical padding in MUI spacing units (py-8 → 4, py-16 → 8, py-24 → 12)
 */
export default function LoadingState({ message, py = 6, label = "Cargando" }) {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        py,
      }}
    >
      <CircularProgress size={32} aria-label={label} />
      {message ? (
        <Typography sx={{ fontSize: 14, fontWeight: 500, color: "text.secondary" }}>
          {message}
        </Typography>
      ) : null}
    </Box>
  );
}
