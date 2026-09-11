import React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import { useTheme } from "@mui/material/styles";

// Light semaphore palette fallback (INV-2). Used when the grid renders outside
// a themed provider (e.g. tests mounting AppRoutes standalone); under the app's
// ThemeModeProvider the colors come from theme.palette.semaphore instead, so
// dark mode keeps the hue-preserving tints from theme.js.
const SEMAPHORE_LIGHT = {
  green: { bg: "#d1fae5", text: "#047857" },
  yellow: { bg: "#fef3c7", text: "#b45309" },
  red: { bg: "#fee2e2", text: "#b91c1c" },
  gray: { bg: "#f1f5f9", text: "#64748b" },
};

export function useSemaphorePalette() {
  const theme = useTheme();
  return theme.palette?.semaphore ?? SEMAPHORE_LIGHT;
}

// Status pill semantics (DG-6): Entregada=success, Finalizada sin Entregar=info,
// De Baja=default, Hipotecada=error; any other value falls back to default.
const PILL_COLORS = {
  Entregada: "success",
  "Finalizada sin Entregar": "info",
  "De Baja": "default",
  Hipotecada: "error",
};

/**
 * renderCell builder for semaphore cells (DG-5/DG-7).
 * Renders a Chip colored by the shared diffClass rule; clicking it opens the
 * interval detail via onSelect(row) (the page decides the payload).
 *
 * @param {function} diffClassFn  shared semaphore rule (diffClass from lib/deadlines)
 * @param {object}    options     { esperado, fullLabel, fecha1, fecha2, onSelect }
 * @returns renderCell component
 */
export function semaphoreCell(diffClassFn, { esperado, fullLabel, fecha1, fecha2, onSelect } = {}) {
  return function SemaphoreCell(params) {
    const palette = useSemaphorePalette();
    const val = params.value;
    const cls = diffClassFn(val, esperado);
    const empty = val === "N/A" || val === "" || val == null;
    const fechas =
      fecha1 && fecha2 && params.row[fecha1] && params.row[fecha2]
        ? `${params.row[fecha1]} → ${params.row[fecha2]}`
        : "Fechas no disponibles";
    const colors = palette[cls] ?? SEMAPHORE_LIGHT.gray;

    return (
      <Chip
        size="small"
        label={empty ? "—" : `${val}d`}
        title={fullLabel ? `${fullLabel}\n${fechas}` : fechas}
        onClick={(e) => {
          e.stopPropagation();
          if (onSelect) onSelect(params.row);
        }}
        sx={{
          bgcolor: colors.bg,
          color: colors.text,
          fontWeight: 700,
          minWidth: 52,
          cursor: onSelect ? "pointer" : "default",
          "&:hover": onSelect ? { filter: "brightness(0.96)" } : {},
        }}
      />
    );
  };
}

/**
 * renderCell builder for status pills (DG-6).
 *
 * @param {object} colorMap  value → MUI chip color (defaults to PILL_COLORS)
 * @param {object} options   { onClick(row, field) } when the pill is click-to-filter
 * @returns renderCell component
 */
export function pillCell(colorMap = PILL_COLORS, { onClick } = {}) {
  return function PillCell(params) {
    const value = params.value == null ? "—" : String(params.value);
    const color = colorMap[value] || "default";
    return (
      <Chip
        size="small"
        label={value}
        color={color}
        title={onClick ? `Filtrar por "${value}"` : undefined}
        onClick={onClick ? (e) => { e.stopPropagation(); onClick(params.row, params.field); } : undefined}
        sx={{ fontWeight: 600, ...(onClick ? { cursor: "pointer" } : {}) }}
      />
    );
  };
}

/**
 * renderCell builder for fixed-color count badges (Escribanos per-Estado
 * columns). Renders a Chip with the given MUI color when the count is > 0 and
 * a muted em dash otherwise, mirroring the previous table's
 * `count > 0 ? badge : "—"` rendering. The color is fixed per column (each
 * column represents one Estado), so the page passes its estado color directly.
 *
 * @param {string} color  MUI chip color for this column's estado
 * @returns renderCell component
 */
export function countBadgeCell(color = "default") {
  return function CountBadgeCell(params) {
    const count = params.value;
    if (!count) {
      return (
        <Box component="span" sx={{ color: "text.disabled" }}>
          —
        </Box>
      );
    }
    return (
      <Chip
        size="small"
        color={color}
        label={count}
        sx={{ fontWeight: 700, minWidth: 36 }}
      />
    );
  };
}

/**
 * renderCell builder for click-to-filter cells (DG-6): Departamento, Localidad,
 * Barrio, Escribano Designado. onClick receives (row, field) so the page reads
 * the raw value (filter semantics unchanged).
 *
 * @param {function} onClick  (row, field) => void
 * @returns renderCell component
 */
export function clickableCell(onClick) {
  return function ClickableCell(params) {
    const value = params.value == null ? "—" : String(params.value);
    return (
      <Box
        component="span"
        title={`Filtrar por "${value}"`}
        onClick={(e) => {
          e.stopPropagation();
          onClick(params.row, params.field);
        }}
        sx={{
          cursor: "pointer",
          color: "primary.main",
          textDecoration: "underline",
          textDecorationColor: "primary.light",
          "&:hover": { textDecorationColor: "primary.main" },
        }}
      >
        {value}
      </Box>
    );
  };
}