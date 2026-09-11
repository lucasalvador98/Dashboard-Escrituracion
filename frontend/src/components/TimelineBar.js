import React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { INTERVALS, diffClass } from "../lib/deadlines";
import { useSemaphorePalette } from "./ui/renderCells";

// Stages configuration - derived from the shared INTERVALS
const STAGES = [
  { label: "Ingreso Colegio", field: INTERVALS[0].fecha1 },
  { label: "Sorteo", field: INTERVALS[0].fecha2 },
  { label: "Aceptación", field: INTERVALS[1].fecha2 },
  { label: "Firma", field: INTERVALS[2].fecha2 },
  { label: "Ingreso Registro", field: INTERVALS[3].fecha2 },
  { label: "Testimonio", field: INTERVALS[4].fecha2 },
];

/**
 * Six-stage progress bar (UI-5). Segment status is unchanged: empty when the
 * interval is missing, future when the difference has no value yet, otherwise
 * the shared semaphore rule (diffClass) colors the segment. The interval
 * preceding a stage is the one highlighted when the panel opens on it.
 */
export default function TimelineBar({ stages = STAGES, intervals = [], item, highlightedInterval }) {
  const palette = useSemaphorePalette();
  if (!item) return null;

  const getSegmentStatus = (stage, interval) => {
    if (!interval) return "empty";
    const val = item[interval.key];
    if (val === "N/A" || val === "" || val == null) return "filled-future";
    return "filled";
  };

  return (
    <Box>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
          gap: 1,
        }}
      >
        {stages.map((stage, idx) => {
          const interval = intervals[idx];
          const status = interval ? getSegmentStatus(stage, interval) : "empty";

          let bgcolor = "action.disabledBackground";
          if (status === "filled" && interval) {
            const val = item[interval.key];
            const cls = diffClass(val, interval.esperado);
            bgcolor = (palette[cls] ?? palette.gray).text;
          } else if (status === "filled-future") {
            bgcolor = "primary.light";
          }

          const relevantInterval = idx > 0 && intervals[idx - 1] ? intervals[idx - 1] : null;
          const isHighlighted =
            relevantInterval && highlightedInterval && highlightedInterval === relevantInterval.key;

          return (
            <Box key={idx} sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <Box
                title={`${stage.label}: ${interval ? item[stage.field] || "—" : "—"}`}
                sx={{
                  height: 12,
                  width: "100%",
                  borderRadius: "6px",
                  bgcolor,
                  opacity: status === "empty" ? 0.3 : 1,
                  transition: "background-color 0.2s ease",
                  ...(isHighlighted
                    ? {
                        boxShadow: (theme) =>
                          `0 0 0 2px ${theme.palette.primary.main}, ${theme.shadows[3]}`,
                        transform: "scale(1.1)",
                        zIndex: 1,
                      }
                    : {}),
                }}
              />
              <Typography
                sx={{
                  fontSize: 12,
                  color: "text.secondary",
                  mt: 0.5,
                  textAlign: "center",
                  maxWidth: 60,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {stage.label}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
