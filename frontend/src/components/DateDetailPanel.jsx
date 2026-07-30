import React from "react";
import TimelineBar from "./TimelineBar";
import { INTERVALS, diffClass } from "../hooks/useEscrituracion";
import ArrowForward from '@mui/icons-material/ArrowForward';
import LocationOn from '@mui/icons-material/LocationOn';

export default function DateDetailPanel({ intervalDetail }) {
  if (!intervalDetail) return null;
  const { interval: iv, item } = intervalDetail;
  const val = item[iv.key];
  const cls = diffClass(val, iv.esperado);
  const fecha1Val = item[iv.fecha1] || "—";
  const fecha2Val = item[iv.fecha2] || "—";
  const statusLabels = { green: '✅ Dentro del plazo', yellow: '⚠️ Alerta', red: '🔴 Demora', gray: '⚪ Sin datos' };
  const statusLabel = statusLabels[cls] || 'Sin datos';

  return (
    <div className="p-1">
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h4 className="text-base font-semibold text-slate-800">{iv.fullLabel}</h4>
          <span className={`diff-badge ${cls}`}>{statusLabel}</span>
        </div>
        <p className="text-sm text-slate-600">
          {(item.Beneficiarios ?? item.Beneficiario ?? item["APELLIDO Y NOMBRE"] ?? item.ApellidoYNombre)}{item.DNI ? ` — DNI ${item.DNI}` : ""}
        </p>
      </div>

      <div className="mb-6">
        <div className="text-xs font-medium text-slate-500 uppercase mb-2">Progreso General</div>
        <TimelineBar
          item={item}
          intervals={INTERVALS}
          highlightedInterval={iv.key}
        />
      </div>

      <div className="detail-dates-row">
        <div className="date-card date-card--from">
          <div className="date-label">Desde</div>
          <div className="date-field-name">{iv.fecha1}</div>
          <div className="date-value">{fecha1Val}</div>
        </div>
        <div className="date-arrow">
          <div className="arrow-line"></div>
          <ArrowForward sx={{ fontSize: 20, color: '#6366f1' }} />
          <div className="arrow-line"></div>
        </div>
        <div className="date-card date-card--to">
          <div className="date-label">Hasta</div>
          <div className="date-field-name">{iv.fecha2}</div>
          <div className="date-value">{fecha2Val}</div>
        </div>
      </div>

      <div className="detail-result">
        <div className="result-label">Diferencia</div>
        <div className="result-value-row">
          <span className={`diff-badge ${cls} text-lg px-5 py-2`}>
            {val !== "N/A" && val !== "" && val != null ? `${val} días hábiles` : "Sin datos"}
          </span>
          <span className="result-threshold">
            Plazo esperado: <strong>{iv.esperado} días</strong>
          </span>
        </div>
      </div>

      <div className="detail-meta">
        <div><LocationOn sx={{ fontSize: 14, verticalAlign: 'middle', marginRight: 0.5 }} /> {item.Departamento || "—"}</div>
        <div>{item.Localidad || "—"}</div>
        <div>{item.Barrio || "—"}</div>
        <div>Estado: <strong>{item.Estado || "—"}</strong></div>
      </div>
    </div>
  );
}
