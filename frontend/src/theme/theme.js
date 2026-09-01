import { createTheme } from "@mui/material/styles";

// Full violet scale (violet-600 #7c3aed as primary)
const violetScale = {
  50: "#f5f3ff",
  100: "#ede9fe",
  200: "#ddd6fe",
  300: "#c4b5fd",
  400: "#a78bfa",
  500: "#8b5cf6",
  600: "#7c3aed",
  700: "#6d28d9",
  800: "#5b21b6",
  900: "#4c1d95",
};

// Semaphore palette — light badge pairs (bg/text) + dark hue-preserving tints.
// INV-2: all four states must be distinguishable in both themes.
const semaphoreLight = {
  green: { bg: "#d1fae5", text: "#047857" },
  yellow: { bg: "#fef3c7", text: "#b45309" },
  red: { bg: "#fee2e2", text: "#b91c1c" },
  gray: { bg: "#f1f5f9", text: "#64748b" },
};

const semaphoreDark = {
  green: { bg: "rgba(16, 185, 129, 0.16)", text: "#6ee7b7" },
  yellow: { bg: "rgba(245, 158, 11, 0.16)", text: "#fcd34d" },
  red: { bg: "rgba(239, 68, 68, 0.16)", text: "#fca5a5" },
  gray: { bg: "rgba(148, 163, 184, 0.16)", text: "#94a3b8" },
};

function getDesignTokens(mode) {
  const isDark = mode === "dark";

  return {
    palette: {
      mode,
      primary: {
        ...violetScale,
        main: "#7c3aed",
        light: "#a78bfa",
        dark: "#6d28d9",
        contrastText: "#fff",
      },
      secondary: {
        main: "#a78bfa",
        light: "#c4b5fd",
        dark: "#8b5cf6",
        contrastText: "#1e293b",
      },
      ...(isDark
        ? {
            background: {
              default: "#0f0e13",
              paper: "#171422",
            },
            text: {
              primary: "#e2e8f0",
              secondary: "#94a3b8",
            },
            divider: "rgba(148, 163, 184, 0.2)",
          }
        : {
            background: {
              default: "#f8fafc",
              paper: "#ffffff",
            },
            text: {
              primary: "#1e293b",
              secondary: "#64748b",
            },
            divider: "#e2e8f0",
          }),
      success: { main: "#10b981" },
      warning: { main: "#f59e0b" },
      error: { main: "#ef4444" },
      info: { main: "#a78bfa" },
      // Custom semaphore slot (INV-2) — consumed by semaphore chips.
      semaphore: isDark ? semaphoreDark : semaphoreLight,
    },
    shape: {
      borderRadius: 12,
    },
    typography: {
      fontFamily: [
        "Inter",
        "system-ui",
        "-apple-system",
        "Segoe UI",
        "Roboto",
        "sans-serif",
      ].join(","),
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            backgroundColor: isDark ? "#0f0e13" : "#f8fafc",
          },
        },
      },
      MuiCard: {
        defaultProps: {
          elevation: 1,
        },
        styleOverrides: {
          root: {
            borderRadius: 12,
          },
        },
      },
      MuiCardContent: {
        styleOverrides: {
          root: {
            "&:last-child": {
              paddingBottom: 16,
            },
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 10,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: {
            fontWeight: 600,
          },
        },
      },
    },
  };
}

export function createAppTheme(mode) {
  return createTheme(getDesignTokens(mode));
}

export default createAppTheme("light");
