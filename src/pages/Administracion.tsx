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

interface Categoria {
  id: number;
  nombre: string;
}

export const Administracion = () => {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL;
  
  const usuarioRol = (localStorage.getItem('usuarioRol') || 'vendedor').toLowerCase().trim();
  const usuarioNombre = localStorage.getItem('usuarioNombre') || 'Usuario';
  const empresaId = localStorage.getItem('empresaId') || '1';

  const [metricas, setMetricas] = useState<Metricas>({ ventasHoy: 0, ivaMes: 0, ticketPromedio: 0, costoInventario: 0 });
  const [empleados, setEmpleados] = useState<Empleado[]>([]);
  const [notas, setNotas] = useState<Nota[]>([]);
  const [nuevaNota, setNuevaNota] = useState('');
  const [cargando, setCargando] = useState(true);

  const [masVendidos, setMasVendidos] = useState<ProductoMasVendido[]>([]);
  const [periodo, setPeriodo] = useState<'dia' | 'semana' | 'mes'>('dia');

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<number | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');

  useEffect(() => {
    if (usuarioRol !== 'admin') {
      Swal.fire({
        icon: 'info',
        title: 'Acceso Restringido',
        text: 'Esta sección contiene información confidencial y es de acceso exclusivo para administradores. Será redirigido al panel principal.',
        confirmButtonColor: '#1E293B',
        confirmButtonText: 'Entendido',
        allowOutsideClick: false,
        allowEscapeKey: false
      }).then(() => {
        navigate('/'); 
      });
    }
  }, [usuarioRol, navigate]);

  useEffect(() => {
    if (usuarioRol !== 'admin') return;

    const cargarDatosPanel = async () => {
      try {
        setCargando(true);
        const [resMetricas, resEmpleados, resNotas, resCategorias] = await Promise.all([
          fetch(`${API_URL}/admin/metricas?empresaId=${empresaId}`),
          fetch(`${API_URL}/usuarios?empresaId=${empresaId}`),
          fetch(`${API_URL}/notas?empresaId=${empresaId}`),
          fetch(`${API_URL}/categorias?empresaId=${empresaId}`) 
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
  }, [API_URL, usuarioRol, empresaId]);

  useEffect(() => {
    if (usuarioRol !== 'admin') return;

    const cargarMasVendidos = async () => {
      try {
        const res = await fetch(`${API_URL}/admin/productos-mas-vendidos?periodo=${periodo}&empresaId=${empresaId}`);
        if (res.ok) {
          setMasVendidos(await res.json());
        }
      } catch (error) {
        console.error("Error al cargar los productos más vendidos", error);
      }
    };

    cargarMasVendidos();
  }, [API_URL, periodo, usuarioRol, empresaId]);

  const agregarNota = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaNota.trim()) return;
    try {
      const res = await fetch(`${API_URL}/notas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          texto: nuevaNota,
          empresa: { id: parseInt(empresaId) } 
        })
      });
      if (res.ok) {
        setNotas([await res.json(), ...notas]);
        setNuevaNota('');
      }
    } catch (error) {
      console.error("Detalle del error:", error); 
      Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
    }
  };

  const eliminarNota = async (id: number) => {
    try {
      if ((await fetch(`${API_URL}/notas/${id}`, { method: 'DELETE' })).ok) {
        setNotas(notas.filter(n => n.id !== id));
      }
    } catch (error) {
      console.error("Detalle del error:", error);
      Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
    }
  };

  const agregarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevaCategoria.trim()) return;
    try {
      const res = await fetch(`${API_URL}/categorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          nombre: nuevaCategoria,
          empresa: { id: parseInt(empresaId) }
        })
      });
      if (res.ok) {
        const creado = await res.json();
        setCategorias([...categorias, creado]);
        setNuevaCategoria('');
        Swal.fire('Confirmación', 'La categoría ha sido registrada correctamente.', 'success');
      }
    } catch (error) {
      console.error("Detalle del error:", error);
      Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
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
        body: JSON.stringify({ 
          nombre: editandoNombre,
          empresa: { id: parseInt(empresaId) }
        })
      });
      if (res.ok) {
        const actualizado = await res.json();
        setCategorias(categorias.map(cat => cat.id === id ? actualizado : cat));
        setEditandoCategoriaId(null);
        setEditandoNombre('');
        Swal.fire('Confirmación', 'La categoría ha sido actualizada correctamente.', 'success');
      }
    } catch (error) {
      console.error("Detalle del error:", error);
      Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
    }
  };

  const eliminarCategoria = async (id: number) => {
    const result = await Swal.fire({
      title: '¿Confirmar eliminación?',
      text: "Si la categoría posee productos vinculados, el sistema impedirá su eliminación por seguridad del inventario.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#DC2626',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Confirmar',
      cancelButtonText: 'Cancelar'
    });

    if (!result.isConfirmed) return;

    try {
      const res = await fetch(`${API_URL}/categorias/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCategorias(categorias.filter(cat => cat.id !== id));
        Swal.fire('Confirmación', 'Categoría eliminada del registro.', 'success');
      } else {
        Swal.fire('Acción Denedaga', 'No es posible eliminar esta categoría porque contiene productos registrados en el inventario actual.', 'error');
      }
    } catch (error) {
      console.error("Detalle del error:", error);
      Swal.fire('Error', 'No se pudo procesar la solicitud.', 'error');
    }
  };

  if (usuarioRol !== 'admin') return null; 
  if (cargando) return <div className="text-center mt-20 font-medium text-slate-600 text-sm tracking-wide uppercase">Cargando panel de control...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-8 gap-4 border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Panel de Administración</h1>
          <p className="text-slate-500 text-sm mt-1">Usuario: {usuarioNombre} | Resumen de gestión comercial</p>
        </div>
        <Link to="/home">
          <button className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium py-2 px-5 rounded text-sm transition-colors shadow-sm">
            Volver al Punto de Venta
          </button>
        </Link>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="lg:col-span-2 space-y-8">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
              <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Ventas del Día</h3>
              <p className="text-2xl font-semibold text-slate-900">${metricas.ventasHoy.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
              <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">IVA Acumulado (Mes)</h3>
              <p className="text-2xl font-semibold text-slate-900">${metricas.ivaMes.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
              <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Ticket Promedio</h3>
              <p className="text-2xl font-semibold text-slate-900">${metricas.ticketPromedio.toLocaleString('es-CL')}</p>
            </div>
            <div className="bg-white p-6 rounded shadow-sm border border-slate-200">
              <h3 className="text-slate-500 font-medium text-xs uppercase tracking-wider mb-1">Capital en Inventario</h3>
              <p className="text-2xl font-semibold text-slate-900">${metricas.costoInventario.toLocaleString('es-CL')}</p>
            </div>
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 p-6">
            <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
              <h2 className="text-base font-semibold text-slate-800 uppercase tracking-wide">Productos Con Mayor Demanda</h2>
              <select 
                value={periodo} 
                onChange={(e) => setPeriodo(e.target.value as 'dia' | 'semana' | 'mes')}
                className="bg-slate-50 border border-slate-300 text-slate-700 font-medium p-2 rounded text-sm outline-none cursor-pointer focus:border-slate-500"
              >
                <option value="dia">Día en curso</option>
                <option value="semana">Últimos 7 días</option>
                <option value="mes">Mes actual</option>
              </select>
            </div>
            
            <div className="space-y-3">
              {masVendidos.map((prod, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-100 text-sm">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 flex items-center justify-center font-semibold text-xs rounded bg-slate-200 text-slate-700">
                      {index + 1}
                    </span>
                    <span className="font-medium text-slate-800">{prod.nombre}</span>
                  </div>
                  <span className="bg-slate-200 text-slate-800 font-semibold px-2.5 py-0.5 rounded text-xs">
                    {prod.total} unds.
                  </span>
                </div>
              ))}
              {masVendidos.length === 0 && (
                <p className="text-center text-slate-400 text-sm my-4">No existen registros para el período seleccionado.</p>
              )}
            </div>
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 uppercase tracking-wide mb-4 border-b border-slate-100 pb-3">Personal del Sistema</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="p-3">ID</th>
                    <th className="p-3">Nombre de Usuario</th>
                    <th className="p-3">Rol Asignado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {empleados.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-500 font-mono">#{emp.id}</td>
                      <td className="p-3 font-medium text-slate-800">{emp.usuario}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                          emp.rol === 'admin' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
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

          <div className="bg-white rounded shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 uppercase tracking-wide mb-1">Categorías de Productos</h2>
            <p className="text-slate-500 text-xs mb-4 border-b border-slate-100 pb-3">Gestión de las agrupaciones del catálogo comercial.</p>
            
            <form onSubmit={agregarCategoria} className="flex gap-2 mb-6">
              <input 
                type="text" 
                placeholder="Nombre de la nueva categoría..." 
                value={nuevaCategoria}
                onChange={(e) => setNuevaCategoria(e.target.value)}
                className="flex-1 p-2.5 rounded border border-slate-300 bg-white focus:outline-none focus:border-slate-500 text-sm"
              />
              <button type="submit" className="bg-slate-800 hover:bg-slate-900 text-white font-medium px-4 rounded text-sm transition-colors">
                Agregar Categoría
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="p-3 w-16">ID</th>
                    <th className="p-3">Nombre</th>
                    <th className="p-3 text-right w-36">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {categorias.map(cat => (
                    <tr key={cat.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-400 font-mono">#{cat.id}</td>
                      <td className="p-3">
                        {editandoCategoriaId === cat.id ? (
                          <input 
                            type="text" 
                            value={editandoNombre} 
                            onChange={(e) => setEditandoNombre(e.target.value)}
                            className="w-full p-1.5 border border-slate-400 rounded text-sm bg-white focus:outline-none font-medium text-slate-800"
                          />
                        ) : (
                          <span className="font-medium text-slate-800">{cat.nombre}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {editandoCategoriaId === cat.id ? (
                          <div className="flex justify-end gap-1">
                            <button 
                              onClick={() => guardarEdicion(cat.id)}
                              className="bg-slate-800 hover:bg-slate-900 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Guardar
                            </button>
                            <button 
                              onClick={() => setEditandoCategoriaId(null)}
                              className="bg-slate-400 hover:bg-slate-500 text-white px-2 py-1 rounded text-xs font-medium transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-3">
                            <button 
                              onClick={() => iniciarEdicion(cat)}
                              className="text-slate-600 hover:text-slate-900 text-xs font-medium underline transition-colors"
                            >
                              Editar
                            </button>
                            <button 
                              onClick={() => eliminarCategoria(cat.id)}
                              className="text-red-600 hover:text-red-800 text-xs font-medium underline transition-colors"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {categorias.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center p-6 text-slate-400 text-sm">No existen categorías registradas en el sistema.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        <div className="space-y-8">
          <div className="bg-white rounded shadow-sm border border-slate-200 p-6 flex flex-col h-full max-h-[500px]">
            <h2 className="text-base font-semibold text-slate-800 uppercase tracking-wide mb-4 border-b border-slate-100 pb-3">Notas Administrativas</h2>
            <form onSubmit={agregarNota} className="mb-4">
              <input 
                type="text" 
                placeholder="Ingresar nuevo registro..." 
                value={nuevaNota}
                onChange={(e) => setNuevaNota(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 bg-white focus:outline-none focus:border-slate-500 text-sm"
              />
            </form>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {notas.map(nota => (
                <div key={nota.id} className="bg-slate-50 p-3 rounded border border-slate-200 flex justify-between items-center gap-2 group text-sm">
                  <p className="text-slate-700">{nota.texto}</p>
                  <button 
                    onClick={() => eliminarNota(nota.id)} 
                    className="text-slate-400 hover:text-red-600 font-mono text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    [X]
                  </button>
                </div>
              ))}
              {notas.length === 0 && <p className="text-center text-slate-400 text-sm mt-4">Sin notas registradas.</p>}
            </div>
          </div>

          <div className="bg-white rounded shadow-sm border border-slate-200 p-6">
            <h2 className="text-base font-semibold text-slate-800 uppercase tracking-wide mb-4 border-b border-slate-100 pb-3">Notificaciones del Sistema</h2>
            <ul className="space-y-2 text-sm">
              <li className="p-3 bg-slate-50 text-slate-700 rounded border border-slate-200 font-medium">
                Alerta de inventario: Existen 5 productos con stock crítico inferior al límite permitido.
              </li>
              <li className="p-3 bg-slate-50 text-slate-700 rounded border border-slate-200 font-medium">
                Recordatorio contable: Cierre de mes en curso. Recuerde exportar los reportes financieros para auditoría.
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};