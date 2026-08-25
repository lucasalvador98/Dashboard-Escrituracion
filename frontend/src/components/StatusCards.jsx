import React from "react";

const VARIANT_MAP = {
  "En Trámite": "primary",
  "Finalizada sin Entregar": "success",
  "Entregada": "success",
  "De Baja": "danger",
};

export default function StatusCards({ counts, totalCount, selectedEstado, setSelectedEstado, setFilters, setPage, ipvCount }) {
  const keys = Object.keys(counts);

  return (
    <div className="status-cards">
      {keys.map(key => {
        const count = counts[key] || 0;
        const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
        const isActive = selectedEstado === key;
        const variant = VARIANT_MAP[key] || "muted";

        const toggle = () => {
          setSelectedEstado(prev => (prev === key ? null : key));
          setFilters(prev => ({
            ...prev,
            estado: selectedEstado === key ? "Todos" : key,
          }));
          setPage(1);
        };

        return (
          <div
            key={key}
            role="button"
            tabIndex={0}
            className={`status-card ${isActive ? "selected" : ""}`}
            onClick={toggle}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
            aria-pressed={isActive}
          >
            <div className="label">{key}</div>
            <div className="value">{count.toLocaleString()}</div>
            <div className="meta">{pct}% del total</div>
          </div>
        );
      })}

      {ipvCount > 0 && (
        <div
          className="status-card"
          title="IPV: Caso en Dirección de Viviendas"
        >
          <div className="label">IPV</div>
          <div className="value">{ipvCount.toLocaleString()}</div>
          <div className="meta text-xs font-semibold" style={{ color: "#6366f1" }}>ipv</div>
        </div>
      )}
    </div>
  );
}
