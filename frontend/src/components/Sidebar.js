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
      <div className="px-8 py-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-black text-slate-800 uppercase tracking-tighter leading-tight">Dirección de</div>
            <div className="text-sm font-black text-blue-600 uppercase tracking-tighter leading-tight">Tecnología</div>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4 py-2 space-y-1.5" aria-label="Pestañas">
        {items.map(it => (
          <div key={it.key} className="px-2">
            <button
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                active === it.key
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-200'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
              onClick={() => onSelect(it.key)}
              aria-pressed={active === it.key}
            >
              <span className={`flex-shrink-0 ${active === it.key ? 'text-blue-400' : 'text-slate-400'}`}><Icon name={it.icon} /></span>
              <span className="text-sm font-bold tracking-tight">{it.label}</span>
            </button>

            {/* Sub-pestañas de Escrituración */}
            {it.key === "ESCRITURACION" && active === "ESCRITURACION" && (
              <div className="mt-2 ml-4 pl-4 border-l-2 border-slate-100 space-y-1">
                {escrituracionSubTabs.map((s, idx) => (
                  <button
                    key={`sub-${idx}`}
                    className={`w-full text-left px-3 py-2 text-[11px] rounded-lg transition-all truncate ${
                      escriSubIndex === idx
                        ? 'bg-blue-50 text-blue-700 font-bold'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
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
      <div className="p-6 border-t border-slate-50 bg-slate-50/30 flex gap-3 justify-center">
        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
          onClick={onPrev}
          title="Anterior"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        <button
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all"
          onClick={onNext}
          title="Siguiente"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
    </aside>
  );
}