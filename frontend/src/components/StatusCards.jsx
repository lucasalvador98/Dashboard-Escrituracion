import React from "react";

const STAT_DEFS = [
  { key: "En Trámite", variant: "primary" },
  { key: "Finalizada sin Entregar", variant: "success" },
  { key: "Entregada", variant: "success" },
  { key: "De Baja", variant: "warning" },
  { key: "Hipotecada", variant: "danger" },
  { key: "No Retiradas", variant: "muted" },
];

export default function StatusCards({ counts, totalCount, selectedEstado, setSelectedEstado, setFilters, setPage }) {
  return (
    <div className="status-cards">
      {STAT_DEFS.map(s => {
        const count = counts[s.key] || 0;
        const pct = totalCount ? Math.round((count / totalCount) * 100) : 0;
        const isActive = selectedEstado === s.key;

        const toggle = () => {
          setSelectedEstado(prev => (prev === s.key ? null : s.key));
          setFilters(prev => ({
            ...prev,
            estado: selectedEstado === s.key ? "Todos" : s.key,
          }));
          setPage(1);
        };

        return (
          <div
            key={s.key}
            role="button"
            tabIndex={0}
            className={`status-card ${isActive ? "selected" : ""}`}
            onClick={toggle}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(); } }}
            aria-pressed={isActive}
          >
            <div className="label">{s.key}</div>
            <div className="value">{count.toLocaleString()}</div>
            <div className="meta">{pct}% del total</div>
          </div>
        );
      })}
    </div>
  );
}
