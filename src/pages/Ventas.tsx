import { useInventario } from '../hooks/useInventario';
import { useEffect, useRef, useState } from 'react';
import { useVentas } from '../hooks/useVentas';

export const Ventas = () => {
  const buscadorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { productos, cargarProductos } = useInventario(); 
  
  // 👉 Estados de la interfaz de venta
  const [pagaCon, setPagaCon] = useState(0);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  
  // 👉 Estados de la Caja y Menú
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [montoApertura, setMontoApertura] = useState('');
  const [cargandoCaja, setCargandoCaja] = useState(true); 
  const [cajaAbierta, setCajaAbierta] = useState(false); 

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

  // 👉 1. VERIFICAR ESTADO DE CAJA AL CARGAR (Conexión a Spring Boot)
  useEffect(() => {
    const verificarEstadoCaja = async () => {
      try {
        // Reemplaza con la URL de tu backend Spring Boot (ej: http://localhost:8080/api/caja/estado)
        // const response = await fetch('http://tu-dominio.com/api/caja/estado');
        // if (response.ok) {
        //   const data = await response.json();
        //   setCajaAbierta(data.abierta); // Asume que tu backend devuelve { "abierta": true/false }
        // }
        
        // Simulación temporal para que puedas ver la UI mientras conectas el backend
        setTimeout(() => {
          setCajaAbierta(false); // Cambia a true para probar el POS directamente
          setCargandoCaja(false);
        }, 800);

      } catch (error) {
        console.error("Error al conectar con el servidor:", error);
        setCargandoCaja(false);
      }
    };

    verificarEstadoCaja();
  }, []);

  // Manejador para cerrar menús al hacer clic afuera
  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target as Node)){
        setMostrarSugerencias(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)){
        setMenuAbierto(false);
      }
    }
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  // 👉 2. ABRIR CAJA (POST a Spring Boot)
  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoApertura.trim() === '') return;
    
    setCargandoCaja(true);
    try {
      /* CÓDIGO REAL PARA SPRING BOOT:
      const response = await fetch('http://tu-dominio.com/api/caja/abrir', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoInicial: Number(montoApertura) })
      });
      if (!response.ok) throw new Error('Error al abrir caja');
      */
      
      // Simulación de éxito
      setTimeout(() => {
        setCajaAbierta(true);
        setCargandoCaja(false);
      }, 500);

    } catch (error) {
      alert("Hubo un error al abrir la caja en el servidor."+error);
      setCargandoCaja(false);
    }
  };

  // 👉 3. CERRAR CAJA (POST a Spring Boot)
  const handleCerrarCaja = async () => {
    const confirmar = window.confirm("¿Estás seguro de que deseas cerrar la caja del turno?");
    if (confirmar) {
      setCargandoCaja(true);
      try {
        /* CÓDIGO REAL PARA SPRING BOOT:
        const response = await fetch('http://tu-dominio.com/api/caja/cerrar', {
          method: 'POST'
        });
        if (!response.ok) throw new Error('Error al cerrar caja');
        */
        
        // Simulación de éxito
        setTimeout(() => {
          setCajaAbierta(false);
          setMenuAbierto(false);
          setMontoApertura('');
          setCargandoCaja(false);
        }, 500);

      } catch (error) {
        alert("Error al cerrar la caja en el servidor."+error);
        setCargandoCaja(false);
      }
    }
  };

  const sugerencias = busqueda.trim() === '' 
    ? [] 
    : productos.filter(p => 
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.id.toString().includes(busqueda)
      ).slice(0, 5);

  // ==========================================
  // RENDERIZADO CONDICIONAL
  // ==========================================

  // 1. PANTALLA DE CARGA
  if (cargandoCaja) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Sincronizando con el servidor...</p>
      </div>
    );
  }

  // 2. PANTALLA DE APERTURA (Bloqueo si está cerrada)
  if (!cajaAbierta) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full border-t-8 border-blue-600">
          <h2 className="text-3xl font-black text-gray-800 mb-2 text-center">Apertura de Caja</h2>
          <p className="text-gray-500 text-center mb-8">Ingresa el fondo de caja (sencillo) para iniciar el turno.</p>
          
          <form onSubmit={handleAbrirCaja} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Fondo Inicial en Efectivo</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                <input 
                  type="number"
                  required
                  min="0"
                  placeholder="Ej: 50000"
                  className="w-full pl-8 p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 focus:ring-0 outline-none text-xl font-mono"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg transition-colors text-lg"
            >
              INICIAR TURNO
            </button>
          </form>
        </div>
      </div>
    );
  }

  // 3. PANTALLA PRINCIPAL DE VENTAS
  return (
    <div className='min-h-screen bg-gray-50 flex flex-col items-center p-10 relative'>
      
      <h1 className='text-4xl font-black text-gray-800 mb-8 tracking-tight'>Caja</h1>

      {/* Buscador y Menú Hamburguesa */}
      <div className='w-full max-w-4xl mb-6 flex gap-4'>
        
        {/* Input Buscador */}
        <div ref={buscadorRef} className='flex-1 relative'>
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

        {/* Menú Hamburgesa */}
        <div ref={menuRef} className="relative">
          <button 
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="h-full px-5 bg-white border border-gray-300 rounded-xl shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center text-2xl"
          >
            ☰
          </button>

          {menuAbierto && (
            <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-20">
              <div className="bg-gray-100 p-3 border-b text-xs font-bold text-gray-500 uppercase tracking-wider">
                Opciones de Caja
              </div>
              <ul className="flex flex-col">
                <li>
                  <button className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 text-sm font-medium text-gray-700 transition-colors">
                    📄 Reimprimir Última Boleta
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 text-sm font-medium text-gray-700 transition-colors">
                    💰 Ingreso/Retiro de Efectivo
                  </button>
                </li>
                <li>
                  <button className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 text-sm font-medium text-gray-700 transition-colors">
                    📊 Ver Resumen del Turno
                  </button>
                </li>
                <li>
                  <button 
                    onClick={handleCerrarCaja}
                    className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm font-bold text-red-600 transition-colors"
                  >
                    🔒 Cierre de Caja
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className='flex flex-col lg:flex-row gap-8 items-start w-full max-w-6xl'>
        {/* Tabla Detalle */}
        <div className="flex-1 overflow-hidden rounded-lg shadow-md border border-gray-200 bg-white w-full">
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
                    <td className='px-6 py-4 flex justify-center items-center gap-2'>
                      <button onClick={() => actualizarCantidad(producto.id, -1)} className="bg-blue-600 text-white w-7 h-7 rounded leading-none flex items-center justify-center hover:bg-blue-700">-</button>
                      <span className='font-bold w-4 text-center'>{producto.cantidadSeleccionada}</span>
                      <button onClick={() => actualizarCantidad(producto.id, 1)} className="bg-blue-600 text-white w-7 h-7 rounded leading-none flex items-center justify-center hover:bg-blue-700">+</button>
                    </td>
                    <td className='px-6 py-4 text-center font-bold'>${producto.precio * producto.cantidadSeleccionada}</td>
                    <td className='text-center'>
                      <button onClick={() => eliminarDelCarrito(producto.id)} className='text-red-400 hover:text-red-600 font-bold'>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
           </table>
        </div>

        {/* Resumen Lateral */}
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
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-black py-4 rounded-xl shadow-lg uppercase mt-4 transition-colors"
            >
              Finalizar Compra
            </button>
        </div>
      </div>

      {/* Modal de Pago */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h3 className="text-2xl font-bold mb-2 text-center text-gray-800">Finalizar Venta</h3>
            
            {/* Desglose de impuestos */}
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

            {/* Selección Método de Pago */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button 
                onClick={() => setMetodoPago('efectivo')} 
                className={`p-4 border-2 rounded-xl transition-all ${metodoPago === 'efectivo' ? 'border-green-500 bg-green-50 scale-105' : 'border-gray-200'}`}
              >
                <span className="block text-2xl mb-1">💵</span>
                <span className="font-bold text-gray-700">Efectivo</span>
              </button>
              <button 
                onClick={() => setMetodoPago('tarjeta')} 
                className={`p-4 border-2 rounded-xl transition-all ${metodoPago === 'tarjeta' ? 'border-blue-500 bg-blue-50 scale-105' : 'border-gray-200'}`}
              >
                <span className="block text-2xl mb-1">💳</span>
                <span className="font-bold text-gray-700">Tarjeta</span>
              </button>
            </div>

            {/* Ingreso monto para Vuelto (Solo efectivo) */}
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

            {/* Botones de acción del Modal */}
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