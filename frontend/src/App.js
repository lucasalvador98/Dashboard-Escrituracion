import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import DashboardTab from "./DashboardTab";
import Escrituracion from "./Escrituracion";
import StockTab from "./StockTab";
import MontosTab from "./MontosTab";
import EscribanosTab from "./EscribanosTab";

export default function App() {
  const [activeTab, setActiveTab] = useState(0); // 0: Dashboard, 1: Escrituracion, 2: Stock, 3: Montos, 4: Escribanos
  const tabs = [
    <DashboardTab key="dashboard" />,
    <Escrituracion key="escrituracion" />,
    <StockTab key="stock" />,
    <MontosTab key="montos" />,
    <EscribanosTab key="escribanos" />
  ];

  return (
    <div className="app-root">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        itemsCount={5}
      />

      <div className="app-content">
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
