import React from "react";
import Alert from "@mui/material/Alert";

/**
 * Shared error placeholder (P7b-migrate): replaces the old alert error CSS
 * classes with a themed MUI Alert. The message is
 * rendered verbatim so the user-visible text is unchanged (INV-3).
 *
 * Props:
 *  - message: error text
 *  - sx: optional MUI sx overrides (callers keep their previous margins)
 */
export default function ErrorAlert({ message, sx }) {
  return (
    <Alert severity="error" sx={sx}>
      {message}
    </Alert>
  );
}
