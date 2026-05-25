import { Link } from 'react-router-dom';
import { useInventario } from '../hooks/useInventario';
import { useEffect, useRef, useState } from 'react';
import { useVentas } from '../hooks/useVentas';

export const Ventas = () => {
  const buscadorRef = useRef<HTMLDivElement>(null);
  
  // 👉 CAMBIO AQUI: Asegúrate de que `useInventario` te entregue la función para recargar los datos
  // (Si tu función se llama distinto a "cargarProductos", cámbiala aquí y abajo)
  const { productos, cargarProductos } = useInventario(); 
  
  const [pagaCon, setPagaCon] = useState(0);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  
  // 👉 CAMBIO AQUI: Le pasamos la función al hook useVentas
  const { 
    carrito,
    agregarAlCarrito,  
    actualizarCantidad,
    totalVenta,
    eliminarDelCarrito,
    confirmarVentaFinal,
    showModalPago,
    busqueda,
    setBusqueda,
    setShowModalPago,
    metodoPago,
    setMetodoPago 
  } = useVentas(cargarProductos); 

  const totalBruto = totalVenta; 
  const neto = Math.round(totalBruto / 1.19);
  const iva = totalBruto - neto;

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target as Node)){
        setMostrarSugerencias(false);
      }
    }
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  const sugerencias = busqueda.trim() === '' 
    ? [] 
    : productos.filter(p => 
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.id.toString().includes(busqueda)
      ).slice(0, 5);
  
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col items-center p-10 relative'>
      

      <h1 className='text-4xl font-black text-gray-800 mb-8 tracking-tight'>Ventas</h1>

      {/* Buscador */}
      <div ref={buscadorRef} className='w-full max-w-4xl mb-6 relative'>
        <input 
          type="text"
          placeholder='Buscar producto por nombre o ID...'
          className='w-full p-4 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all'
          value={busqueda}
          onFocus={()=> setMostrarSugerencias(true)}
          onChange={(e) => {
            setBusqueda(e.target.value);
            setMostrarSugerencias(true);
          }}
        />
        {mostrarSugerencias && sugerencias.length > 0 && (
          <ul className='absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-xl shadow-2xl overflow-hidden'>
            {sugerencias.map(p => (
              <li 
                key={p.id}
                onClick={() => {
                  agregarAlCarrito(p);
                  setMostrarSugerencias(false);
                  setBusqueda('');
                }}
                className='p-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center border-b border-gray-50 last:border-none'
              >
                <div>
                  <span className='font-bold text-blue-600'>#{p.id}</span>
                  <span className='ml-3 text-gray-700'>{p.descripcion}</span>
                </div>
                <span className='text-xs bg-gray-100 px-2 py-1 rounded text-gray-500'>Stock: {p.stock}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className='flex flex-col lg:flex-row gap-8 items-start w-full max-w-6xl'>
        {/* Tabla Detalle */}
        <div className="flex-1 overflow-hidden rounded-lg shadow-md border border-gray-200 bg-white">
            <table className='w-full'>
              
              <thead className='bg-gray-200 border-b-2 border-gray-300'>
                <tr>
                  <th className='px-6 py-3 text-xs text-center'>Descripcion</th>
                  <th className='px-6 py-3 text-xs text-center'>Precio</th>
                  <th className='px-6 py-3 text-xs text-center'>Cantidad</th>
                  <th className='px-6 py-3 text-xs text-center'>Subtotal</th>
                  <th className='w-16'></th>
                </tr>
              </thead>
              <tbody className='divide-y divide-gray-200'>
                {carrito.map((producto) => (
                  <tr key={producto.id}>
                    <td className='px-6 py-4 text-center'>{producto.descripcion}</td>
                    <td className='px-6 py-4 text-center'>${producto.precio}</td>
                    <td className='px-6 py-4 flex justify-center gap-2'>
                      <button onClick={() => actualizarCantidad(producto.id, -1)} className="bg-blue-600 text-white w-7 h-7 rounded">-</button>
                      <span className='font-bold'>{producto.cantidadSeleccionada}</span>
                      <button onClick={() => actualizarCantidad(producto.id, 1)} className="bg-blue-600 text-white w-7 h-7 rounded">+</button>
                    </td>
                    <td className='px-6 py-4 text-center font-bold'>${producto.precio * producto.cantidadSeleccionada}</td>
                    <td className='text-center'>
                      <button onClick={() => eliminarDelCarrito(producto.id)} className='text-red-400'>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>

        {/* Resumen */}
        <div className='w-full lg:w-80 bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-600'>
           <div className='space-y-2 text-sm text-gray-500 italic'>
            <div className='flex justify-between'>
              <span>Neto:</span>
              <span>${neto}</span>
            </div>
            <div className='flex justify-between'>
              <span>IVA (19%):</span>
              <span>${iva}</span> 
            </div>
          </div>
            <button 
              onClick={() => setShowModalPago(true)}
              disabled={carrito.length === 0}
              className="w-full bg-green-600 text-white font-black py-4 rounded-xl shadow-lg uppercase mt-4"
            >
              Finalizar Compra
            </button>
        </div>
      </div>
      {/* Modal Pago  */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">Finalizar Venta</h3>
            
            {/* Desglose de impuestos*/}
            <div className="bg-gray-50 p-3 rounded-lg mb-6 border border-gray-100">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Neto:</span>
                <span>${neto}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-500">
                <span>IVA (19%):</span>
                <span>${iva}</span>
              </div>
              <div className="flex justify-between font-bold text-lg text-blue-600 mt-1 border-t pt-1">
                <span>Total:</span>
                <span>${totalVenta}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <button 
                onClick={() => setMetodoPago('efectivo')} 
                className={`p-4 border-2 rounded-xl transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 scale-105' : 'border-gray-200'}`}
              >
                <span className="block text-2xl">💵</span>
                <span className="font-bold">Efectivo</span>
              </button>
              <button 
                onClick={() => setMetodoPago('tarjeta')} 
                className={`p-4 border-2 rounded-xl transition-all ${metodoPago === 'tarjeta' ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-200'}`}
              >
                <span className="block text-2xl">💳</span>
                <span className="font-bold">Tarjeta</span>
              </button>
            </div>

            {/* Sección de Vuelto  */}
            {metodoPago === 'efectivo' && (
              <div className="mb-6 animate-in fade-in duration-300">
                <label className="block text-sm font-semibold text-gray-600 mb-2">¿Con cuánto paga el cliente?</label>
                <input 
                  type="number"
                  placeholder="Monto recibido..."
                  className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:ring-0 outline-none font-mono text-xl"
                  value={pagaCon || ''}
                  onChange={(e) => setPagaCon(Number(e.target.value))}
                />
                {pagaCon > totalVenta && (
                  <div className="mt-3 p-3 bg-green-100 rounded-lg flex justify-between items-center">
                    <span className="text-green-800 font-medium">Vuelto:</span>
                    <span className="text-2xl font-black text-green-700">${pagaCon - totalVenta}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button 
                onClick={confirmarVentaFinal} 
                disabled={!metodoPago || (metodoPago === 'efectivo' && pagaCon < totalVenta)}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white py-4 rounded-xl font-black text-lg transition-all shadow-lg shadow-green-200"
              >
                {metodoPago === 'tarjeta' ? 'INICIAR COBRO GETNET' : 'CONFIRMAR VENTA'}
              </button>
              
              <button 
                onClick={() => { setShowModalPago(false); setMetodoPago(""); setPagaCon(0); }} 
                className="w-full py-2 text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                Cancelar y volver
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};