import { useInventario } from '../hooks/useInventario';
import { useEffect, useRef, useState } from 'react';
import { useVentas } from '../hooks/useVentas';
import Swal from 'sweetalert2';
import { LectorCamara } from '../components/LectorCamara';

interface ResumenCaja {
  fondoInicial: number;
  ventasEfectivo: number;
  ventasTarjeta: number;
  ingresosExtra: number;
  retiros: number;
  totalEnCaja: number;
  
}

// Interfaz para limpiar el mapeo del carrito
interface ItemCarrito {
  id: number;
  descripcion: string;
  precio: number;
  cantidad: number;
  subtotal: number;
}

export const Ventas = () => {
  const usuarioId = localStorage.getItem('usuarioId') || "1";
  const buscadorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  
  const { productos, cargarProductos } = useInventario(); 
  
  const [pagaCon, setPagaCon] = useState(0);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [mostrarCamara, setMostrarCamara] = useState(false);
  
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [montoApertura, setMontoApertura] = useState('');
  const [cargandoCaja, setCargandoCaja] = useState(true); 
  const [cajaAbierta, setCajaAbierta] = useState(false); 

  const [showModalMovimiento, setShowModalMovimiento] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<'ingreso' | 'retiro'>('retiro');
  const [montoMovimiento, setMontoMovimiento] = useState('');
  const [motivoMovimiento, setMotivoMovimiento] = useState('');

  const [showModalResumen, setShowModalResumen] = useState(false);
  const [datosResumen, setDatosResumen] = useState<ResumenCaja | null>(null);
  const [cargandoResumen, setCargandoResumen] = useState(false);

  const [showModalCierre, setShowModalCierre] = useState(false);
  const [efectivoFisicoDeclarado, setEfectivoFisicoDeclarado] = useState('');
  const [faseCierre, setFaseCierre] = useState<'declaracion' | 'resultado'>('declaracion');
  const [datosCierreCalculados, setDatosCierreCalculados] = useState<ResumenCaja | null>(null);
  const [, setCargandoCierre] = useState(false);


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
    setMetodoPago,
    proveedorTarjeta,    // <--- AGRÉGALO AQUÍ
    setProveedorTarjeta  // <--- AGRÉGALO AQUÍ
} = useVentas(cargarProductos); 

  const totalBruto = totalVenta; 
  const neto = Math.round(totalBruto / 1.19);
  const iva = totalBruto - neto;

  useEffect(() => {
    const verificarEstadoCaja = async () => {
      try {
        // ✨ ACTUALIZADO: Pasamos el usuarioId por URL
        const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/estado?usuarioId=${usuarioId}`);
        if (response.ok) {
          const data = await response.json();
          setCajaAbierta(data.abierta); 
        }
      } catch (error) {
        console.error("Error de conexión con el servidor:", error);
      } finally {
        setCargandoCaja(false);
      }
    };
    verificarEstadoCaja();
  }, [usuarioId]); // ✨ Dependencia añadida

  useEffect(() => {
    const handleClickAfuera = (event: MouseEvent) => {
      if (buscadorRef.current && !buscadorRef.current.contains(event.target as Node)){
        setMostrarSugerencias(false);
      }
      if (menuRef.current && !menuRef.current.contains(event.target as Node)){
        setMenuAbierto(false);
      }
    };
    document.addEventListener("mousedown", handleClickAfuera);
    return () => document.removeEventListener("mousedown", handleClickAfuera);
  }, []);

  // ✨ NUEVO: ESCUCHADOR GLOBAL DE LECTOR DE CÓDIGO DE BARRAS
  useEffect(() => {
    let barcodeBuffer = '';
    let typingTimer: ReturnType<typeof setTimeout>;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // 1. Ignorar si el usuario está enfocado en algún input (buscador, montos, etc)
      //    para no interferir con su escritura manual.
      const activeTag = document.activeElement?.tagName.toUpperCase();
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      // 2. Si presiona Enter y tenemos algo en el buffer, procesamos el código
      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          e.preventDefault();
          procesarCodigoEscaneado(barcodeBuffer);
          barcodeBuffer = ''; // Limpiar después de leer
        }
        return;
      }

      // 3. Capturar las teclas normales
      if (e.key.length === 1) {
        barcodeBuffer += e.key;

        // Los lectores físicos disparan teclas en milisegundos. 
        // Si pasa más de 100ms, asumimos que fue un humano tocando teclas por error y limpiamos.
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
          barcodeBuffer = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      clearTimeout(typingTimer);
    };
  }, [productos, carrito]); // Se actualiza si cambian los productos o el carrito

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoApertura.trim() === '') return;
    
    setCargandoCaja(true);
    try {
      // ✨ ACTUALIZADO
      const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/abrir?usuarioId=${usuarioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoInicial: Number(montoApertura) })
      });
      if (!response.ok) throw new Error(await response.text() || 'Error al abrir caja');
      setCajaAbierta(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Swal.fire('Error', 'No se pudo abrir la caja: ' + errorMessage, 'error');
    } finally {
      setCargandoCaja(false);
    }
  };

  const handleCerrarCaja = async () => {
    setMenuAbierto(false);
    setCargandoCierre(true);
    
    try {
      // 1. Consultamos el resumen actual para tener los datos del sistema en memoria
      const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/resumen?usuarioId=${usuarioId}`);
      if (!response.ok) throw new Error("No se pudo obtener el resumen del sistema para el cierre");
      
      const data = await response.json();
      setDatosCierreCalculados(data);
      
      // 2. Reseteamos el modal a la Fase 1 (Declaración a ciegas) y lo abrimos
      setEfectivoFisicoDeclarado('');
      setFaseCierre('declaracion');
      setShowModalCierre(true);
      
    } catch (error) {
      Swal.fire('Error', 'No se pudo iniciar el proceso de cierre: ' + (error instanceof Error ? error.message : ''), 'error');
    } finally {
      setCargandoCierre(false);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!montoMovimiento || !motivoMovimiento) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/movimiento?usuarioId=${usuarioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: tipoMovimiento,
          monto: Number(montoMovimiento),
          motivo: motivoMovimiento
        })
      });

      if (!response.ok) throw new Error("Error al registrar el movimiento");
      
      Swal.fire('Registrado', `${tipoMovimiento === 'ingreso' ? 'Ingreso' : 'Retiro'} registrado con éxito.`, 'success');
      setShowModalMovimiento(false);
      setMontoMovimiento('');
      setMotivoMovimiento('');
    } catch (error) {
      Swal.fire('Error', error instanceof Error ? error.message : "Error desconocido", 'error');
    }
  };

  const handleVerResumen = async () => {
    setMenuAbierto(false);
    setShowModalResumen(true);
    setCargandoResumen(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/resumen?usuarioId=${usuarioId}`);
      if (response.ok) {
        const data = await response.json();
        setDatosResumen(data);
      } else {
        throw new Error("No se pudo cargar el resumen");
      }
    } catch {
      console.warn("Usando datos de prueba para el resumen.");
      setDatosResumen({
        fondoInicial: 50000,
        ventasEfectivo: 125000,
        ventasTarjeta: 85000,
        ingresosExtra: 10000,
        retiros: 5000,
        totalEnCaja: 180000 
      });
    } finally {
      setCargandoResumen(false);
    }
  };

  const procesarCodigoEscaneado = (codigo: string) => {
    setBusqueda('');
    setMostrarSugerencias(false);

    const productoEncontrado = productos.find(
      p => p.codigoBarras === codigo || p.id.toString() === codigo
    );
    
    if (productoEncontrado) {
      if (productoEncontrado.esInsumo) {
         Swal.fire('Atención', 'Este producto es un insumo y no se puede vender directamente.', 'warning');
         return;
      }
      agregarAlCarrito(productoEncontrado);
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
      Toast.fire({ icon: 'success', title: 'Agregado al carrito' });
    } else {
      Swal.fire('No encontrado', `Código no registrado: ${codigo}`, 'warning');
    }
  };

  const handleProcesarDeclaracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (efectivoFisicoDeclarado.trim() === '' || Number(efectivoFisicoDeclarado) < 0) return;
    
    // ✨ NUEVO: Alerta de confirmación de punto de no retorno
    const confirmacion = await Swal.fire({
      title: '¿Confirmas este monto?',
      html: `Has declarado que hay <b>$${Number(efectivoFisicoDeclarado).toLocaleString()}</b> en efectivo.<br/><br/><b>No podrás modificar esta cifra</b> después de ver el resultado del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280', // gray-500
      confirmButtonText: 'Sí, estoy seguro',
      cancelButtonText: 'Revisar de nuevo'
    });

    if (confirmacion.isConfirmed) {
      // Solo si confirma, avanzamos a la fase 2 para que vea si cuadró o no
      setFaseCierre('resultado');
    }
  };

