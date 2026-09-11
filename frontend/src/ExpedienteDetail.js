import React from "react";
import { useParams, Link } from "react-router-dom";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import useDataLoader from "./hooks/useDataLoader";
import TimelineBar from "./components/TimelineBar";
import { useSemaphorePalette } from "./components/ui/renderCells";
import { INTERVALS, diffClass, parseDate } from "./lib/deadlines";

// Semaphore labels (INV-3): identical user-visible text to the pre-refactor page.
const LABEL = {
  green: "Dentro del plazo",
  yellow: "Alerta",
  red: "Demora",
  gray: "Sin datos",
};

function getExpediente(data, paramId) {
  if (!Array.isArray(data) || !paramId) return null;
  const decoded = decodeURIComponent(paramId);
  return (
    data.find((it) => {
      const dni = String(it.DNI ?? it.dni ?? it.documento ?? "");
      return dni === decoded;
    }) ||
    data.find((it) => {
      const id = String(it.id ?? "");
      return id === decoded;
    }) ||
    null
  );
}

function formatDate(fecha) {
  if (!fecha || fecha === "N/A" || fecha === "") return "—";
  const d = parseDate(fecha);
  if (!d) return fecha;
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Shared link styling for the page's navigation links.
const linkSx = {
  textDecoration: "none",
  color: "primary.main",
  fontWeight: 600,
  "&:hover": { textDecoration: "underline" },
};

export default function ExpedienteDetail() {
  const { id } = useParams();
  const { data, loading, error } = useDataLoader("escrituracion");
  const palette = useSemaphorePalette();

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", py: 10 }}>
        <Typography sx={{ fontSize: 14, color: "text.secondary" }}>
          Cargando expediente…
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography sx={{ fontSize: 14, color: "error.main", mb: 1.5 }}>{error}</Typography>
        <Typography component={Link} to="/dashboard" sx={{ ...linkSx, fontSize: 14 }}>
          Volver al dashboard
        </Typography>
      </Box>
    );
  }

  const item = getExpediente(data, id);

  if (!item) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography sx={{ fontSize: 48, lineHeight: 1, mb: 2 }}>🔍</Typography>
        <Typography
          component="h2"
          sx={{ fontSize: 18, fontWeight: 700, color: "text.primary", mb: 1 }}
        >
          Expediente no encontrado
        </Typography>
        <Typography sx={{ fontSize: 14, color: "text.secondary", mb: 2 }}>
          No se encontró ningún expediente con el identificador{" "}
          <Box component="code" sx={{ fontFamily: "monospace", color: "text.primary" }}>
            {decodeURIComponent(id)}
          </Box>
          .
        </Typography>
        <Typography
          component={Link}
          to="/dashboard"
          sx={{ ...linkSx, display: "inline-block", fontSize: 14 }}
        >
          Volver al dashboard
        </Typography>
      </Box>
    );
  }

  const nombre =
    item.Beneficiarios ??
    item.Beneficiario ??
    item["APELLIDO Y NOMBRE"] ??
    "Sin nombre";
  const dni = item.DNI ?? item.dni ?? item.documento ?? "—";
  const escribano =
    item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "—";
  const estado = item.Estado ?? "—";

  // Build enriched intervals with computed values
  const enriched = INTERVALS.map((iv) => {
    const val = item[iv.key];
    const cls = diffClass(val, iv.esperado);
    const fecha1 = item[iv.fecha1];
    const fecha2 = item[iv.fecha2];
    return { ...iv, val, cls, fecha1, fecha2 };
  });

  return (
    <Box sx={{ maxWidth: 896, mx: "auto" }}>
      {/* Back links */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mb: 3 }}>
        <Typography
          component={Link}
          to="/dashboard"
          sx={{
            fontSize: 12,
            fontWeight: 600,
            color: "text.secondary",
            textDecoration: "none",
            transition: "color 0.2s ease",
            "&:hover": { color: "primary.main" },
          }}
        >
          Dashboard
        </Typography>
        <Typography sx={{ fontSize: 12, color: "text.disabled" }}>/</Typography>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>
          Expediente
        </Typography>
      </Box>

      {/* Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "flex-start", sm: "center" },
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography
              component="h1"
              sx={{ fontSize: 20, fontWeight: 700, color: "text.primary", mb: 0.5 }}
            >
              {nombre}
            </Typography>
            <Typography
              sx={{ fontSize: 14, color: "text.secondary", fontFamily: "monospace" }}
            >
              DNI {dni}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            <Chip
              label={estado}
              sx={{ bgcolor: "action.selected", color: "text.primary", fontWeight: 700, fontSize: 12 }}
            />
            <Chip
              label={escribano}
              sx={{
                bgcolor: (theme) =>
                  alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.24 : 0.1),
                color: (theme) =>
                  theme.palette.mode === "dark"
                    ? theme.palette.primary.light
                    : theme.palette.primary.main,
                fontWeight: 700,
                fontSize: 12,
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* Timeline */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography
          component="h2"
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: "text.primary",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            mb: 2,
          }}
        >
          Cronología
        </Typography>
        <TimelineBar item={item} intervals={INTERVALS} />
      </Paper>

      {/* Interval details */}
      <Paper sx={{ p: 3 }}>
        <Typography
          component="h2"
          sx={{
            fontSize: 14,
            fontWeight: 700,
            color: "text.primary",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            mb: 2,
          }}
        >
          Detalle de Plazos
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {enriched.map((iv) => {
            const colors = palette[iv.cls] ?? palette.gray;
            return (
              <Card
                key={iv.key}
                variant="outlined"
                elevation={0}
                sx={{ transition: "border-color 0.2s ease", "&:hover": { borderColor: "primary.light" } }}
              >
                <CardContent
                  sx={{
                    display: "flex",
                    flexDirection: { xs: "column", sm: "row" },
                    alignItems: { xs: "flex-start", sm: "center" },
                    gap: 1.5,
                  }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
                      {iv.fullLabel}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 0.25 }}>
                      {formatDate(iv.fecha1)} → {formatDate(iv.fecha2)}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexShrink: 0 }}>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontSize: 14, fontWeight: 700, color: "text.primary" }}>
                        {iv.val !== "N/A" && iv.val !== "" && iv.val != null
                          ? `${iv.val}d`
                          : "—"}
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: "text.secondary" }}>
                        esperado {iv.esperado}d
                      </Typography>
                    </Box>
                    <Chip
                      label={LABEL[iv.cls]}
                      size="small"
                      sx={{ bgcolor: colors.bg, color: colors.text, fontWeight: 700, fontSize: 11 }}
                    />
                  </Box>
                </CardContent>
              </Card>
            );
          })}
        </Box>
      </Paper>
    </Box>
  );
}
