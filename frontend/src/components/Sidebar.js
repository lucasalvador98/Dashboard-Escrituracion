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
    <aside className="app-sidebar flex flex-col" aria-label="Navegación principal">
      {/* Brand */}
      <div className="px-6 py-6 border-b border-gray-200">
        <div className="text-lg font-bold text-blue-600">Dashboard Escrituración</div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4 py-4 space-y-2" aria-label="Pestañas">
        {items.map(it => (
          <div key={it.key}>
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                active === it.key
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
              onClick={() => onSelect(it.key)}
              aria-pressed={active === it.key}
            >
              <span className="flex-shrink-0"><Icon name={it.icon} /></span>
              <span className="text-sm font-medium">{it.label}</span>
            </button>

            {/* Sub-pestañas de Escrituración */}
            {it.key === "ESCRITURACION" && active === "ESCRITURACION" && (
              <div className="mt-2 ml-4 space-y-1">
                {escrituracionSubTabs.map((s, idx) => (
                  <button
                    key={`sub-${idx}`}
                    className={`w-full text-left px-3 py-2 text-xs rounded transition-all truncate ${
                      escriSubIndex === idx
                        ? 'bg-blue-100 text-blue-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
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

      {/* Acciones */}
      <div className="border-t border-gray-200 p-4 flex gap-2 justify-center">
        <button
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          onClick={onPrev}
          title="Anterior"
          aria-label="Anterior"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <button
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          onClick={onNext}
          title="Siguiente"
          aria-label="Siguiente"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <button
          className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          onClick={() => onSelect("ESCRITURACION")}
          title="Ir al inicio"
          aria-label="Inicio"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M3 10.5L12 4l9 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 21V11.5h14V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </aside>
  );
}