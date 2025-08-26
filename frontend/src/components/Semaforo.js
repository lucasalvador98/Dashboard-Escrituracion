import React from "react";

export default function Semaforo({ data = [], onSelectEstado, activeEstado }) {
  const total = data.length || 0;
  const counts = data.reduce((acc, it) => {
    const s = it.Estado || "Sin Estado";
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const items = Object.keys(counts).map(k => ({ estado: k, count: counts[k], pct: Math.round((counts[k] / total) * 100) || 0 }))
    .sort((a,b)=>b.count-a.count);

  const colorFor = estado => {
    const key = (estado || "").toLowerCase();
    if (key.includes("entreg")) return "#2ecc71";
    if (key.includes("finaliz") || key.includes("finalizada")) return "#3498db";
    if (key.includes("trámite") || key.includes("tramite")) return "#f39c12";
    if (key.includes("baja")) return "#95a5a6";
    return "#34495e";
  };

  return (
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
      {items.map(it => (
        <button key={it.estado} onClick={()=>onSelectEstado(it.estado === activeEstado ? "" : it.estado)}
          style={{border: it.estado===activeEstado ? `2px solid ${colorFor(it.estado)}` : "1px solid #e0e6ef", background:'#fff', padding:10, borderRadius:8, cursor:'pointer'}}>
          <div style={{fontSize:12,color:'#6b7a90'}}>{it.estado}</div>
          <div style={{fontSize:18,fontWeight:700,color:colorFor(it.estado)}}>{it.count}</div>
          <div style={{fontSize:12,color:'#8b97a8'}}>{it.pct}%</div>
        </button>
      ))}
    </div>
  );
}