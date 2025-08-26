import React, { useState, useEffect } from "react";
import axios from "axios";

function StockTab() {
	// Estados
	const [stockData, setStockData] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [filtros, setFiltros] = useState({
		departamento: "Todos",
		localidad: "Todos",
		barrio: "Todos",
		estado: "Todos"
	});
	const [expandedDeptos, setExpandedDeptos] = useState({});
	const [expandedLocs, setExpandedLocs] = useState({});
	const [detalle, setDetalle] = useState(null);

	useEffect(() => {
		const fetchData = async () => {
			try {
				const API_URL = process.env.BASE_URL_BACKEND;
				const response = await axios.get(`${API_URL}/escrituracion?limit=1000`);
				setStockData(Array.isArray(response.data.data) ? response.data.data : []);
				setLoading(false);
			} catch (error) {
				setError("Error al cargar datos");
				setLoading(false);
			}
		};
		fetchData();
	}, []);

	// Filtros dependientes
	const departamentos = ["Todos", ...new Set(stockData.map(item => item.Departamento))];
	const localidades = filtros.departamento === "Todos"
		? ["Todos", ...new Set(stockData.map(item => item.Localidad))]
		: ["Todos", ...new Set(stockData.filter(item => item.Departamento === filtros.departamento).map(item => item.Localidad))];
	const barrios = (filtros.departamento === "Todos" && filtros.localidad === "Todos")
		? ["Todos", ...new Set(stockData.map(item => item.Barrio))]
		: ["Todos", ...new Set(stockData.filter(item =>
				(filtros.departamento === "Todos" || item.Departamento === filtros.departamento) &&
				(filtros.localidad === "Todos" || item.Localidad === filtros.localidad)
			).map(item => item.Barrio))];
	const estados = ["Todos", "De Baja", "En Trámite", "Entregada", "Finalizada sin Entregar", "Hipotecada", "No Retiradas"];

	// Filtrar datos
	let filtered = stockData.filter(item => {
		if (filtros.departamento !== "Todos" && item.Departamento !== filtros.departamento) return false;
		if (filtros.localidad !== "Todos" && item.Localidad !== filtros.localidad) return false;
		if (filtros.barrio !== "Todos" && item.Barrio !== filtros.barrio) return false;
		if (filtros.estado !== "Todos" && item.Estado !== filtros.estado) return false;
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

	// Estados posibles (sin "Todos")
	const estadosCols = estados.slice(1);

	// Función para contar estados en un grupo
	function contarEstados(items) {
		const counts = {};
		estadosCols.forEach(e => counts[e] = 0);
		items.forEach(item => {
			if (counts[item.Estado] !== undefined) counts[item.Estado]++;
		});
		return counts;
	}

	// Expandir/colapsar
	function toggleDepto(depto) {
		setExpandedDeptos(prev => ({ ...prev, [depto]: !prev[depto] }));
	}
	function toggleLoc(depto, loc) {
		setExpandedLocs(prev => ({ ...prev, [depto+"|"+loc]: !prev[depto+"|"+loc] }));
	}

	// Mostrar detalle en modal
	function showDetalle(items, titulo) {
		setDetalle({ items, titulo });
	}
	function closeDetalle() {
		setDetalle(null);
	}

	return (
		<div className="main-container">
			<div className="filters">
				<label>Departamento:
					<select value={filtros.departamento} onChange={e=>setFiltros(f=>({...f,departamento:e.target.value,localidad:"Todos",barrio:"Todos"}))}>
						{departamentos.map(dep=><option key={dep} value={dep}>{dep}</option>)}
					</select>
				</label>
				<label>Localidad:
					<select value={filtros.localidad} onChange={e=>setFiltros(f=>({...f,localidad:e.target.value,barrio:"Todos"}))}>
						{localidades.map(loc=><option key={loc} value={loc}>{loc}</option>)}
					</select>
				</label>
				<label>Barrio:
					<select value={filtros.barrio} onChange={e=>setFiltros(f=>({...f,barrio:e.target.value}))}>
						{barrios.map(bar=><option key={bar} value={bar}>{bar}</option>)}
					</select>
				</label>
				<label>Estado:
					<select value={filtros.estado} onChange={e=>setFiltros(f=>({...f,estado:e.target.value}))}>
						{estados.map(est=><option key={est} value={est}>{est}</option>)}
					</select>
				</label>
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
