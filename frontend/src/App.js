import React, { useState } from "react";
import "./styles.css";
import Sidebar from "./components/Sidebar";
import Escrituracion from "./Escrituracion";
import StockTab from "./StockTab";
import MontosTab from "./MontosTab";

const TABS = ["ESCRITURACION", "STOCK", "MONTOS"];

export default function App() {
  const [activeTab, setActiveTab] = useState("ESCRITURACION"); // default

  function goPrev() {
    const idx = TABS.indexOf(activeTab);
    setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length]);
  }
  function goNext() {
    const idx = TABS.indexOf(activeTab);
    setActiveTab(TABS[(idx + 1) % TABS.length]);
  }

  return (
    <div className="app-root">
      <Sidebar
        active={activeTab}
        onSelect={setActiveTab}
        onPrev={goPrev}
        onNext={goNext}
      />

      <main className="content-area">
        {activeTab === "ESCRITURACION" && <Escrituracion />}
        {activeTab === "STOCK" && <StockTab />}
        {activeTab === "MONTOS" && <MontosTab />}

        {/* Footer al final de la página */}
        <footer className="app-footer" role="contentinfo">
          <div>Elaborado por Dirección de Tecnología</div>
          <div>Ministerio de Desarrollo Social y Promoción del Empleo</div>
        </footer>
      </main>
    </div>
  );
}