// Envía la cuadratura final al backend y cierra el turno definitivamente
const handleConfirmarCierreFinal = async () => {
  if (!datosCierreCalculados) return;

  // ✨ NUEVO: Última advertencia antes de cerrar el turno
  const confirmacion = await Swal.fire({
    title: '¿Cerrar Turno?',
    text: 'Se registrará la cuadratura y se cerrará tu sesión actual.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#6b7280',
    confirmButtonText: 'Sí, Cerrar Caja',
    cancelButtonText: 'Cancelar'
  });

  if (!confirmacion.isConfirmed) return;

  const totalEsperado = datosCierreCalculados.totalEnCaja;
  const fisicoDeclarado = Number(efectivoFisicoDeclarado);
  const diferencia = fisicoDeclarado - totalEsperado;

  setCargandoCaja(true);
  setShowModalCierre(false);

  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/cerrar?usuarioId=${usuarioId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fondoInicial: datosCierreCalculados.fondoInicial,
        ventasEfectivo: datosCierreCalculados.ventasEfectivo,
        ventasTarjeta: datosCierreCalculados.ventasTarjeta,
        ingresosExtra: datosCierreCalculados.ingresosExtra,
        retiros: datosCierreCalculados.retiros,
        totalSistema: totalEsperado,
        totalRealFisico: fisicoDeclarado,
        diferencia: diferencia
      })
    });

    if (!response.ok) throw new Error(await response.text() || 'Error al registrar el cierre en el servidor');
    
    setCajaAbierta(false);
    setMontoApertura('');
    Swal.fire('Turno Finalizado', 'El cierre de caja y la cuadratura han sido registrados con éxito.', 'success');
  } catch (error) {
    Swal.fire('Error al Cerrar', error instanceof Error ? error.message : 'Error desconocido', 'error');
    setShowModalCierre(true);
  } finally {
    setCargandoCaja(false);
  }
};

  const sugerencias = busqueda.trim() === '' 
    ? [] 
    : productos.filter(p => 
        p.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
        p.codigoBarras?.includes(busqueda) ||
        p.id.toString().includes(busqueda)
      ).slice(0, 5);

  if (cargandoCaja) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Sincronizando con el servidor...</p>
      </div>
    );
  }

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

  return (
    <div className='min-h-screen bg-gray-50 flex flex-col items-center p-10 relative'>
      <div className="w-full max-w-6xl flex justify-between items-center mb-8">
        <h1 className='text-4xl font-black text-gray-800 tracking-tight'>Caja / Ventas</h1>
        
        {/* Menú de Caja */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="bg-white border-2 border-gray-200 text-gray-700 hover:bg-gray-50 font-bold py-2 px-4 rounded-xl flex items-center gap-2 shadow-sm"
          >
            ⚙️ Opciones de Caja
          </button>
          {menuAbierto && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-20">
              <button onClick={() => { setTipoMovimiento('ingreso'); setShowModalMovimiento(true); setMenuAbierto(false); }} className="w-full text-left px-4 py-3 hover:bg-blue-50 font-medium text-gray-700 border-b">💰 Ingreso de Dinero</button>
              <button onClick={() => { setTipoMovimiento('retiro'); setShowModalMovimiento(true); setMenuAbierto(false); }} className="w-full text-left px-4 py-3 hover:bg-red-50 font-medium text-gray-700 border-b">💸 Retiro de Dinero</button>
              <button onClick={handleVerResumen} className="w-full text-left px-4 py-3 hover:bg-gray-50 font-medium text-gray-700 border-b">📊 Ver Resumen</button>
              <button onClick={handleCerrarCaja} className="w-full text-left px-4 py-3 bg-red-600 hover:bg-red-700 text-white font-bold">🔒 Cerrar Turno</button>
            </div>
          )}
        </div>
      </div>

      <div className='w-full max-w-6xl mb-6 flex gap-4'>
        <div ref={buscadorRef} className='flex-1 relative'>
          <input 
            type="text"
            placeholder='🔍 Buscar producto o pistolear código...'
            className='w-full p-4 rounded-xl border border-gray-300 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all text-lg'
            value={busqueda}
            onFocus={()=> setMostrarSugerencias(true)}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setMostrarSugerencias(true);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                if (busqueda.trim() !== '') procesarCodigoEscaneado(busqueda.trim());
              }
            }}
          />
          {mostrarSugerencias && sugerencias.length > 0 && (
            <ul className='absolute z-10 w-full bg-white mt-1 border border-gray-200 rounded-xl shadow-2xl overflow-hidden'>
              {sugerencias.map(p => (
                <li 
                  key={p.id} 
                  className={`p-4 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 flex justify-between ${p.esInsumo ? 'opacity-50' : ''}`}
                  onClick={() => { 
                    if(!p.esInsumo) procesarCodigoEscaneado(p.codigoBarras || p.id.toString()); 
                  }}
                >
                  <span className="font-medium text-gray-700">{p.descripcion} {p.esInsumo && '(Insumo)'}</span>
                  <span className="font-bold text-blue-600">${p.precio}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <button 
          onClick={() => setMostrarCamara(true)}
          className="bg-gray-800 hover:bg-gray-900 text-white px-6 rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          📷 <span className="hidden sm:inline">Escanear</span>
        </button>
      </div>

      {/* Grid del Carrito y Totales */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lista del Carrito */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border p-6 min-h-100">
          <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-700">Detalle de Venta</h2>
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-gray-400">
              <span className="text-6xl mb-4">🛒</span>
              <p>El carrito está vacío</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
              {carrito.map((item: ItemCarrito) => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800">{item.descripcion}</h3>
                    <p className="text-sm text-gray-500">${item.precio} c/u</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center bg-white border rounded-lg overflow-hidden shadow-sm">
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold">-</button>
                      <span className="w-10 text-center font-bold">{item.cantidad}</span>
                      <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200 font-bold">+</button>
                    </div>
                    <span className="font-black w-24 text-right">${item.subtotal}</span>
                    <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-400 hover:text-red-600 font-black p-2 rounded-lg bg-red-50">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel de Totales */}
        <div className="bg-white rounded-2xl shadow-sm border p-6 flex flex-col h-fit">
          <h2 className="text-xl font-bold mb-4 border-b pb-2 text-gray-700">Resumen</h2>
          <div className="space-y-4 mb-8 flex-1">
            <div className="flex justify-between text-gray-500 font-medium">
              <span>Neto</span>
              <span>${neto.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-gray-500 font-medium">
              <span>IVA (19%)</span>
              <span>${iva.toLocaleString()}</span>
            </div>
            <div className="border-t pt-4 mt-4">
              <div className="flex justify-between items-center text-2xl font-black text-gray-800">
                <span>TOTAL</span>
                <span className="text-blue-600">${totalBruto.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <button 
            disabled={carrito.length === 0}
            onClick={() => setShowModalPago(true)}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black py-4 rounded-xl shadow-lg transition-colors text-xl"
          >
            IR A PAGAR
          </button>
        </div>
      </div>

      {/* Modal de Pago */}
      {showModalPago && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className='w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl'>
            <h2 className='text-3xl font-black mb-6 text-center text-gray-800'>Completar Pago</h2>
            <div className="text-center mb-8">
              <span className="block text-gray-500 mb-1">Monto a cobrar</span>
              <span className="text-5xl font-black text-blue-600">${totalBruto.toLocaleString()}</span>
            </div>
            
            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button 
                onClick={() => { setMetodoPago('EFECTIVO'); setProveedorTarjeta(null); }}
                className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${metodoPago === 'EFECTIVO' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                💵 Efectivo
              </button>
              <button 
                onClick={() => setMetodoPago('TARJETA')}
                className={`py-4 rounded-xl border-2 font-bold text-lg transition-all ${metodoPago === 'TARJETA' ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                💳 Tarjeta
              </button>
            </div>

            {/* Selector de Máquina (Solo si es tarjeta) */}
            {metodoPago === 'TARJETA' && (
              <div className="mb-6 animate-fadeIn">
                <label className="block text-sm font-bold text-gray-700 mb-3">Selecciona la terminal:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setProveedorTarjeta('GETNET')}
                    className={`py-3 rounded-lg border-2 font-bold transition-all ${proveedorTarjeta === 'GETNET' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'}`}
                  >
                    Getnet
                  </button>
                  <button 
                    onClick={() => setProveedorTarjeta('MERCADOPAGO')}
                    className={`py-3 rounded-lg border-2 font-bold transition-all ${proveedorTarjeta === 'MERCADOPAGO' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 text-gray-500'}`}
                  >
                    Mercado Pago
                  </button>
                  <button 
                    type="button"
                    className={`p-2 border rounded ${proveedorTarjeta === 'TRANSBANK' ? 'bg-blue-100 border-blue-500' : 'bg-white'}`}
                    onClick={() => setProveedorTarjeta('TRANSBANK')}
                  >
                    Transbank
                  </button>
                </div>
              </div>
            )}

            {metodoPago === 'EFECTIVO' && (
              <div className="mb-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">¿Con cuánto paga el cliente?</label>
                <input 
                  type="number"
                  placeholder="Ej: 20000"
                  className="w-full p-4 rounded-xl border-2 border-gray-200 focus:border-blue-500 outline-none text-xl font-mono"
                  value={pagaCon || ''}
                  onChange={(e) => setPagaCon(Number(e.target.value))}
                />
                {pagaCon >= totalBruto && (
                  <div className="mt-4 p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                    <span className="block text-sm font-bold text-green-700 mb-1">Vuelto a entregar</span>
                    <span className="text-3xl font-black text-green-600">${(pagaCon - totalBruto).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={confirmarVentaFinal}
              disabled={metodoPago === 'EFECTIVO' && (pagaCon < totalBruto || !pagaCon)}
              className="w-full bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-black py-4 rounded-xl shadow-lg transition-colors text-lg mb-3"
            >
              CONFIRMAR VENTA
            </button>
            <button 
              onClick={() => { setShowModalPago(false); setPagaCon(0); }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors"
            >
              CANCELAR
            </button>
          </div>
        </div>
      )}

      {/* Modal Movimiento de Caja */}
      {showModalMovimiento && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className='w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl'>
            <h2 className={`text-2xl font-black mb-6 ${tipoMovimiento === 'ingreso' ? 'text-blue-600' : 'text-red-600'}`}>
              {tipoMovimiento === 'ingreso' ? '💰 Ingreso de Dinero' : '💸 Retiro de Dinero'}
            </h2>
            <form onSubmit={handleRegistrarMovimiento} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Monto ($)</label>
                <input required type="number" min="1" className="w-full p-4 rounded-xl border border-gray-300 outline-none text-lg" value={montoMovimiento} onChange={(e) => setMontoMovimiento(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Motivo / Descripción</label>
                <input required type="text" placeholder="Ej: Pago a proveedor" className="w-full p-4 rounded-xl border border-gray-300 outline-none text-lg" value={motivoMovimiento} onChange={(e) => setMotivoMovimiento(e.target.value)} />
              </div>
              <button type="submit" className={`w-full text-white font-black py-4 rounded-xl shadow-lg mt-4 ${tipoMovimiento === 'ingreso' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}>
                REGISTRAR {tipoMovimiento.toUpperCase()}
              </button>
              <button type="button" onClick={() => setShowModalMovimiento(false)} className="w-full bg-gray-100 text-gray-600 font-bold py-3 rounded-xl mt-2">CANCELAR</button>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Cierre de Caja y Cuadratura a Ciegas */}
      {showModalCierre && datosCierreCalculados && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl border-t-8 border-red-600">
            
            {/* ================= FASE 1: DECLARACIÓN A CIEGAS ================= */}
            {faseCierre === 'declaracion' && (
              <>
                <h2 className="text-2xl font-black mb-2 text-gray-800 text-center">🔒 Cierre de Turno</h2>
                <p className="text-gray-500 text-center mb-6 text-sm">
                  Por seguridad, realiza el conteo del dinero físico en el cajón antes de ver los datos del sistema.
                </p>
                
                <form onSubmit={handleProcesarDeclaracion} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2 text-center">
                      ¿Cuánto EFECTIVO REAL tienes en caja en este momento?
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xl">$</span>
                      <input 
                        type="number"
                        required
                        min="0"
                        autoFocus
                        placeholder="Ej: 180000"
                        className="w-full pl-10 p-4 rounded-xl border-2 border-gray-200 focus:border-red-500 focus:ring-0 outline-none text-2xl font-mono text-center font-bold"
                        value={efectivoFisicoDeclarado}
                        onChange={(e) => setEfectivoFisicoDeclarado(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-colors text-lg uppercase tracking-wider"
                  >
                    Calcular Cuadratura
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModalCierre(false)}
                    className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold py-3 rounded-xl transition-colors"
                  >
                    Volver a Ventas
                  </button>
                </form>
              </>
            )}

            {/* ================= FASE 2: RESUMEN DE CUADRATURA ================= */}
            {faseCierre === 'resultado' && (
              <>
                <h2 className="text-2xl font-black mb-4 text-gray-800 border-b pb-2 text-center">📊 Resultado de Cuadratura</h2>
                
                <div className="space-y-3 font-medium text-sm text-gray-600">
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span>(+) Fondo de Apertura:</span>
                    <span className="font-bold text-gray-800">${datosCierreCalculados.fondoInicial.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span>(+) Ventas Efectivo:</span>
                    <span className="font-bold text-gray-800">${datosCierreCalculados.ventasEfectivo.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span>(+) Ingresos Extra:</span>
                    <span className="font-bold text-blue-600">+ ${datosCierreCalculados.ingresosExtra.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-gray-50 pb-1">
                    <span>(-) Retiros de Efectivo:</span>
                    <span className="font-bold text-red-500">- ${datosCierreCalculados.retiros.toLocaleString()}</span>
                  </div>

                  {/* Total Esperado por el Sistema */}
                  <div className="flex justify-between bg-gray-50 p-3 rounded-xl border border-gray-100 my-2 text-base">
                    <span className="font-bold text-gray-700">Total Esperado en Sistema:</span>
                    <span className="font-black text-gray-900">${datosCierreCalculados.totalEnCaja.toLocaleString()}</span>
                  </div>

                  {/* Declarado por el cajero */}
                  <div className="flex justify-between bg-blue-50 p-3 rounded-xl border border-blue-100 text-base">
                    <span className="font-bold text-blue-900">Total Físico Declarado:</span>
                    <span className="font-black text-blue-700">${Number(efectivoFisicoDeclarado).toLocaleString()}</span>
                  </div>

                  {/* Cálculo de la Diferencia (Sobrante o Faltante) */}
                  {(() => {
                    const dif = Number(efectivoFisicoDeclarado) - datosCierreCalculados.totalEnCaja;
                    if (dif === 0) {
                      return (
                        <div className="bg-green-100 text-green-800 p-4 rounded-xl border border-green-200 text-center font-black text-base">
                          ✅ ¡Caja Cuadrada Perfectamente!
                        </div>
                      );
                    } else if (dif > 0) {
                      return (
                        <div className="bg-emerald-50 text-emerald-800 p-3 rounded-xl border border-emerald-200 flex justify-between items-center text-base">
                          <span className="font-bold">⚠️ Sobrante en Caja:</span>
                          <span className="font-black text-emerald-600">+ ${dif.toLocaleString()}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-200 flex justify-between items-center text-base">
                          <span className="font-bold">🚨 Faltante en Caja:</span>
                          <span className="font-black text-rose-600">${dif.toLocaleString()}</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                <div className="mt-6 space-y-2">
                  <button 
                    onClick={handleConfirmarCierreFinal}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-black py-4 rounded-xl shadow-lg transition-colors text-lg uppercase tracking-wider"
                  >
                    Confirmar y Cerrar Turno
                  </button>
                  {/* ELIMINAMOS EL BOTÓN DE "Corrige monto ingresado" */}
                  <p className="text-center text-xs text-gray-500 mt-2">
                    * El monto declarado ya ha sido bloqueado y no puede modificarse.
                  </p>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* Modal Resumen de Caja */}
      {showModalResumen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className='w-full max-w-md bg-white p-8 rounded-2xl shadow-2xl'>
            <h2 className='text-2xl font-black mb-6 text-gray-800 border-b pb-2'>📊 Resumen de Turno</h2>
            
            {cargandoResumen ? (
              <div className="py-8 text-center text-gray-500">Cargando...</div>
            ) : datosResumen ? (
              <div className="space-y-2">
                
                {/* --- SECCIÓN EFECTIVO (Cajón) --- */}
                <h3 className="font-bold text-gray-700 mb-3 mt-2 text-sm uppercase tracking-wider">💵 Flujo de Efectivo</h3>
                
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Fondo Inicial:</span>
                  <span className="font-bold">${datosResumen.fondoInicial.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Ventas en Efectivo:</span>
                  <span className="font-bold text-green-600">+ ${datosResumen.ventasEfectivo.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Ingresos Extra:</span>
                  <span className="font-bold text-blue-600">+ ${datosResumen.ingresosExtra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Retiros:</span>
                  <span className="font-bold text-red-600">- ${datosResumen.retiros.toLocaleString()}</span>
                </div>
                
                {/* Total Físico en Caja */}
                <div className="flex justify-between border-t-2 border-gray-800 pt-3 mt-3 mb-6">
                  <span className="text-lg font-black text-gray-800">Efectivo en Caja:</span>
                  <span className="text-2xl font-black text-gray-800">${datosResumen.totalEnCaja.toLocaleString()}</span>
                </div>

                {/* --- SECCIÓN TARJETAS Y TOTALES --- */}
                <h3 className="font-bold text-gray-700 mb-3 text-sm uppercase tracking-wider mt-6">💳 Tarjetas y Totales</h3>
                
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Ventas con Tarjeta:</span>
                  <span className="font-bold text-indigo-600">+ ${datosResumen.ventasTarjeta.toLocaleString()}</span>
                </div>

                {/* Gran Total Vendido (Efectivo + Tarjeta) */}
                <div className="flex justify-between bg-indigo-50 p-4 rounded-xl border border-indigo-100 mt-4">
                  <span className="text-sm font-black text-indigo-900 flex items-center">
                    TOTAL VENDIDO HOY
                  </span>
                  <span className="text-xl font-black text-indigo-700">
                    ${(datosResumen.ventasEfectivo + datosResumen.ventasTarjeta).toLocaleString()}
                  </span>
                </div>

              </div>
            ) : null}
            
            <button 
              onClick={() => setShowModalResumen(false)} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg mt-8 transition-colors"
            >
              CERRAR RESUMEN
            </button>
          </div>
        </div>
      )}

      {mostrarCamara && (
        <LectorCamara 
          onScan={procesarCodigoEscaneado} 
          onClose={() => setMostrarCamara(false)} 
        />
      )}
    </div>
  );
};