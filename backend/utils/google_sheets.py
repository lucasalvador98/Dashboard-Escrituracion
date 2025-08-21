import gspread
import pandas as pd
from datetime import datetime
import json

def calcular_diferencia_dias_vectorizado(df, fecha1, fecha2):
    """
    Calcula la diferencia en días entre dos columnas de fechas en un DataFrame.
    Maneja fechas inválidas.
    """
    fecha_inicio = pd.to_datetime(df[fecha1], format="%d/%m/%Y", errors="coerce")
    fecha_fin = pd.to_datetime(df[fecha2], format="%d/%m/%Y", errors="coerce")
    return (fecha_fin - fecha_inicio).dt.days.fillna(0).astype(int)

def cargar_datos(sheet_url, creds_json):
    """
    Carga datos desde Google Sheets y aplica la lógica de semaforización.
    """
    # Autenticación con Google Sheets
    gc = gspread.service_account_from_dict(creds_json)
    sh = gc.open_by_url(sheet_url)
    worksheet = sh.get_worksheet(0)
    data = worksheet.get_all_records()
    df = pd.DataFrame(data)

    # Validar y convertir las fechas al formato ISO
    columnas_fecha = [
        "Fecha Ingreso Colegio de Escribanos",
        "Fecha de Sorteo",
        "Fecha de Aceptacion",
        "Fecha de Firma",
        "Fecha de Ingreso al Registro",
        "Fecha de envío PT digital"
    ]
    for columna in columnas_fecha:
        if columna in df.columns:
            df[columna] = pd.to_datetime(df[columna], format="%d/%m/%Y", errors="coerce")
            df[columna] = df[columna].dt.strftime("%Y-%m-%d").fillna("N/A")  # Reemplazar fechas inválidas por "N/A"

    # Calcular diferencias entre pares de fechas
    pares_fechas = [
        ('Fecha Ingreso Colegio de Escribanos', 'Fecha de Sorteo', 'diferencia_ingreso_sorteo'),
        ('Fecha de Sorteo', 'Fecha de Aceptacion', 'diferencia_sorteo_aceptacion'),
        ('Fecha de Aceptacion', 'Fecha de Firma', 'diferencia_aceptacion_firma'),
        ('Fecha de Firma', 'Fecha de Ingreso al Registro', 'diferencia_firma_ingreso'),
        ('Fecha de Ingreso al Registro', 'Fecha de envío PT digital', 'diferencia_ingreso_testimonio')
    ]

    for fecha1, fecha2, diff_col in pares_fechas:
        df[diff_col] = (pd.to_datetime(df[fecha2], errors="coerce") - pd.to_datetime(df[fecha1], errors="coerce")).dt.days
        df[diff_col] = df[diff_col].fillna("N/A")  # Reemplazar NaN por "N/A"

    # Imprimir los datos procesados para depuración
    print("Datos procesados con semaforización:")
    print(df.head())

    return df.to_dict(orient="records")