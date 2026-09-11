import { useTheme } from "@mui/material/styles";

/**
 * recharts palette derived from the MUI theme (design D7 / spec TH-6).
 *
 * Charts consume these tokens instead of hardcoded light-only hex values so
 * they stay legible in both light and dark modes. Mapping:
 *   - grid      → theme divider (axis gridlines)
 *   - axis      → text.secondary (X/Y axis tick labels)
 *   - bar       → primary.main (violet #7c3aed)
 *   - line      → error.main (red)
 *   - tooltip   → paper surface + divider border + theme text
 *   - cursor    → primary-tinted hover band (stronger in dark mode)
 *
 * No chart type or data changes — colors only (INV-2).
 */
export function useChartPalette() {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  return {
    grid: theme.palette.divider,
    axis: theme.palette.text.secondary,
    bar: theme.palette.primary.main,
    line: theme.palette.error.main,
    item: theme.palette.text.primary,
    cursor: isDark ? "rgba(124, 58, 237, 0.16)" : "rgba(59, 130, 246, 0.06)",
    tooltip: {
      borderRadius: "12px",
      border: `1px solid ${theme.palette.divider}`,
      background: theme.palette.background.paper,
      boxShadow: isDark ? "0 4px 16px rgba(0,0,0,0.5)" : "0 4px 12px rgba(0,0,0,0.08)",
      fontSize: "13px",
      color: theme.palette.text.primary,
    },
  };
}