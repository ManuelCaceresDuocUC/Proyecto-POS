import { useInventario } from '../hooks/useInventario'; 
import { useRecetas } from '../hooks/useRecetas'; 
import { useState, useMemo } from 'react';
import Swal from 'sweetalert2';

interface IngredienteReceta {
  insumoId: number;
  nombre: string;
  cantidad: number;
}

export const Recetas = () => {
  const { productos, cargarProductos } = useInventario(); 
  const { recetas, eliminarReceta, cargarRecetas } = useRecetas(); 
  
  const [showModalReceta, setShowModalReceta] = useState(false);
  const [busqueda, setBusqueda] = useState(''); 
  const [productoPrincipal, setProductoPrincipal] = useState({
    descripcion: '',
    precio: '',
    stockCritico: '5',
    codigoBarras: ''
  });
  const [listaIngredientes, setListaIngredientes] = useState<IngredienteReceta[]>([]);
  const [tempInsumoId, setTempInsumoId] = useState('');
  const [tempCantidad, setTempCantidad] = useState('');

  const stockMaximoPosible = useMemo(() => {
    if (listaIngredientes.length === 0) return 0;
    const limites = listaIngredientes.map(ing => {
      const prod = productos.find(p => p.id === Number(ing.insumoId));
      return prod ? Math.floor(prod.stock / ing.cantidad) : 0;
    });
    return Math.min(...limites);
  }, [listaIngredientes, productos]);

  const agregarIngredienteALista = () => {
    if (!tempInsumoId || !tempCantidad) return;
    
    const insumo = productos.find(p => p.id === Number(tempInsumoId));
    
    const nuevoIngrediente: IngredienteReceta = {
      insumoId: Number(tempInsumoId),
      nombre: insumo?.descripcion || 'Insumo no registrado',
      cantidad: Number(tempCantidad)
    };

    setListaIngredientes([...listaIngredientes, nuevoIngrediente]);
    setTempInsumoId('');
    setTempCantidad('');
  };

  const handleSubmitFinal = async () => {
    if (!productoPrincipal.descripcion || listaIngredientes.length === 0) {
      return Swal.fire('Información Incompleta', 'Debe ingresar el nombre de la formulación y al menos un insumo componente.', 'warning');
    }

    // 🟢 1. Extraemos la empresa activa de tu localStorage (ej: "3")
    const empresaIdActiva = localStorage.getItem('empresaId') || '1';

    // 🟢 2. Agregamos empresa, categoría y unidadMedida al payload
    const payload = {
      productoPrincipal: {
        ...productoPrincipal,
        precio: Number(productoPrincipal.precio),
        stockCritico: Number(productoPrincipal.stockCritico),
        esInsumo: false, 
        stock: 0,
        unidadMedida: 'UN', 
        activo: true,
        empresa: { id: Number(empresaIdActiva) },
        categoria: { id: 1 } // Asignamos ID 1 por defecto para evitar NULL en BD
      },
      ingredientes: listaIngredientes.map(ing => ({
        insumoId: ing.insumoId,
        cantidad: ing.cantidad,
      }))
    };

    try {
      // 🟢 3. Pasamos la empresa por URL para satisfacer tu @RequestParam en Java
      const res = await fetch(`${import.meta.env.VITE_API_URL}/productos/con-receta?empresaId=${empresaIdActiva}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        Swal.fire('Registro Completo', 'La formulación del producto y su estructura de insumos han sido registradas en el sistema.', 'success');
        setShowModalReceta(false);
        setListaIngredientes([]);
        setProductoPrincipal({ descripcion: '', precio: '', stockCritico: '5', codigoBarras: '' });
        
        if (cargarProductos) cargarProductos(); 
        if (cargarRecetas) cargarRecetas(); 
      } else {
        const errorMsg = await res.text();
        throw new Error(errorMsg || 'Error al guardar en el servidor');
      }
    } catch (error: unknown) {
      console.error(error);
      const mensaje = error instanceof Error ? error.message : 'No fue posible establecer conexión con el servidor principal.';
      Swal.fire('Error al Guardar', mensaje, 'error');
    }
  };

  const recetasFiltradas = recetas.filter(r => {
    const nombreProducto = r.productoPadreNombre || r.productoNombre || r.producto?.descripcion || '';
    const nombreInsumo = r.insumoNombre || r.insumo?.descripcion || '';
    
    return nombreProducto.toLowerCase().includes(busqueda.toLowerCase()) ||
           nombreInsumo.toLowerCase().includes(busqueda.toLowerCase());
  });

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col items-center p-8 font-sans text-slate-800'>
        <div className="w-full max-w-6xl mb-8 border-b border-slate-200 pb-4">
          <h1 className='text-3xl font-semibold text-slate-900 tracking-tight'>Gestión de Formulaciones y Recetas</h1>
          <p className="text-slate-500 text-sm mt-1">Estructura de insumos y dependencias para productos elaborados.</p>
        </div>

        <div className='w-full max-w-6xl mb-6'>
            <input 
                type="text"
                placeholder='Filtrar por nombre de producto o insumo vinculado...'
                className='w-full p-2.5 rounded border border-slate-300 outline-none focus:border-slate-500 text-sm bg-white shadow-sm'
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
            />
        </div>

        <div className='w-full max-w-6xl bg-white rounded shadow-sm border border-slate-200 overflow-hidden'>
            <div className='p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center'>
                <h2 className='text-sm font-semibold text-slate-700 uppercase tracking-wide'>Matriz de Insumos por Producto</h2>
                <button 
                    onClick={() => setShowModalReceta(true)}
                    className="bg-slate-800 text-white py-1.5 px-4 rounded text-sm font-medium hover:bg-slate-900 transition-colors shadow-sm"
                >
                    Nueva Formulación
                </button>
            </div>

            <table className='w-full text-left text-sm'>
                <thead className='bg-slate-100 border-b border-slate-200'>
                    <tr>
                        <th className='px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600'>Producto Comercial</th>
                        <th className='px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600'>Insumo Componente (Descuento de Stock)</th>
                        <th className='px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600'>Consumo Unitario</th>
                        <th className='px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-600'>Acciones</th>
                    </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                    {recetasFiltradas.length === 0 ? (
                        <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-slate-400 font-medium">No se encontraron registros de formulación en el sistema.</td>
                        </tr>
                    ) : (
                        recetasFiltradas.map((r) => (
                            <tr key={r.id} className="hover:bg-slate-50">
                                <td className='px-6 py-3.5 font-medium text-slate-900'>{r.productoPadreNombre}</td>
                                <td className='px-6 py-3.5 text-slate-700'>{r.insumoNombre}</td>
                                <td className='px-6 py-3.5 font-mono text-slate-800'>{r.cantidadUsada}</td>
                                <td className='px-6 py-3.5'>
                                    <button 
                                        onClick={() => eliminarReceta(r.id!)} 
                                        className="text-red-600 hover:text-red-800 font-medium underline text-xs transition-colors"
                                    >
                                        Disociar Insumo
                                    </button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>

        {showModalReceta && (
            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className='w-full max-w-2xl bg-white p-6 rounded shadow-lg border border-slate-200 max-h-[90vh] overflow-y-auto text-sm'>
                    <h2 className='text-lg font-semibold mb-6 text-slate-900 border-b border-slate-100 pb-2'>Registro de Nueva Formulación de Producto</h2>
                    
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className='block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1'>Descripción del Producto</label>
                            <input 
                                placeholder="Ej: Sándwich de Carne Especial"
                                className="w-full p-2.5 border border-slate-300 rounded focus:border-slate-500 outline-none"
                                value={productoPrincipal.descripcion}
                                onChange={e => setProductoPrincipal({...productoPrincipal, descripcion: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className='block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1'>Precio de Venta ($)</label>
                            <input 
                                type="number" placeholder="Ej: 5500"
                                className="w-full p-2.5 border border-slate-300 rounded focus:border-slate-500 outline-none"
                                value={productoPrincipal.precio}
                                onChange={e => setProductoPrincipal({...productoPrincipal, precio: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className='bg-slate-50 p-4 rounded border border-slate-200 mb-6'>
                        <h3 className='font-semibold text-xs uppercase tracking-wider text-slate-700 mb-3'>Adición de Componentes / Insumos</h3>
                        <div className='flex gap-2'>
                            <select 
                                className='flex-1 p-2 border border-slate-300 rounded text-sm outline-none focus:border-slate-500 bg-white'
                                value={tempInsumoId}
                                onChange={e => setTempInsumoId(e.target.value)}
                            >
                                <option value="">Seleccione insumo disponible...</option>
                                {productos.filter(p => p.esInsumo).map(p => (
                                    <option key={p.id} value={p.id}>{p.descripcion} (Disponibilidad: {p.stock})</option>
                                ))}
                            </select>
                            <input 
                                type="number" placeholder="Cantidad" className='w-24 p-2 border border-slate-300 rounded text-sm outline-none focus:border-slate-500'
                                value={tempCantidad}
                                onChange={e => setTempCantidad(e.target.value)}
                            />
                            <button 
                                onClick={agregarIngredienteALista} 
                                className='bg-slate-800 hover:bg-slate-900 text-white px-4 rounded font-medium text-xs transition-colors'
                            >
                                Añadir
                            </button>
                        </div>
                    </div>

                    <table className='w-full text-left mb-6'>
                        <thead className='border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-600'>
                            <tr>
                                <th className='py-2.5 px-3'>Insumo Seleccionado</th>
                                <th className='py-2.5 px-3'>Consumo</th>
                                <th className='py-2.5 px-3 text-right'>Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {listaIngredientes.map((ing, index) => (
                                <tr key={index}>
                                    <td className='py-2.5 px-3 font-medium text-slate-800'>{ing.nombre}</td>
                                    <td className='py-2.5 px-3 font-mono text-slate-700'>{ing.cantidad}</td>
                                    <td className='py-2.5 px-3 text-right'>
                                        <button 
                                            className='text-red-600 hover:text-red-800 font-medium underline text-xs' 
                                            onClick={() => setListaIngredientes(listaIngredientes.filter((_, i) => i !== index))}
                                        >
                                            Remover
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {listaIngredientes.length === 0 && (
                                <tr>
                                    <td colSpan={3} className="text-center py-4 text-slate-400 text-xs">Sin insumos asignados a la receta actualmente.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <div className='flex justify-between items-center bg-slate-100 p-4 rounded border border-slate-200'>
                        <span className='font-semibold text-slate-700 uppercase tracking-wider text-xs'>Capacidad de Producción Estimada:</span>
                        <span className='text-xl font-bold font-mono text-slate-900'>{stockMaximoPosible} <span className='text-xs font-normal text-slate-600 uppercase'>unidades</span></span>
                    </div>

                    <div className='flex gap-3 mt-6'>
                        <button 
                            onClick={handleSubmitFinal} 
                            className='flex-1 bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded shadow-sm transition-all text-sm'
                        >
                            Guardar Registro Completo
                        </button>
                        <button 
                            onClick={() => setShowModalReceta(false)} 
                            className='px-5 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded transition-colors text-sm border border-slate-300'
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};