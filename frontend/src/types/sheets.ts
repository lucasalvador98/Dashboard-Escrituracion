/**
 * Type definitions for Escrituracion spreadsheet data.
 * These types represent the raw row structure from Google Sheets.
 */

export interface EscrituracionRow {
  /** Row ID (may be absent in raw data) */
  id?: string;

  // Ubicación
  Departamento?: string;
  Localidad?: string;
  Barrio?: string;
  Mza?: string;
  Lote?: string;

  // Partes
  Beneficiarios?: string;
  Beneficiario?: string;
  "APELLIDO Y NOMBRE"?: string;
  ApellidoYNombre?: string;
  DNI?: string;
  "Escribano Designado"?: string;
  Escribano?: string;
  escribano?: string;

  // Estado
  Estado?: string;
  estado?: string;
  EstadoProceso?: string;

  // Fechas (strings en formato DD/MM/YYYY o YYYY-MM-DD)
  "Fecha Ingreso Colegio de Escribanos"?: string;
  "Fecha de Sorteo"?: string;
  "Fecha de Aceptacion"?: string;
  "Fecha de Firma"?: string;
  "Fecha de Ingreso al Registro"?: string;
  "Fecha de envío PT digital"?: string;

  // Intervalos calculados (días hábiles)
  diferencia_ingreso_sorteo?: number | "N/A";
  diferencia_sorteo_aceptacion?: number | "N/A";
  diferencia_aceptacion_firma?: number | "N/A";
  diferencia_firma_ingreso?: number | "N/A";
  diferencia_ingreso_testimonio?: number | "N/A";

  // Campos dinámicos (del Sheet)
  [key: string]: string | number | undefined;
}

/** Processed row with computed interval fields */
export type ProcessedEscrituracionRow = Required<
  Pick<EscrituracionRow,
    | "diferencia_ingreso_sorteo"
    | "diferencia_sorteo_aceptacion"
    | "diferencia_aceptacion_firma"
    | "diferencia_firma_ingreso"
    | "diferencia_ingreso_testimonio"
  >
> & EscrituracionRow;

export interface IntervalDef {
  key: keyof Pick<ProcessedEscrituracionRow,
    | "diferencia_ingreso_sorteo"
    | "diferencia_sorteo_aceptacion"
    | "diferencia_aceptacion_firma"
    | "diferencia_firma_ingreso"
    | "diferencia_ingreso_testimonio"
  >;
  label: string;
  fullLabel: string;
  fecha1: string;
  fecha2: string;
  esperado: number;
}

export type TrafficLight = "green" | "yellow" | "red" | "gray";

export interface TableColumn {
  key: string;
  label: string;
  fullLabel?: string;
  alwaysOn: boolean;
}

export interface ColumnGroup {
  label: string;
  keys: string[];
}
