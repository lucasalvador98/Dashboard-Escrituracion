import React from "react";

export default function Sidebar({ active, onSelect, onPrev, onNext }) {
  const items = [
    { key: "ESCRITURACION", label: "Inicio", icon: "home" },
    { key: "STOCK", label: "Stock", icon: "table" },
    { key: "MONTOS", label: "Montos", icon: "money" }
  ];

  const Icon = ({ name }) => {
    switch (name) {
      case "home":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 10.5L12 4l9 6.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M5 21V11.5h14V21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      case "table":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M3 10h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M12 4v16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        );
      case "money":
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
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
          <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200/50">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">Dirección de</div>
            <div className="text-sm font-black text-blue-600 uppercase tracking-tight leading-tight">Tecnología</div>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4 py-2" aria-label="Pestañas">
        {items.map(it => (
          <div key={it.key} className="px-2 mb-1.5">
            <button
              className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all duration-300 ${
                active === it.key
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => onSelect(it.key)}
              aria-pressed={active === it.key}
            >
              <span className={`flex-shrink-0 ${active === it.key ? "text-blue-400" : "text-slate-400"}`}>
                <Icon name={it.icon} />
              </span>
              <span className="text-sm font-bold tracking-tight">{it.label}</span>
            </button>
          </div>
        ))}
      </nav>

      {/* Acciones — navegación entre tabs */}
      <div className="p-6 border-t border-slate-100 bg-slate-50/50">
        <div className="flex gap-2 justify-center">
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
      </div>
    </aside>
  );
}
