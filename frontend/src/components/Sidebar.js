import React from "react";

export default function Sidebar({ active, onSelect, onPrev, onNext, escriSubIndex = 0, onChangeEscriSubIndex = () => {} }) {
  const items = [
    { key: "ESCRITURACION", label: "Inicio", icon: "home" },
    { key: "STOCK", label: "Stock", icon: "table" },
    { key: "MONTOS", label: "Montos", icon: "money" }
  ];

  const escrituracionSubTabs = [
    "Diferencia Ingreso y Sorteo",
    "Diferencia Sorteo y Aceptación",
    "Diferencia Aceptación y Firma",
    "Diferencia Firma e Ingreso Diario",
    "Diferencia Ingreso Diario y Testimonio"
  ];

  const Icon = ({ name }) => {
    switch (name) {
      case "home":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 10.5L12 4l9 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 21V11.5h14V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "table":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M12 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        );
      case "money":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="2" y="7" width="20" height="10" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M12 11.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M7 12h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="sidebar" aria-label="Navegación principal">
      {/* Brand text actualizado (sin círculo) */}
      <div className="sidebar-brand">
        <div className="brand-text">Dashboard Escrituración</div>
      </div>

      <nav className="sidebar-nav" aria-label="Pestañas">
        {items.map(it => (
          <div key={it.key} style={{ marginBottom: it.key === "ESCRITURACION" ? 6 : 0 }}>
            <button
              className={"sidebar-btn" + (active === it.key ? " active" : "")}
              onClick={() => onSelect(it.key)}
              aria-pressed={active === it.key}
            >
              <span className="icon"><Icon name={it.icon} /></span>
              <span className="label">{it.label}</span>
            </button>

            {/* si es Escrituración mostramos sub-pestañas anidadas y controladas desde acá */}
            {it.key === "ESCRITURACION" && active === "ESCRITURACION" && (
              <div className="sidebar-subnav" style={{ marginTop: 8, marginLeft: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                {escrituracionSubTabs.map((s, idx) => (
                  <button
                    key={`sub-${idx}`}
                    className={"sidebar-subbtn" + (escriSubIndex === idx ? " active" : "")}
                    onClick={() => onChangeEscriSubIndex(idx)}
                    aria-pressed={escriSubIndex === idx}
                    title={s}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="sidebar-actions">
        <button className="icon-btn" onClick={onPrev} title="Anterior" aria-label="Anterior">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <button className="icon-btn" onClick={onNext} title="Siguiente" aria-label="Siguiente">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <button className="ghost-btn" onClick={() => onSelect("ESCRITURACION")} title="Ir al inicio" aria-label="Inicio">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 10.5L12 4l9 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21V11.5h14V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </aside>
  );
}