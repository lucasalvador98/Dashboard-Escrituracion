import React, { useState } from "react";
import Escrituracion from "./Escrituracion";
import StockTab from "./StockTab";
import MontosTab from "./MontosTab";

function App() {
  const [activeTab, setActiveTab] = useState("SEMAFORO");
  return (
    <div className="main-container">
      <div className="tabs">
        <button
          className={activeTab === "SEMAFORO" ? "tab-active" : ""}
          onClick={() => setActiveTab("SEMAFORO")}
        >
          Semáforo
        </button>
        <button
          className={activeTab === "STOCK" ? "tab-active" : ""}
          onClick={() => setActiveTab("STOCK")}
        >
          Stock
        </button>
        <button
          className={activeTab === "MONTOS" ? "tab-active" : ""}
          onClick={() => setActiveTab("MONTOS")}
        >
          Montos
        </button>
      </div>
      <div className="tab-content">
        {activeTab === "SEMAFORO" ? <Escrituracion /> : activeTab === "STOCK" ? <StockTab /> : <MontosTab />}
      </div>
    </div>
  );
}

export default App;