import React from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import { alpha, useTheme } from "@mui/material/styles";

/**
 * Clickable status-count cards (UI-1). Rebuilt on MUI Card + CardActionArea:
 * same props contract ({ counts, totalCount, selectedEstado, setSelectedEstado,
 * setFilters, setPage, ipvCount }), same counts / "% del total" meta / IPV card,
 * and the same click-to-filter-estado toggle that resets pagination to page 1.
 *
 * CardActionArea renders a native <button>, so Enter/Space activation and
 * focus visibility come from the platform instead of a hand-rolled keydown
 * handler (the old role="button" + tabIndex div); aria-pressed still exposes
 * the selected state programmatically. All colors derive from theme tokens so
 * both modes stay legible (INV-2).
 */
export default function StatusCards({ counts, totalCount, selectedEstado, setSelectedEstado, setFilters, setPage, ipvCount }) {
  const theme = useTheme();
  const keys = Object.keys(counts);

  const selectedBg = alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.06);
  const ipvMetaColor = theme.palette.mode === "dark" ? theme.palette.primary.light : "#6366f1";

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(6, 1fr)" },
        gap: 2,
        mb: 4,
      }}
    >
      {keys.map(key => {
        const count = counts[key] || 0;
        const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
        const isActive = selectedEstado === key;

        const toggle = () => {
          setSelectedEstado(prev => (prev === key ? null : key));
          setFilters(prev => ({
            ...prev,
            estado: selectedEstado === key ? "Todos" : key,
          }));
          setPage(1);
        };

        return (
          <Card
            key={key}
            elevation={isActive ? 4 : 1}
            sx={{
              border: 1,
              borderColor: isActive ? "primary.main" : "divider",
              bgcolor: isActive ? selectedBg : "background.paper",
              transition: "all 300ms ease",
              "&:hover": { boxShadow: 8, transform: "translateY(-4px)" },
            }}
          >
            <CardActionArea onClick={toggle} aria-pressed={isActive} sx={{ height: "100%", textAlign: "left" }}>
              <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.75, px: 2.5, py: 2 }}>
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "text.secondary",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    lineHeight: 1.2,
                  }}
                >
                  {key}
                </Typography>
                <Typography
                  sx={{ fontSize: 30, fontWeight: 900, color: "text.primary", letterSpacing: "-0.02em", lineHeight: 1.1 }}
                >
                  {count.toLocaleString()}
                </Typography>
                <Box
                  sx={{
                    mt: 0.5,
                    width: "fit-content",
                    bgcolor: "action.hover",
                    color: "text.secondary",
                    fontSize: 10,
                    fontWeight: 600,
                    px: 1,
                    py: 0.25,
                    borderRadius: 999,
                  }}
                >
                  {pct}% del total
                </Box>
              </CardContent>
            </CardActionArea>
          </Card>
        );
      })}

      {ipvCount > 0 && (
        <Card
          elevation={1}
          title="IPV: Caso en Dirección de Viviendas"
          sx={{ border: 1, borderColor: "divider", bgcolor: "background.paper" }}
        >
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 0.75, px: 2.5, py: 2 }}>
            <Typography
              variant="caption"
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: "text.secondary",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                lineHeight: 1.2,
              }}
            >
              IPV
            </Typography>
            <Typography
              sx={{ fontSize: 30, fontWeight: 900, color: "text.primary", letterSpacing: "-0.02em", lineHeight: 1.1 }}
            >
              {ipvCount.toLocaleString()}
            </Typography>
            <Box sx={{ mt: 0.5, width: "fit-content", fontSize: 10, fontWeight: 600, color: ipvMetaColor }}>
              ipv
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}