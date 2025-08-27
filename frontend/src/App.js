import React, { useState } from "react";
import "./styles.css";
import Sidebar from "./components/Sidebar";
import Escrituracion from "./Escrituracion";
import StockTab from "./StockTab";
import MontosTab from "./MontosTab";

const TABS = ["ESCRITURACION", "STOCK", "MONTOS"];
const ESCRITURACION_SUBTABS = [
  "Diferencia entre Ingreso y Sorteo",
  "Diferencia entre Sorteo y Aceptación",
  "Diferencia entre Aceptación y Firma",
  "Diferencia entre Firma e Ingreso Diario",
  "Diferencia entre Ingreso Diario y Testimonio"
];

export default function App() {
  const [activeTab, setActiveTab] = useState("ESCRITURACION");
  const [escriSubIndex, setEscriSubIndex] = useState(0);

  function handleSelect(tabKey) {
    setActiveTab(tabKey);
    if (tabKey === "ESCRITURACION") setEscriSubIndex(0);
  }

  function goPrev() {
    if (activeTab === "ESCRITURACION") {
      setEscriSubIndex(prev => (prev - 1 + ESCRITURACION_SUBTABS.length) % ESCRITURACION_SUBTABS.length);
    } else {
      const idx = TABS.indexOf(activeTab);
      setActiveTab(TABS[(idx - 1 + TABS.length) % TABS.length]);
      if (TABS[(idx - 1 + TABS.length) % TABS.length] === "ESCRITURACION") setEscriSubIndex(0);
    }
  }

  function goNext() {
    if (activeTab === "ESCRITURACION") {
      setEscriSubIndex(prev => (prev + 1) % ESCRITURACION_SUBTABS.length);
    } else {
      const idx = TABS.indexOf(activeTab);
      setActiveTab(TABS[(idx + 1) % TABS.length]);
      if (TABS[(idx + 1) % TABS.length] === "ESCRITURACION") setEscriSubIndex(0);
    }
  }

  return (
    <div className="app-root">
      <Sidebar
        active={activeTab}
        onSelect={handleSelect}
        onPrev={goPrev}
        onNext={goNext}
        escriSubIndex={escriSubIndex}
        onChangeEscriSubIndex={setEscriSubIndex}
      />

      <main className="content-area">
        {activeTab === "ESCRITURACION" && (
          <Escrituracion
            activeDiffTabIndex={escriSubIndex}
            onChangeDiffTab={setEscriSubIndex}
            diffTabLabels={ESCRITURACION_SUBTABS}
          />
        )}
        {activeTab === "STOCK" && <StockTab />}
        {activeTab === "MONTOS" && <MontosTab />}

        <footer className="app-footer" role="contentinfo">
          <div>Elaborado por Dirección de Tecnología</div>
          <div>Ministerio de Desarrollo Social y Promoción del Empleo</div>
        </footer>
      </main>
    </div>
  );
}
