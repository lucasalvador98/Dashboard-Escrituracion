import React, { useState, useEffect } from "react";
import axios from "axios";
import API_CONFIG from "./config-api";
const API_URL = API_CONFIG.BASE_URL_BACKEND;

function StockTab() {
    const [stockData, setStockData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filtros, setFiltros] = useState({
        departamento: "",
        localidad: "",
        barrio: "",
        estado: "",
        escribano: ""
    });
    const [expandedDeptos, setExpandedDeptos] = useState({});
    const [expandedLocs, setExpandedLocs] = useState({});
    const [detalle, setDetalle] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get(`${API_URL}/escrituracion`);
                const arr = Array.isArray(response.data.data) ? response.data.data : Array.isArray(response.data) ? response.data : [];
                setStockData(arr);
                setLoading(false);
            } catch (error) {
                setError("Error al cargar datos");
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Opciones únicas para autocompletado
    const departamentos = [...new Set(stockData.map(item => item.Departamento).filter(Boolean))];
    const localidades = [...new Set(stockData.map(item => item.Localidad).filter(Boolean))];
    const barrios = [...new Set(stockData.map(item => item.Barrio).filter(Boolean))];
    const estados = ["De Baja", "En Trámite", "Entregada", "Finalizada sin Entregar", "Hipotecada", "No Retiradas"];
    const escribanos = [...new Set(stockData.map(item => item["Escribano Designado"]).filter(Boolean))];

    // Filtrar datos
    let filtered = stockData.filter(item => {
        if (filtros.departamento && item.Departamento && !item.Departamento.toUpperCase().includes(filtros.departamento.trim().toUpperCase())) return false;
        if (filtros.localidad && item.Localidad && !item.Localidad.toUpperCase().includes(filtros.localidad.trim().toUpperCase())) return false;
        if (filtros.barrio && item.Barrio && !item.Barrio.toUpperCase().includes(filtros.barrio.trim().toUpperCase())) return false;
        if (filtros.estado && item.Estado && !item.Estado.toUpperCase().includes(filtros.estado.trim().toUpperCase())) return false;
        if (filtros.escribano && item["Escribano Designado"] && !item["Escribano Designado"].toUpperCase().includes(filtros.escribano.trim().toUpperCase())) return false;
        return true;
    });

    // Agrupación por Departamento > Localidad > Barrio
    const grouped = {};
    filtered.forEach(item => {
        if (!grouped[item.Departamento]) grouped[item.Departamento] = {};
        if (!grouped[item.Departamento][item.Localidad]) grouped[item.Departamento][item.Localidad] = {};
        if (!grouped[item.Departamento][item.Localidad][item.Barrio]) grouped[item.Departamento][item.Localidad][item.Barrio] = [];
        grouped[item.Departamento][item.Localidad][item.Barrio].push(item);
    });

    const estadosCols = estados;

    function contarEstados(items) {
        const counts = {};
        estadosCols.forEach(e => counts[e] = 0);
        items.forEach(item => {
            if (counts[item.Estado] !== undefined) counts[item.Estado]++;
        });
        return counts;
    }

    function toggleDepto(depto) {
        setExpandedDeptos(prev => ({ ...prev, [depto]: !prev[depto] }));
    }
    function toggleLoc(depto, loc) {
        setExpandedLocs(prev => ({ ...prev, [depto+"|"+loc]: !prev[depto+"|"+loc] }));
    }
    function showDetalle(items, titulo) {
        setDetalle({ items, titulo });
    }
    function closeDetalle() {
        setDetalle(null);
    }

    function FilterSelectInput({ options, value, onChange, placeholder }) {
      const [input, setInput] = useState(value || "");
      const filteredOptions = options.filter(opt =>
        opt && opt.toUpperCase().includes(input.trim().toUpperCase())
      );
      return (
        <div className="filter-combo">
          <input
            className="filter-input"
            type="text"
            value={input}
            onChange={e => {
              setInput(e.target.value);
              onChange(e.target.value);
            }}
            placeholder={placeholder}
            list={placeholder + "-list"}
            autoComplete="off"
          />
          <datalist id={placeholder + "-list"}>
            {filteredOptions.map(opt => (
              <option key={opt} value={opt} />
            ))}
          </datalist>
        </div>
      );
    }

    return (
        <div className="main-container">
            <div className="filters filters-modern">
              <FilterSelectInput
                options={departamentos}
                value={filtros.departamento}
                onChange={val => setFiltros(f => ({ ...f, departamento: val, localidad: "", barrio: "" }))}
                placeholder="Departamento"
              />
              <FilterSelectInput
                options={localidades}
                value={filtros.localidad}
                onChange={val => setFiltros(f => ({ ...f, localidad: val, barrio: "" }))}
                placeholder="Localidad"
              />
              <FilterSelectInput
                options={barrios}
                value={filtros.barrio}
                onChange={val => setFiltros(f => ({ ...f, barrio: val }))}
                placeholder="Barrio"
              />
              <FilterSelectInput
                options={estados}
                value={filtros.estado}
                onChange={val => setFiltros(f => ({ ...f, estado: val }))}
                placeholder="Estado"
              />
              <FilterSelectInput
                options={escribanos}
                value={filtros.escribano}
                onChange={val => setFiltros(f => ({ ...f, escribano: val }))}
                placeholder="Escribano Designado"
              />
            </div>
            {loading && <p>Cargando datos...</p>}
            {error && <p style={{color:'red'}}>{error}</p>}
            {!loading && !error && (
                <div style={{overflowX:'auto',maxHeight:'70vh',position:'relative'}}>
                    <table className="stock-table">
                        <thead>
                            <tr>
                                <th></th>
                                <th>Departamento</th>
                                <th>Localidad</th>
                                <th>Barrio</th>
                                {estadosCols.map(e => <th key={e}>{e}</th>)}
                                <th>Suma total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.entries(grouped).map(([depto, locs]) => (
                                <React.Fragment key={depto}>
                                    <tr className="row-depto" onClick={()=>toggleDepto(depto)}>
                                        <td>{expandedDeptos[depto] ? "▼" : "▶"}</td>
                                        <td colSpan={2}>{depto}</td>
                                        <td></td>
                                        {(() => {
											let items = [];
											Object.values(locs).forEach(barrioObj => {
												Object.values(barrioObj).forEach(arr => items = items.concat(arr));
											});
											const counts = contarEstados(items);
											return [
												...estadosCols.map(e => <td key={e}>{counts[e]}</td>),
												<td key="total">{items.length}</td>
											];
										})()}
                                    </tr>
                                    {expandedDeptos[depto] && Object.entries(locs).map(([loc, barriosObj]) => (
                                        <React.Fragment key={loc}>
                                            <tr className="row-loc" onClick={()=>toggleLoc(depto,loc)}>
                                                <td style={{paddingLeft:'2em'}}>{expandedLocs[depto+"|"+loc] ? "▼" : "▶"}</td>
                                                <td></td>
                                                <td colSpan={2}>{loc}</td>
                                                {(() => {
													let items = [];
													Object.values(barriosObj).forEach(arr => items = items.concat(arr));
													const counts = contarEstados(items);
													return [
														...estadosCols.map(e => <td key={e}>{counts[e]}</td>),
														<td key="total">{items.length}</td>
													];
												})()}
                                            </tr>
                                            {expandedLocs[depto+"|"+loc] && Object.entries(barriosObj).map(([barrio, items], idx) => (
                                                <tr key={barrio} className={idx % 2 === 0 ? "row-even" : "row-odd"}>
                                                    <td></td>
                                                    <td></td>
                                                    <td>{barrio}</td>
                                                    <td>
                                                        <button className="btn-detalle" onClick={()=>showDetalle(items,`${depto} - ${loc} - ${barrio}`)}>Ver detalle</button>
                                                    </td>
                                                    {(() => {
														const counts = contarEstados(items);
														return [
															...estadosCols.map(e => <td key={e}>{counts[e]}</td>),
															<td key="total">{items.length}</td>
														];
													})()}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            {detalle && (
                <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.3)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={closeDetalle}>
                    <div style={{background:'#fff',padding:'2rem',borderRadius:'10px',minWidth:'400px',maxHeight:'80vh',overflowY:'auto'}} onClick={e=>e.stopPropagation()}>
                        <h3>Detalle: {detalle.titulo}</h3>
                        <table style={{width:'100%',marginTop:'1em'}}>
                            <thead>
                                <tr>
                                    <th>DNI</th>
                                    <th>Departamento</th>
                                    <th>Localidad</th>
                                    <th>Barrio</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detalle.items.map((item,idx)=>(
                                    <tr key={idx}>
                                        <td>{item.DNI}</td>
                                        <td>{item.Departamento}</td>
                                        <td>{item.Localidad}</td>
                                        <td>{item.Barrio}</td>
                                        <td>{item.Estado}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <button onClick={closeDetalle} style={{marginTop:'1rem',padding:'0.5rem 1rem',background:'#2980b9',color:'#fff',border:'none',borderRadius:'5px',cursor:'pointer'}}>Cerrar</button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StockTab;
