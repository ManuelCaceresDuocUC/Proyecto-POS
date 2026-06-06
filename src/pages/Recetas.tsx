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
    const { recetas, eliminarReceta } = useRecetas(); 
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
            nombre: insumo?.descripcion || 'Insumo desconocido',
            cantidad: Number(tempCantidad)
        };

        setListaIngredientes([...listaIngredientes, nuevoIngrediente]);
        setTempInsumoId('');
        setTempCantidad('');
    };

    const handleSubmitFinal = async () => {
        if (!productoPrincipal.descripcion || listaIngredientes.length === 0) {
            return Swal.fire('Faltan datos', 'Debes poner un nombre y al menos un ingrediente', 'warning');
        }

        const payload = {
            productoPrincipal: {
                ...productoPrincipal,
                precio: Number(productoPrincipal.precio),
                stockCritico: Number(productoPrincipal.stockCritico),
                esInsumo: false, 
                stock: 0 
            },
            ingredientes: listaIngredientes.map(ing => ({
                insumoId: ing.insumoId,
                cantidad: ing.cantidad
            }))
        };

        try {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/productos/con-receta`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                Swal.fire('¡Creado!', 'Producto y receta guardados con éxito', 'success');
                setShowModalReceta(false);
                setListaIngredientes([]);
                setProductoPrincipal({ descripcion: '', precio: '', stockCritico: '5', codigoBarras: '' });
                cargarProductos(); 
            }
        } catch (error) {
            console.error(error);
            Swal.fire('Error', 'No se pudo conectar con el servidor', 'error');
        }
    };

    const recetasFiltradas = recetas.filter(r => 
        r.productoPadreNombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
        r.insumoNombre?.toLowerCase().includes(busqueda.toLowerCase())
    );

    return (
        <div className='min-h-screen bg-gray-50 flex flex-col items-center p-10 relative'>
            
            <h1 className='text-4xl font-black text-gray-800 mb-8'>Gestión de Recetas</h1>

            <div className='w-full max-w-4xl mb-6'>
                <input 
                    type="text"
                    placeholder='Buscar por Producto o Insumo...'
                    className='w-full p-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-orange-500'
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                />
            </div>

            <div className='w-full max-w-6xl bg-white rounded-lg shadow-md overflow-hidden'>
                <div className='p-4 border-b bg-gray-50 flex justify-between items-center'>
                    <h2 className='text-2xl font-semibold'>Ingredientes por Producto</h2>
                    <button 
                        onClick={() => setShowModalReceta(true)}
                        className="bg-orange-600 text-white p-3 rounded-xl font-bold hover:bg-orange-700 transition-colors"
                    >
                        + Crear Producto con Receta
                    </button>
                </div>

                <table className='w-full'>
                    <thead className='bg-gray-200'>
                        <tr>
                            <th className='px-6 py-3 text-left text-xs font-bold uppercase'>Producto Final</th>
                            <th className='px-6 py-3 text-left text-xs font-bold uppercase'>Insumo (Se descuenta)</th>
                            <th className='px-6 py-3 text-left text-xs font-bold uppercase'>Cantidad</th>
                            <th className='px-6 py-3 text-left text-xs font-bold uppercase'>Acciones</th>
                        </tr>
                    </thead>
                    <tbody className='divide-y'>
                        {recetasFiltradas.map((r) => (
                            <tr key={r.id} className="hover:bg-gray-50">
                                <td className='px-6 py-4 font-bold'>{r.productoPadreNombre}</td>
                                <td className='px-6 py-4 text-blue-600'>{r.insumoNombre}</td>
                                <td className='px-6 py-4 font-mono'>{r.cantidadUsada}</td>
                                <td className='px-6 py-4'>
                                    <button 
                                        onClick={() => eliminarReceta(r.id!)} 
                                        className="text-red-500 hover:underline font-bold"
                                    >
                                        Eliminar Vínculo
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* MODAL PARA CREAR PRODUCTO + RECETA */}
            {showModalReceta && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className='w-full max-w-2xl bg-white p-8 rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto'>
                        <h2 className='text-2xl font-black mb-6 italic text-orange-600'>Nuevo Producto Compuesto</h2>
                        
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className='block text-xs font-bold text-gray-400 mb-1'>NOMBRE DEL PLATO</label>
                                <input 
                                    placeholder="Ej: Sándwich Mechada"
                                    className="w-full p-3 border rounded-xl"
                                    value={productoPrincipal.descripcion}
                                    onChange={e => setProductoPrincipal({...productoPrincipal, descripcion: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className='block text-xs font-bold text-gray-400 mb-1'>PRECIO VENTA</label>
                                <input 
                                    type="number" placeholder="Ej: 5500"
                                    className="w-full p-3 border rounded-xl"
                                    value={productoPrincipal.precio}
                                    onChange={e => setProductoPrincipal({...productoPrincipal, precio: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className='bg-gray-100 p-4 rounded-xl mb-6'>
                            <h3 className='font-bold mb-3'>Añadir Ingredientes a la Receta</h3>
                            <div className='flex gap-2'>
                                <select 
                                    className='flex-1 p-2 border rounded-lg'
                                    value={tempInsumoId}
                                    onChange={e => setTempInsumoId(e.target.value)}
                                >
                                    <option value="">Selecciona Insumo...</option>
                                    {productos.filter(p => p.esInsumo).map(p => (
                                        <option key={p.id} value={p.id}>{p.descripcion} (Stock: {p.stock})</option>
                                    ))}
                                </select>
                                <input 
                                    type="number" placeholder="Cant." className='w-24 p-2 border rounded-lg'
                                    value={tempCantidad}
                                    onChange={e => setTempCantidad(e.target.value)}
                                />
                                <button 
                                    onClick={agregarIngredienteALista} 
                                    className='bg-blue-600 text-white px-4 rounded-lg font-bold'
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <table className='w-full text-left mb-4'>
                            <thead className='border-b'>
                                <tr className='text-sm text-gray-500'>
                                    <th className='pb-2'>Ingrediente</th>
                                    <th className='pb-2'>Cantidad</th>
                                    <th className='pb-2'>Acción</th>
                                </tr>
                            </thead>
                            <tbody>
                                {listaIngredientes.map((ing, index) => (
                                    <tr key={index} className='border-b last:border-0'>
                                        <td className='py-3 font-medium'>{ing.nombre}</td>
                                        <td className='py-3'>{ing.cantidad}</td>
                                        <td className='py-3'>
                                            <button 
                                                className='text-red-500 font-bold' 
                                                onClick={() => setListaIngredientes(listaIngredientes.filter((_, i) => i !== index))}
                                            >
                                                ×
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        <div className='flex justify-between items-center bg-orange-50 p-4 rounded-xl border border-orange-100'>
                            <span className='font-bold text-orange-800 uppercase text-sm'>Stock Máximo Producible:</span>
                            <span className='text-3xl font-black text-orange-600'>{stockMaximoPosible} <small className='text-sm uppercase'>un.</small></span>
                        </div>

                        <div className='flex gap-4 mt-8'>
                            <button 
                                onClick={handleSubmitFinal} 
                                className='flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl shadow-lg transition-all active:scale-95'
                            >
                                GUARDAR PRODUCTO Y RECETA
                            </button>
                            <button 
                                onClick={() => setShowModalReceta(false)} 
                                className='px-6 py-4 text-gray-500 font-bold hover:bg-gray-50 rounded-xl transition-colors'
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