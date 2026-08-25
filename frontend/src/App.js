import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import AppLayout from "./AppLayout";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardTab from "./DashboardTab";
import Escrituracion from "./Escrituracion";
import StockTab from "./StockTab";
import EscribanosTab from "./EscribanosTab";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

// Route table, kept separate from the router so tests can mount it under MemoryRouter.
export function AppRoutes() {
  const location = useLocation();
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route
          path="/dashboard"
          element={
            <ErrorBoundary key="dashboard" name="Dashboard">
              <DashboardTab />
            </ErrorBoundary>
          }
        />
        <Route
          path="/escrituracion"
          element={
            <ErrorBoundary key="escrituracion" name="Escrituración">
              <Escrituracion />
            </ErrorBoundary>
          }
        />
        <Route
          path="/stock"
          element={
            <ErrorBoundary key="stock" name="Stock">
              <StockTab />
            </ErrorBoundary>
          }
        />
        <Route
          path="/escribanos"
          element={
            <ErrorBoundary key="escribanos" name="Escribanos">
              <EscribanosTab />
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<Navigate to={{ pathname: "/dashboard", search: location.search }} replace />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
