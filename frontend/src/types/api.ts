/**
 * Type definitions for the backend API responses.
 */

export type EndpointName = "escrituracion" | "stock" | "escribanos";

export interface ApiResponse<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

export type StockItem = Record<string, string | number | undefined>;

export interface EscribanoRecord {
  [key: string]: string | number | undefined;
}

/** Backend health check response */
export interface HealthResponse {
  status: "ok" | "error";
  sheets_api: "ok" | "error";
  last_successful_write?: string;
  cache_status: "empty" | "stale" | "fresh";
}

/** Structured error from backend */
export interface StructuredError {
  error: {
    code: "SHEETS_UNREACHABLE" | "CACHE_EMPTY" | "CONFIG_MISSING" | "INTERNAL_ERROR";
    message: string;
    retry_after_seconds?: number;
    suggestion?: string;
  };
}

/** Filter state for Escrituracion tab */
export interface EscrituracionFilters {
  departamento: string;
  localidad: string;
  barrio: string;
  estado: string;
  escribano: string;
  dni: string;
}

/** Filter state for Dashboard tab */
export interface DashboardFilters {
  department: string;
  escribano: string;
  dateFrom: string;
  dateTo: string;
}

/** Alert entry for overdue items */
export interface AlertEntry {
  item: Record<string, unknown>;
  interval: {
    key: string;
    label: string;
    fullLabel: string;
    esperado: number;
  };
  daysOverdue: number;
  urgency: "yellow" | "red";
  stageLabel: string;
  beneficiario: string;
  dni: string;
}
