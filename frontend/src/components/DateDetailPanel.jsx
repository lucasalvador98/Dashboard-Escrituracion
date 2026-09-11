import React from "react";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import TimelineBar from "./TimelineBar";
import { INTERVALS, diffClass } from "../hooks/useEscrituracion";
import { useSemaphorePalette } from "./ui/renderCells";
import ArrowForward from "@mui/icons-material/ArrowForward";
import LocationOn from "@mui/icons-material/LocationOn";

// Same user-visible labels as the pre-refactor component (INV-3).
const STATUS_LABELS = {
  green: "✅ Dentro del plazo",
  yellow: "⚠️ Alerta",
  red: "🔴 Demora",
  gray: "⚪ Sin datos",
};

/**
 * One side of the dates row. The "from" card keeps the primary left rule and
 * the "to" card the success left rule; the rest of the layout meaning is
 * preserved from the old `.date-card` markup.
 */
function DateCard({ tone, label, field, value }) {
  const isFrom = tone === "from";
  const accent = isFrom ? "primary.main" : "success.main";
  return (
    <Box
      sx={{
        flex: 1,
        bgcolor: "background.default",
        border: 1,
        borderColor: "divider",
        borderLeft: "3px solid",
        borderLeftColor: accent,
        borderRadius: 2,
        px: 1.5,
        py: 1.25,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Typography
        sx={{
          fontSize: 10,
          fontWeight: 800,
          color: accent,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          mb: 0.25,
        }}
      >
        {label}
      </Typography>
      <Typography
        sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary", lineHeight: 1.3, mb: 0.5 }}
      >
        {field}
      </Typography>
      <Typography
        sx={{
          fontSize: 17,
          fontWeight: 800,
          color: "text.primary",
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.3,
        }}
      >
        {value}
      </Typography>
    </Box>
  );
}

export default function DateDetailPanel({ intervalDetail }) {
  const palette = useSemaphorePalette();
  if (!intervalDetail) return null;

  const { interval: iv, item } = intervalDetail;
  const val = item[iv.key];
  const cls = diffClass(val, iv.esperado);
  const fecha1Val = item[iv.fecha1] || "—";
  const fecha2Val = item[iv.fecha2] || "—";
  const statusLabel = STATUS_LABELS[cls] || "Sin datos";
  const hasValue = val !== "N/A" && val !== "" && val != null;
  const colors = palette[cls] ?? palette.gray;
  const beneficiary =
    item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre;

  return (
    <Box sx={{ p: 0.5 }}>
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 1 }}>
          <Typography component="h4" sx={{ fontSize: 16, fontWeight: 600, color: "text.primary" }}>
            {iv.fullLabel}
          </Typography>
          <Chip
            label={statusLabel}
            sx={{ bgcolor: colors.bg, color: colors.text, fontWeight: 700, fontSize: 12 }}
          />
        </Box>
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          {beneficiary}
          {item.DNI ? ` — DNI ${item.DNI}` : ""}
        </Typography>
      </Box>

      <Box sx={{ mb: 3 }}>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 500,
            color: "text.secondary",
            textTransform: "uppercase",
            mb: 1,
          }}
        >
          Progreso General
        </Typography>
        <TimelineBar item={item} intervals={INTERVALS} highlightedInterval={iv.key} />
      </Box>

      <Box sx={{ display: "flex", alignItems: "stretch", gap: 1.5, mb: 2.5 }}>
        <DateCard tone="from" label="Desde" field={iv.fecha1} value={fecha1Val} />
        <Box
          sx={{
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ width: "1px", flex: 1, bgcolor: "divider" }} />
          <ArrowForward sx={{ fontSize: 20, color: "primary.main" }} />
          <Box sx={{ width: "1px", flex: 1, bgcolor: "divider" }} />
        </Box>
        <DateCard tone="to" label="Hasta" field={iv.fecha2} value={fecha2Val} />
      </Box>

      <Box
        sx={{
          bgcolor: "background.default",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          p: 2,
          mb: 2,
        }}
      >
        <Typography
          sx={{
            fontSize: 10,
            fontWeight: 800,
            color: "text.secondary",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            mb: 1,
          }}
        >
          Diferencia
        </Typography>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Chip
            label={hasValue ? `${val} días hábiles` : "Sin datos"}
            sx={{
              bgcolor: colors.bg,
              color: colors.text,
              fontSize: 18,
              fontWeight: 700,
              height: "auto",
              px: 2.5,
              py: 1,
              "& .MuiChip-label": { px: 0 },
            }}
          />
          <Typography sx={{ fontSize: 13, color: "text.secondary", fontWeight: 500 }}>
            Plazo esperado:{" "}
            <Box component="strong" sx={{ color: "text.primary", fontWeight: 700 }}>
              {iv.esperado} días
            </Box>
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.375rem 1rem",
          fontSize: 12,
          color: "text.secondary",
          fontWeight: 500,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          <LocationOn sx={{ fontSize: 14, mr: 0.5 }} />
          {item.Departamento || "—"}
        </Box>
        <Box>{item.Localidad || "—"}</Box>
        <Box>{item.Barrio || "—"}</Box>
        <Box>
          Estado:{" "}
          <Box component="strong" sx={{ color: "text.primary" }}>
            {item.Estado || "—"}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
