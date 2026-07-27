import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Sidebar from "./components/Sidebar";
import RefreshBar from "./components/RefreshBar";
import ErrorBoundary from "./components/ErrorBoundary";
import DashboardTab from "./DashboardTab";
import Escrituracion from "./Escrituracion";
import StockTab from "./StockTab";
import MontosTab from "./MontosTab";
import EscribanosTab from "./EscribanosTab";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

function AppContent() {
  const [activeTab, setActiveTab] = useState(0); // 0: Dashboard, 1: Escrituracion, 2: Stock, 3: Montos, 4: Escribanos
  const tabs = [
    <ErrorBoundary key="dashboard" name="Dashboard"><DashboardTab /></ErrorBoundary>,
    <ErrorBoundary key="escrituracion" name="Escrituración"><Escrituracion /></ErrorBoundary>,
    <ErrorBoundary key="stock" name="Stock"><StockTab /></ErrorBoundary>,
    <ErrorBoundary key="montos" name="Montos"><MontosTab /></ErrorBoundary>,
    <ErrorBoundary key="escribanos" name="Escribanos"><EscribanosTab /></ErrorBoundary>,
  ];

  return (
    <div className="app-root">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        itemsCount={5}
      />

      <div className="app-content">
        <header className="app-header flex items-center justify-between">
          <RefreshBar />
        </header>
        <main className="app-main">
          {tabs[activeTab]}
        </main>

        <footer className="app-footer" role="contentinfo">
          <div className="text-center space-y-1">
            <div className="font-medium">Elaborado por Dirección de Tecnología</div>
            <div className="text-xs text-gray-500">Ministerio de Desarrollo Social y Promoción del Empleo</div>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}
