import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

interface Metricas {
  ventasHoy: number;
  ivaMes: number;
  ticketPromedio: number;
  costoInventario: number;
}

interface Empleado {
  id: number;
  usuario: string;
  rol: string;
}

interface Nota {
  id: number;
  texto: string;
}

interface ProductoMasVendido {
  nombre: string;
  total: number;
}

// ✨ NUEVA INTERFAZ: Para manejar las categorías
interface Categoria {
  id: number;
  nombre: string;
}

export const Administracion = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  
  const usuarioRol = (localStorage.getItem('usuarioRol') || 'vendedor').toLowerCase().trim();
  const usuarioNombre = localStorage.getItem('usuarioNombre') || 'Usuario';

  // Estados anteriores
  const [metricas, setMetricas] = useState<Metricas>({ ventasHoy: 0, ivaMes: 0, ticketPromedio: 0, costoInventario: 0 });
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [cargando, setCargando] = useState(true);

  const [masVendidos, setMasVendidos] = useState<ProductoMasVendido[]>([]);
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes'>('dia');

  // ✨ NUEVOS ESTADOS: Para el CRUD de categorías
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');

  // 🛡️ Protección de Ruta
  useEffect(() => {
    if (usuarioRol !== 'admin') {
      alert("Acceso denegado. Solo administradores.");
      navigate('/'); 
    }
  }, [usuarioRol, navigate]);

  // 🔄 Carga masiva de datos estáticos iniciales
  useEffect(() => {
    if (usuarioRol !== 'admin') return;

    const cargarDatosPanel = async () => {
      try {
        setCargando(true);
        // Agregamos la carga de categorías a la carga masiva inicial
        const [resMetricas, resEmpleados, resNotas, resCategorias] = await Promise.all([
          fetch(`${API_URL}/admin/metricas`),
          fetch(`${API_URL}/usuarios`),
          fetch(`${API_URL}/admin/notas`),
          fetch(`${API_URL}/categorias`) 
        ]);

        if (resMetricas.ok) setMetricas(await resMetricas.json());
        if (resEmpleados.ok) setEmpleados(await resEmpleados.json());
        if (resNotas.ok) setNotas(await resNotas.json());
        if (resCategorias.ok) setCategorias(await resCategorias.json());
      } catch (error) {
        console.error("Error al cargar los datos del panel", error);
      } finally {
        setCargando(false);
      }
    };

    cargarDatosPanel();
  }, [API_URL, usuarioRol]);

  // 🔄 Recarga del Top 5
  useEffect(() => {
    if (usuarioRol !== 'admin') return;

    const cargarMasVendidos = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/productos-mas-vendidos?periodo=${periodo}`);
        if (res.ok) {
          setMasVendidos(await res.json());
        }
      } catch (error) {
        console.error("Error al cargar los más vendidos", error);
      }
    };

    cargarMasVendidos();
  }, [API_URL, periodo, usuarioRol]);

  // 📝 Operaciones de notas
  const agregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNota.trim()) return;
    try {
      const res = await fetch(`${API_URL}/admin/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: nuevaNota })
      });
      if (res.ok) {
        setNotas([await res.json(), ...notas]);
        setNuevaNota('');
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo guardar la nota', 'error');
    }
  };

  const eliminarNota = async (id: number) => {
    try {
      if ((await fetch(`${API_URL}/admin/notas/${id}`, { method: 'DELETE' })).ok) {
        setNotas(notas.filter(n => n.id !== id));
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo eliminar la nota', 'error');
    }
  };

  // ==========================================
  // ✨ NUEVAS ACCIONES: CRUD DE CATEGORÍAS
  // ==========================================

  const agregarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    try {
      const res = await fetch(`${API_URL}/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuevaCategoria })
      });
      if (res.ok) {
        const creado = await res.json();
        setCategorias([...categorias, creado]);
        setNuevaCategoria('');
        Swal.fire('¡Creada!', 'La categoría ha sido añadida.', 'success');
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo crear la categoría', 'error');
    }
  };

  const iniciarEdicion = (cat: Categoria) => {
    setEditandoCategoriaId(cat.id);
    setEditandoNombre(cat.nombre);
  };

  const guardarEdicion = async (id: number) => {
    if (!editandoNombre.trim()) return;
    try {
      const res = await fetch(`${API_URL}/categorias/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: editandoNombre })
      });
      if (res.ok) {
        const actualizado = await res.json();
        setCategorias(categorias.map(cat => cat.id === id ? actualizado : cat));
        setEditandoCategoriaId(null);
        setEditandoNombre('');
        Swal.fire('¡Actualizada!', 'Categoría modificada con éxito.', 'success');
      }
    } catch (error) {
      Swal.fire('Error', 'No se pudo modificar la categoría', 'error');
    }
  };

  const eliminarCategoria = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Estás seguro de eliminar?',
      text: "Si esta categoría tiene productos asociados, el sistema bloqueará la acción por seguridad.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/categorias/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategorias(categorias.filter(cat => cat.id !== id));
        Swal.fire('¡Eliminada!', 'Categoría eliminada del registro.', 'success');
      } else {
        // Captura el error de restricción de integridad del backend de forma amigable
        Swal.fire('Acción Bloqueada', 'No se puede eliminar esta categoría porque actualmente contiene productos registrados en inventario.', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Hubo un error de conexión con el servidor.', 'error');
    }
  };

  if (usuarioRol !== 'admin') return null; 
  if (cargando) return <div className="text-center mt-20 font-bold text-gray-600 text-xl">Cargando panel de control...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* Cabecera */}
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
          <h1 className="text-4xl font-black text-gray-800 tracking-tight">Panel de Administración</h1>
          <p className="text-gray-500 font-medium mt-1">Hola {usuarioNombre}, este es el resumen general de tu negocio</p>
        </div>
        <Link to="/">
          <button className="bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-100 font-bold py-2 px-6 rounded-xl shadow-sm transition-colors">
            🏠 Volver al Punto de Venta
          </button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA IZQUIERDA */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-500 font-bold mb-1">Ventas de Hoy</h3>
              <p className="text-3xl font-black text-green-600">${metricas.ventasHoy.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-500 font-bold mb-1">IVA Acumulado (Mes)</h3>
              <p className="text-3xl font-black text-blue-600">${metricas.ivaMes.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-500 font-bold mb-1">Ticket Promedio</h3>
              <p className="text-3xl font-black text-gray-800">${metricas.ticketPromedio.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h3 className="text-gray-500 font-bold mb-1">Capital en Inventario</h3>
              <p className="text-3xl font-black text-purple-600">${metricas.costoInventario.toLocaleString('es-CL')}</p>
            </div>
          </div>

          {/* Productos Más Vendidos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-800">🔥 Productos Más Vendidos</h2>
              <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value as any)}
                className="bg-gray-50 border border-gray-200 text-gray-700 font-semibold p-2 rounded-xl text-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
              >
                <option value="dia">Hoy</option>
                <option value="semana">Últimos 7 días</option>
                <option value="mes">Este Mes</option>
              </select>
            </div>
            
            <div className="space-y-4">
              {masVendidos.map((prod, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 flex items-center justify-center font-bold text-sm rounded-full ${
                      index === 0 ? 'bg-amber-100 text-amber-700' : 
                      index === 1 ? 'bg-slate-200 text-slate-700' : 
                      index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="font-semibold text-gray-800">{prod.nombre}</span>
                  </div>
                  <span className="bg-blue-50 text-blue-700 font-black px-3 py-1 rounded-lg text-sm">
                    {prod.total} unds
                  </span>
                </div>
              ))}
              {masVendidos.length === 0 && (
                <p className="text-center text-gray-400 text-sm my-4">No hay registros de ventas en este rango.</p>
              )}
            </div>
          </div>

          {/* Gestión de Usuarios */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">👥 Equipo de Trabajo</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                  <tr>
                    <th className="p-3 font-bold">ID</th>
                    <th className="p-3 font-bold">Nombre de Usuario</th>
                    <th className="p-3 font-bold">Rol asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {empleados.map(emp => (
                    <tr key={emp.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-500">#{emp.id}</td>
                      <td className="p-3 font-medium text-gray-800">{emp.usuario}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          emp.rol === 'admin' ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {emp.rol.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ✨ NUEVA SECCIÓN EN LA IZQUIERDA: CRUD de Categorías */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-2">📂 Categorías de Productos</h2>
            <p className="text-gray-400 text-xs mb-4">Administra las agrupaciones de la vitrina comercial.</p>
            
            {/* Formulario de creación rápida */}
            <form onSubmit={agregarCategoria} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="Ej. Sándwiches, Líquidos, Postres..." 
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="flex-1 p-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
              />
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 rounded-xl text-sm transition-colors shadow-sm">
                ➕ Agregar
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                  <tr>
                    <th className="p-3 font-bold w-16">ID</th>
                    <th className="p-3 font-bold">Nombre de la Categoría</th>
                    <th className="p-3 font-bold text-right w-36">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {categorias.map(cat => (
                    <tr key={cat.id} className="hover:bg-gray-50">
                      <td className="p-3 text-gray-400 font-medium">#{cat.id}</td>
                      <td className="p-3">
                        {editandoCategoriaId === cat.id ? (
                          <input 
                            type="text" 
                            value={editandoNombre} 
                            onChange={(e) => setEditandoNombre(e.target.value)}
                            className="w-full p-2 border border-blue-400 rounded-lg text-sm bg-white focus:outline-none font-semibold text-gray-800"
                          />
                        ) : (
                          <span className="font-semibold text-gray-800">{cat.nombre}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {editandoCategoriaId === cat.id ? (
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => guardarEdicion(cat.id)}
                              className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              💾 Guardar
                            </button>
                            <button 
                              onClick={() => setEditandoCategoriaId(null)}
                              className="bg-gray-400 hover:bg-gray-500 text-white px-2 py-1 rounded-lg text-xs font-bold transition-colors"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button 
                              onClick={() => iniciarEdicion(cat)}
                              className="text-blue-500 hover:text-blue-700 text-sm font-bold transition-colors"
                            >
                              ✏️ Editar
                            </button>
                            <button 
                              onClick={() => eliminarCategoria(cat.id)}
                              className="text-red-500 hover:text-red-700 text-sm font-bold transition-colors"
                            >
                              🗑️ Borrar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {categorias.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center p-6 text-gray-400 text-sm">No hay categorías registradas en el sistema.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-8">
          {/* Bloc de Notas */}
          <div className="bg-yellow-50 rounded-2xl shadow-sm border border-yellow-200 p-6 flex flex-col h-100">
            <h2 className="text-xl font-black text-yellow-800 mb-4 flex items-center gap-2">📌 Notas Administrativas</h2>
            <form onSubmit={agregarNota} className="mb-4">
              <input 
                type="text" 
                placeholder="Escribe un recado rápido..." 
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                className="w-full p-3 rounded-xl border border-yellow-300 bg-white focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
            </form>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {notas.map(nota => (
                <div key={nota.id} className="bg-white p-3 rounded-xl shadow-sm border border-yellow-100 flex justify-between gap-2 group">
                  <p className="text-sm text-gray-700">{nota.texto}</p>
                  <button onClick={() => eliminarNota(nota.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                </div>
              ))}
              {notas.length === 0 && <p className="text-center text-yellow-600 text-sm mt-4">No hay notas pendientes.</p>}
            </div>
          </div>

          {/* Alertas */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">⚠️ Alertas del Sistema</h2>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 p-3 bg-red-50 text-red-700 rounded-xl border border-red-100 text-sm font-medium"><span>🔴</span> Hay 5 productos con stock crítico (bajo 5 unidades).</li>
              <li className="flex items-start gap-3 p-3 bg-blue-50 text-blue-700 rounded-xl border border-blue-100 text-sm font-medium"><span>📘</span> Recuerda que hoy es cierre de mes, exporta el reporte para el contador.</li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};