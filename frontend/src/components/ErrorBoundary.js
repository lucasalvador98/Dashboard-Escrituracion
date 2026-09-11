import React from "react";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary] ${this.props.name || "Tab"}:`, error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert
          severity="error"
          icon={<span aria-hidden="true">⚠️</span>}
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Reintentar
            </Button>
          }
          sx={{ my: 2, alignItems: "center" }}
        >
          <Typography component="h3" sx={{ fontSize: 16, fontWeight: 700, mb: 0.5 }}>
            Error en {this.props.name || "esta sección"}
          </Typography>
          <Typography variant="body2">
            {this.state.error?.message || "Ocurrió un error inesperado."}
          </Typography>
        </Alert>
      );
    }

    return this.props.children;
  }
}
