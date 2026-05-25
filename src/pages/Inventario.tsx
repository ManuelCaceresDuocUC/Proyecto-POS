import { Link } from 'react-router-dom';
import { useInventario, type Producto } from '../hooks/useInventario';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';

interface ItemRecetaLocal {
  insumoId: number;
  cantidad: number;
  descripcion?: string;
}

export const Inventario = () => {
  const { 
    productos,
    eliminarProducto,
    agregarProducto,
    editarProducto,
    obtenerStockVisual,
    productosFiltrados,
    busqueda,
    setBusqueda 
  } = useInventario();
  
  const productosRef = useRef<Producto[]>([]);

  useEffect(() => {
    productosRef.current = productos;
  }, [productos]);

  // Estados del modal y formularios
  const [showModalProducto, setShowModalProducto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  
  const [form, setForm] = useState({
    codigoBarras: '',
    descripcion: '',
    precio: '',
    stock: '',
    stockCritico: '',
    esInsumo: true,
    unidadMedida: 'UN'
  });

  const [listaIngredientesSeleccionados, setListaIngredientesSeleccionados] = useState<ItemRecetaLocal[]>([]);
  const [nuevoIngrediente, setNuevoIngrediente] = useState({
    insumoId: 0,
    cantidad: 0,
    descripcion: ''
  });

  // ==========================================
  // NUEVOS ESTADOS PARA LOS FILTROS
  // ==========================================
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'venta' | 'insumos'>('todos');
  const [soloCritico, setSoloCritico] = useState(false);

  // Aplicamos los filtros adicionales sobre los que ya filtró el buscador
  const productosFinales = productosFiltrados.filter(producto => {
    // 1. Filtro por tipo (Pestañas)
    if (filtroTipo === 'venta' && producto.esInsumo) return false;
    if (filtroTipo === 'insumos' && !producto.esInsumo) return false;
    
    // 2. Filtro de Stock Crítico (Botón de alerta)
    if (soloCritico) {
      const stockVisual = obtenerStockVisual(producto);
      if (stockVisual > producto.stockCritico) return false;
    }
    
    return true;
  });
  // ==========================================

  const agregarIngredienteALista = () => {
    if (nuevoIngrediente.insumoId === 0 || nuevoIngrediente.cantidad <= 0) {
      return Swal.fire("Atención", "Selecciona un insumo y cantidad válida", "warning");
    }
    setListaIngredientesSeleccionados(prev => [...prev, { ...nuevoIngrediente }]);
    setNuevoIngrediente({ insumoId: 0, cantidad: 0, descripcion: '' });
  };

  const quitarIngredienteDeLista = (id: number) => {
    setListaIngredientesSeleccionados(prev => prev.filter(item => item.insumoId !== id));
  };

  const abrirEdicion = (producto: Producto) => {
    setForm({
      codigoBarras: producto.codigoBarras || '',
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      stock: producto.stock.toString(),
      stockCritico: producto.stockCritico.toString(),
      esInsumo: producto.esInsumo ?? true,
      unidadMedida: producto.unidadMedida
    });
    
    if (producto.receta) {
      setListaIngredientesSeleccionados(producto.receta.map(r => ({
        insumoId: r.insumo.id,
        cantidad: r.cantidadUsada,
        descripcion: r.insumo.descripcion
      })));
    }
    setEditandoId(producto.id);
    setShowModalProducto(true);
  };

  const cerrarModal = () => {
    setShowModalProducto(false);
    setEditandoId(null);
    setListaIngredientesSeleccionados([]);
    setForm({ 
      codigoBarras: '', descripcion: '', precio: '', stock: '', 
      stockCritico: '', esInsumo: true, unidadMedida: 'UN' 
    });
  };

  const generarCodigoProvisional = () => `PROV-${Date.now()}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.descripcion || !form.precio || !form.stockCritico) {
      return Swal.fire("Faltan datos", "Rellena los campos obligatorios", "warning");
    }

    const codigoFinal = form.codigoBarras.trim() === "" ? generarCodigoProvisional() : form.codigoBarras;

    const datosProducto = {
      descripcion: form.descripcion,
      precio: Number(form.precio),
      stock: Number(form.stock),
      stockCritico: Number(form.stockCritico),
      esInsumo: form.esInsumo,
      unidadMedida: form.unidadMedida,
      codigoBarras: codigoFinal,
    };
    if (editandoId) {
      await editarProducto(editandoId, datosProducto);
    } else {
      const ingredientesParaEnviar = !form.esInsumo 
        ? listaIngredientesSeleccionados.map(i => ({ insumoId: i.insumoId, cantidad: i.cantidad })) 
        : [];
      await agregarProducto(datosProducto, ingredientesParaEnviar);
    }
    cerrarModal();
  };

  const manejarEntradaStock = async (producto: Producto) => {
    const { value: cantidad } = await Swal.fire({
      title: `Cargar Stock: ${producto.descripcion}`,
      input: 'number',
      inputLabel: `Cantidad que llegó (Unidad actual: ${producto.unidadMedida})`,
      inputPlaceholder: 'Ej: 10',
      showCancelButton: true,
      confirmButtonText: 'Sumar al stock',
      cancelButtonText: 'Cancelar',
      inputAttributes: {
        min: '0.01',
        step: '0.01'
      },
      inputValidator: (value) => {
        if (!value || Number(value) <= 0) {
          return '¡Debes ingresar una cantidad válida!';
        }
      }
    });

    if (cantidad) {
      try {
        const nuevoStock = producto.stock + Number(cantidad);
        await editarProducto(producto.id, {
          ...producto,
          stock: nuevoStock
        });

        Swal.fire('Actualizado', `Se han sumado ${cantidad} al stock de ${producto.descripcion}`, 'success');
      } catch (error) {
        console.log(error);
        Swal.fire('Error', 'No se pudo actualizar el stock', 'error');
      }
    }
  };

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col items-center p-10 relative'>
      

      <h1 className='text-4xl font-black text-gray-800 mb-8'>Inventario</h1>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className='w-full max-w-6xl mb-6 space-y-4'>
        <input 
          type="text"
          placeholder='🔍 Buscar producto por nombre o código...'
          className='w-full p-4 rounded-xl border border-gray-300 shadow-sm outline-none text-lg focus:ring-2 focus:ring-blue-500'
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        
        <div className='flex flex-col md:flex-row justify-between items-center bg-white p-3 rounded-xl shadow-sm border border-gray-200'>
          
          {/* Pestañas de Tipo */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full md:w-auto">
            <button 
              onClick={() => setFiltroTipo('todos')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${filtroTipo === 'todos' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFiltroTipo('venta')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${filtroTipo === 'venta' ? 'bg-white shadow text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Productos
            </button>
            <button 
              onClick={() => setFiltroTipo('insumos')}
              className={`flex-1 md:flex-none px-6 py-2 rounded-md text-sm font-bold transition-all ${filtroTipo === 'insumos' ? 'bg-white shadow text-green-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Insumos
            </button>
          </div>

          {/* Toggle Stock Crítico */}
          <button
            onClick={() => setSoloCritico(!soloCritico)}
            className={`mt-4 md:mt-0 flex items-center justify-center gap-2 px-5 py-2 w-full md:w-auto rounded-lg font-bold border transition-all ${soloCritico ? 'bg-red-50 border-red-200 text-red-600 shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
          >
            <span className={`w-3 h-3 rounded-full ${soloCritico ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></span>
            Stock Crítico
          </button>
        </div>
      </div>
      
      <div className='w-full max-w-6xl bg-white rounded-lg shadow-md border overflow-hidden'>
        <div className='p-4 border-b bg-gray-50 flex justify-between items-center'>
          <h2 className='text-xl font-semibold text-gray-700'>
            Resultados ({productosFinales.length})
          </h2>
          <button onClick={() => setShowModalProducto(true)} className="bg-green-600 hover:bg-green-700 transition-colors text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
            <span>+</span> Nuevo Producto
          </button>
        </div>
        
        <table className='w-full text-left'>
          <thead className='bg-gray-100 uppercase text-xs font-bold text-gray-600'>
            <tr>
              <th className='px-6 py-3'>Id</th>
              <th className='px-6 py-3'>Descripcion</th>
              <th className='px-6 py-3'>Precio</th>
              <th className='px-6 py-3'>Stock (Real/Virtual)</th>
              <th className='px-6 py-3 text-center'>Acciones</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {productosFinales.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-500 font-medium">
                  No se encontraron productos con estos filtros.
                </td>
              </tr>
            ) : (
              productosFinales.map((producto) => {
                const stockVisual = obtenerStockVisual(producto);
                const esCritico = stockVisual <= producto.stockCritico;
                return (
                  <tr key={producto.id} className={`hover:bg-gray-50 transition-colors ${esCritico ? 'bg-red-50/50' : ''}`}>
                    <td className='px-6 py-4 text-gray-500'>#{producto.id}</td>
                    <td className='px-6 py-4'>
                      {producto.descripcion}
                      {!producto.esInsumo && (producto.receta?.length || 0) > 0 && (
                        <span className="ml-2 bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full text-[10px] font-bold">RECETA</span>
                      )}
                      {producto.esInsumo && (
                        <span className="ml-2 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold">INSUMO</span>
                      )}
                    </td>
                    <td className='px-6 py-4 font-bold text-gray-700'>${producto.precio.toLocaleString()}</td>
                    <td className={`px-6 py-4 font-bold ${esCritico ? 'text-red-600' : 'text-gray-700'}`}>
                      {stockVisual} <span className='text-[10px] text-gray-400'>{producto.unidadMedida}</span>
                    </td>
                    <td className='px-6 py-4 flex justify-center gap-3'>
                      <button 
                        onClick={() => manejarEntradaStock(producto)} 
                        className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1 rounded-md font-bold flex items-center gap-1 transition-colors"
                        title="Cargar Stock"
                      >
                        +📦
                      </button>
                      <button onClick={() => abrirEdicion(producto)} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md font-bold transition-colors">
                        Editar
                      </button>
                      <button onClick={() => eliminarProducto(producto.id)} className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1 rounded-md font-bold transition-colors">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {showModalProducto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className='w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto'>
            <h2 className='text-2xl font-black mb-4'>{editandoId ? '📝 Editar' : '📦 Nuevo'} Producto</h2>
            
            <form className='flex flex-col gap-4' onSubmit={handleSubmit}>
              <div className="flex gap-2 p-2 bg-gray-50 rounded-xl">
                <button type="button" onClick={() => setForm({...form, esInsumo: true})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${form.esInsumo ? 'bg-blue-600 text-white shadow' : 'bg-white text-gray-600'}`}>INSUMO</button>
                <button type="button" onClick={() => setForm({...form, esInsumo: false})} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors ${!form.esInsumo ? 'bg-orange-600 text-white shadow' : 'bg-white text-gray-600'}`}>PRODUCTO VENTA</button>
              </div>

              <input type="text" placeholder="Código de barras" className='p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none' value={form.codigoBarras} onChange={(e) => setForm({...form, codigoBarras: e.target.value})} />
              <input type="text" placeholder="Descripción" className='p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none' value={form.descripcion} onChange={(e) => setForm({...form, descripcion: e.target.value})} />
              
              <div className='grid grid-cols-2 gap-2'>
                <div className='flex border rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-blue-500'>
                  <input type="number" step="0.01" className='w-full p-3 outline-none' placeholder="Stock" value={form.stock} onChange={(e)=> setForm({...form, stock: e.target.value})} />
                  <select 
                    className='bg-gray-100 px-2 text-xs outline-none cursor-pointer border-l' 
                    value={form.unidadMedida || ""} 
                    onChange={(e) => setForm({ ...form, unidadMedida: e.target.value })}
                  >
                    <option value="" disabled hidden>Medida</option>
                    <option value="UN">UN</option>
                    <option value="KG">KG</option>
                    <option value="LT">LT</option>
                  </select>
                </div>
                <input type="number" placeholder="Precio ($)" className='p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none' value={form.precio} onChange={(e)=> setForm({...form, precio: e.target.value})} />
              </div>

              <input type="number" placeholder="Stock Crítico (Alerta)" className='p-3 border rounded-xl focus:ring-2 focus:ring-red-500 outline-none' value={form.stockCritico} onChange={(e)=> setForm({...form, stockCritico: e.target.value})} />

              {/* SECCIÓN RECETA DINÁMICA */}
              {!form.esInsumo && (
                <div className="p-4 bg-orange-50 rounded-xl border border-orange-200 shadow-inner">
                  <p className="text-xs font-black text-orange-700 mb-2 uppercase italic flex items-center gap-1"><span>🥣</span> Ingredientes / Receta</p>
                  <div className="flex flex-col gap-2">
                    <select 
                      className="p-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-orange-400 bg-white"
                      value={nuevoIngrediente.insumoId}
                      onChange={(e) => {
                        const insumo = productos.find(p => p.id === Number(e.target.value));
                        setNuevoIngrediente({...nuevoIngrediente, insumoId: Number(e.target.value), descripcion: insumo?.descripcion || ''});
                      }}
                    >
                      <option value={0}>Seleccionar Insumo...</option>
                      {productos.filter(p => p.esInsumo).map(i => <option key={i.id} value={i.id}>{i.descripcion}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input type="number" step="0.001" placeholder="Cant." className="w-24 p-3 text-sm border rounded-lg outline-none focus:ring-2 focus:ring-orange-400" value={nuevoIngrediente.cantidad || ''} onChange={(e)=>setNuevoIngrediente({...nuevoIngrediente, cantidad: Number(e.target.value)})} />
                      <button type="button" onClick={agregarIngredienteALista} className="flex-1 bg-orange-600 hover:bg-orange-700 transition-colors text-white rounded-lg font-bold shadow">+</button>
                    </div>
                  </div>
                  
                  {listaIngredientesSeleccionados.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {listaIngredientesSeleccionados.map(item => (
                        <div key={item.insumoId} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-orange-100 shadow-sm text-sm">
                          <span className="font-medium text-gray-700">{item.descripcion}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">{item.cantidad}</span>
                            <button type="button" onClick={() => quitarIngredienteDeLista(item.insumoId)} className="text-red-400 hover:text-red-600 font-bold transition-colors">✕</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <button type='submit' className="bg-blue-600 hover:bg-blue-700 transition-colors text-white font-bold py-3.5 rounded-xl shadow-lg mt-2 text-lg">
                {editandoId ? 'Actualizar Producto' : 'Registrar Producto'}
              </button>
              <button type="button" onClick={cerrarModal} className="text-gray-500 hover:text-gray-800 transition-colors text-sm font-bold mt-1">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};