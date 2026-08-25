import React from "react";
import { useParams, Link } from "react-router-dom";
import useDataLoader from "./hooks/useDataLoader";
import TimelineBar from "./components/TimelineBar";
import { INTERVALS, diffClass, contarDiasHabiles, parseDate } from "./lib/deadlines";

const BADGE = {
  green: "bg-emerald-100 text-emerald-700",
  yellow: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  gray: "bg-slate-100 text-slate-500",
};

const LABEL = {
  green: "Dentro del plazo",
  yellow: "Alerta",
  red: "Demora",
  gray: "Sin datos",
};

function getExpediente(data, paramId) {
  if (!Array.isArray(data) || !paramId) return null;
  const decoded = decodeURIComponent(paramId);
  return (
    data.find((it) => {
      const dni = String(it.DNI ?? it.dni ?? it.documento ?? "");
      return dni === decoded;
    }) ||
    data.find((it) => {
      const id = String(it.id ?? "");
      return id === decoded;
    }) ||
    null
  );
}

function formatDate(fecha) {
  if (!fecha || fecha === "N/A" || fecha === "") return "—";
  const d = parseDate(fecha);
  if (!d) return fecha;
  return d.toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ExpedienteDetail() {
  const { id } = useParams();
  const { data, loading, error } = useDataLoader("escrituracion");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-sm text-slate-400">Cargando expediente…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="text-sm text-red-500 mb-3">{error}</div>
        <Link
          to="/dashboard"
          className="text-sm font-semibold text-primary-600 hover:underline"
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const item = getExpediente(data, id);

  if (!item) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-lg font-bold text-slate-700 mb-2">
          Expediente no encontrado
        </h2>
        <p className="text-sm text-slate-400 mb-4">
          No se encontró ningún expediente con el identificador{" "}
          <code className="font-mono text-slate-600">{decodeURIComponent(id)}</code>.
        </p>
        <Link
          to="/dashboard"
          className="inline-block text-sm font-semibold text-primary-600 hover:underline"
        >
          Volver al dashboard
        </Link>
      </div>
    );
  }

  const nombre =
    item.Beneficiarios ??
    item.Beneficiario ??
    item["APELLIDO Y NOMBRE"] ??
    "Sin nombre";
  const dni = item.DNI ?? item.dni ?? item.documento ?? "—";
  const escribano =
    item["Escribano Designado"] ?? item.Escribano ?? item.escribano ?? "—";
  const estado = item.Estado ?? "—";

  // Build enriched intervals with computed values
  const enriched = INTERVALS.map((iv) => {
    const val = item[iv.key];
    const cls = diffClass(val, iv.esperado);
    const fecha1 = item[iv.fecha1];
    const fecha2 = item[iv.fecha2];
    return { ...iv, val, cls, fecha1, fecha2 };
  });

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back links */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          to="/dashboard"
          className="text-xs font-semibold text-slate-400 hover:text-primary-600 transition-colors"
        >
          Dashboard
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-xs font-bold text-slate-600">Expediente</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-slate-800 mb-1">{nombre}</h1>
            <p className="text-sm text-slate-500 font-mono">
              DNI {dni}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
              {estado}
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
              {escribano}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm mb-6">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
          Cronología
        </h2>
        <TimelineBar item={item} intervals={INTERVALS} />
      </div>

      {/* Interval details */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">
          Detalle de Plazos
        </h2>
        <div className="space-y-3">
          {enriched.map((iv) => (
            <div
              key={iv.key}
              className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold text-slate-700">
                  {iv.fullLabel}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {formatDate(iv.fecha1)} → {formatDate(iv.fecha2)}
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <div className="text-sm font-bold text-slate-700">
                    {iv.val !== "N/A" && iv.val !== "" && iv.val != null
                      ? `${iv.val}d`
                      : "—"}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    esperado {iv.esperado}d
                  </div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold ${BADGE[iv.cls]}`}
                >
                  {LABEL[iv.cls]}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
