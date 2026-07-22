import React, { useState } from "react";
import Sidebar from "./components/Sidebar";
import Escrituracion from "./Escrituracion";
import StockTab from "./StockTab";
import MontosTab from "./MontosTab";

export default function App() {
  const [activeTab, setActiveTab] = useState("ESCRITURACION");

  return (
    <div className="app-root">
      <Sidebar
        active={activeTab}
        onSelect={setActiveTab}
      />

      <div className="app-content">
        <main className="app-main">
          {activeTab === "ESCRITURACION" && <Escrituracion />}
          {activeTab === "STOCK" && <StockTab />}
          {activeTab === "MONTOS" && <MontosTab />}
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
