import React from "react";

export default function Sidebar({ activeTab, setActiveTab }) {
  const items = [
    { idx: 0, label: "Dashboard", icon: "dashboard" },
    { idx: 1, label: "Escrituración", icon: "home" },
    { idx: 2, label: "Stock", icon: "table" },
    { idx: 3, label: "Montos", icon: "money" },
    { idx: 4, label: "Escribanos", icon: "escribano" }
  ];

  const Icon = ({ name }) => {
    switch (name) {
      case "dashboard":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <rect x="3" y="3" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
            <rect x="13" y="3" width="8" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
            <rect x="3" y="13" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
            <rect x="13" y="11" width="8" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.6"/>
          </svg>
        );
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
      case "escribano":
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 6.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M5 20c0-3.5 3.134-6 7-6s7 2.5 7 6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
            <path d="M14 3l4 4-8 8H6v-4l8-8z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <aside className="app-sidebar flex flex-col" aria-label="Navegación principal">
      {/* Brand */}
      <div className="px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-md shadow-blue-200/50">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M19 3H5C3.89543 3 3 3.89543 3 5V19C3 20.1046 3.89543 21 5 21H19C20.1046 21 21 20.1046 21 19V5C21 3.89543 20.1046 3 19 3Z" stroke="currentColor" strokeWidth="2"/>
              <path d="M7 7H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 12H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              <path d="M7 17H13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="text-xs font-black text-slate-800 uppercase tracking-tight leading-tight">Dirección de</div>
            <div className="text-xs font-black text-blue-600 uppercase tracking-tight leading-tight">Tecnología</div>
          </div>
        </div>
      </div>

      {/* Navegación principal */}
      <nav className="flex-1 px-4 py-3" aria-label="Pestañas">
        {items.map(it => (
          <div key={it.idx} className="mb-1">
            <button
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300 ${
                activeTab === it.idx
                  ? "bg-slate-900 text-white shadow-md shadow-slate-200"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              }`}
              onClick={() => setActiveTab(it.idx)}
              aria-pressed={activeTab === it.idx}
            >
              <span className={`flex-shrink-0 ${activeTab === it.idx ? "text-blue-400" : "text-slate-400"}`}>
                <Icon name={it.icon} />
              </span>
              <span className="text-sm font-bold tracking-tight">{it.label}</span>
            </button>
          </div>
        ))}
      </nav>

      {/* Versión — info compacta al pie */}
      <div className="px-6 py-4 border-t border-slate-100">
        <div className="text-[10px] text-slate-400 font-semibold text-center leading-relaxed">
          Dashboard Escrituración
        </div>
      </div>
    </aside>
  );
}
