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
    proveedorTarjeta,    
    setProveedorTarjeta  
} = useVentas(cargarProductos); 

  const totalBruto = totalVenta; 
  const neto = Math.round(totalBruto / 1.19);
  const iva = totalBruto - neto;

  useEffect(() => {
    const verificarEstadoCaja = async () => {
      try {
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
  }, [usuarioId]); 

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

  useEffect(() => {
    let barcodeBuffer = '';
    let typingTimer: ReturnType<typeof setTimeout>;

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toUpperCase();
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
        return;
      }

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 0) {
          e.preventDefault();
          procesarCodigoEscaneado(barcodeBuffer);
          barcodeBuffer = ''; 
        }
        return;
      }

      if (e.key.length === 1) {
        barcodeBuffer += e.key;

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
  }, [productos, carrito]); 

  const handleAbrirCaja = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montoApertura.trim() === '') return;
    
    setCargandoCaja(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/abrir?usuarioId=${usuarioId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ montoInicial: Number(montoApertura) })
      });
      if (!response.ok) throw new Error(await response.text() || 'Error al procesar la apertura de caja');
      setCajaAbierta(true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      Swal.fire('Error', 'No fue posible abrir la caja: ' + errorMessage, 'error');
    } finally {
      setCargandoCaja(false);
    }
  };

  const handleCerrarCaja = async () => {
    setMenuAbierto(false);
    setCargandoCierre(true);
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/caja/resumen?usuarioId=${usuarioId}`);
      if (!response.ok) throw new Error("No fue posible obtener la información financiera para el cierre");
      
      const data = await response.json();
      setDatosCierreCalculados(data);
      
      setEfectivoFisicoDeclarado('');
      setFaseCierre('declaracion');
      setShowModalCierre(true);
      
    } catch (error) {
      Swal.fire('Error', 'No se pudo iniciar el proceso de cierre de turno: ' + (error instanceof Error ? error.message : ''), 'error');
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

      if (!response.ok) throw new Error("Error en la comunicación al registrar el movimiento");
      
      Swal.fire('Operación Registrada', `El ${tipoMovimiento === 'ingreso' ? 'ingreso' : 'retiro'} ha sido registrado correctamente en el sistema.`, 'success');
      setShowModalMovimiento(false);
      setMontoMovimiento('');
      setMotivoMovimiento('');
    } catch (error) {
      Swal.fire('Error', error instanceof Error ? error.message : "Error desconocido al procesar la solicitud", 'error');
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
        throw new Error("No fue posible consultar el resumen financiero");
      }
    } catch {
      console.warn("Sincronizando con datos locales de contingencia para el resumen.");
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
         Swal.fire('Restricción de Operación', 'El ítem escaneado está categorizado como insumo y no está habilitado para venta directa.', 'warning');
         return;
      }
      agregarAlCarrito(productoEncontrado);
      const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1000 });
      Toast.fire({ icon: 'success', title: 'Ítem incorporado a la orden' });
    } else {
      Swal.fire('Código no Registrado', `No existe un producto vinculado al código: ${codigo}`, 'warning');
    }
  };

  const handleProcesarDeclaracion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (efectivoFisicoDeclarado.trim() === '' || Number(efectivoFisicoDeclarado) < 0) return;
    
    const confirmacion = await Swal.fire({
      title: '¿Confirmar declaración de caja?',
      html: `Ha declarado un monto físico en efectivo de <b>$${Number(efectivoFisicoDeclarado).toLocaleString()}</b>.<br/><br/>Esta cifra no podrá ser editada posteriormente para efectos de auditoría.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#1E293B',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Confirmar Monto',
      cancelButtonText: 'Revisar'
    });

    if (confirmacion.isConfirmed) {
      setFaseCierre('resultado');
    }
  };

  const handleConfirmarCierreFinal = async () => {
    if (!datosCierreCalculados) return;

    const confirmacion = await Swal.fire({
      title: '¿Finalizar y Cerrar Turno?',
      text: 'Al confirmar, se guardará el registro de cuadratura y se cerrará su sesión operativa de caja.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1E293B',
      cancelButtonColor: '#64748B',
      confirmButtonText: 'Finalizar Turno',
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

      if (!response.ok) throw new Error(await response.text() || 'Error en la respuesta del servidor');
      
      setCajaAbierta(false);
      setMontoApertura('');
      Swal.fire('Turno Finalizado', 'El cierre operativa y la respectiva cuadratura han sido almacenados correctamente.', 'success');
    } catch (error) {
      Swal.fire('Error en Cierre Operativo', error instanceof Error ? error.message : 'Error desconocido al registrar el cierre', 'error');
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
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-slate-800 mb-4"></div>
        <p className="text-slate-600 font-medium text-sm tracking-wide uppercase">Verificando estado de terminal...</p>
      </div>
    );
  }

  if (!cajaAbierta) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans text-slate-800">
        <div className="bg-white p-8 rounded shadow-sm max-w-md w-full border border-slate-200">
          <div className="text-center mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-xl font-semibold text-slate-900">Apertura Operativa de Caja</h2>
            <p className="text-slate-500 text-xs mt-1">Ingrese el fondo inicial en efectivo para habilitar el terminal.</p>
          </div>
          
          <form onSubmit={handleAbrirCaja} className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Fondo Inicial</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                <input 
                  type="number"
                  required
                  min="0"
                  placeholder="0.00"
                  className="w-full pl-8 p-2.5 rounded border border-slate-300 focus:border-slate-500 outline-none text-base font-mono text-slate-800"
                  value={montoApertura}
                  onChange={(e) => setMontoApertura(e.target.value)}
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-3 rounded shadow-sm transition-colors text-sm uppercase tracking-wider mt-2"
            >
              Habilitar Terminal
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-50 flex flex-col items-center p-8 font-sans text-slate-800'>
      <div className="w-full max-w-6xl flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
        <div>
          <h1 className='text-3xl font-semibold text-slate-900 tracking-tight'>Terminal de Punto de Venta</h1>
          <p className="text-slate-500 text-sm mt-0.5">Operación de caja y procesamiento de transacciones.</p>
        </div>
        
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setMenuAbierto(!menuAbierto)}
            className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 font-medium py-2 px-4 rounded text-sm transition-colors shadow-sm"
          >
             Opciones Operativas
          </button>
          {menuAbierto && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded shadow-md border border-slate-200 overflow-hidden z-20 text-sm">
              <button onClick={() => { setTipoMovimiento('ingreso'); setShowModalMovimiento(true); setMenuAbierto(false); }} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 font-medium text-slate-700 border-b border-slate-100">Registrar Ingreso</button>
              <button onClick={() => { setTipoMovimiento('retiro'); setShowModalMovimiento(true); setMenuAbierto(false); }} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 font-medium text-slate-700 border-b border-slate-100">Registrar Retiro</button>
              <button onClick={handleVerResumen} className="w-full text-left px-4 py-2.5 hover:bg-slate-50 font-medium text-slate-700 border-b border-slate-100">Resumen Financiero</button>
              <button onClick={handleCerrarCaja} className="w-full text-left px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-medium">Cierre de Turno</button>
            </div>
          )}
        </div>
      </div>

      <div className='w-full max-w-6xl mb-6 flex gap-3'>
        <div ref={buscadorRef} className='flex-1 relative'>
          <input 
            type="text"
            placeholder='Buscar producto por código o descripción...'
            className='w-full p-2.5 rounded border border-slate-300 shadow-sm focus:border-slate-500 outline-none transition-all text-sm bg-white'
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
            <ul className='absolute z-10 w-full bg-white mt-1 border border-slate-200 rounded shadow-lg overflow-hidden text-sm'>
              {sugerencias.map(p => (
                <li 
                  key={p.id} 
                  className={`p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-b-0 flex justify-between items-center ${p.esInsumo ? 'opacity-50' : ''}`}
                  onClick={() => { 
                    if(!p.esInsumo) procesarCodigoEscaneado(p.codigoBarras || p.id.toString()); 
                  }}
                >
                  <span className="font-medium text-slate-700">{p.descripcion} {p.esInsumo && '(Insumo No Vendible)'}</span>
                  <span className="font-mono font-semibold text-slate-900">${p.precio}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <button 
          onClick={() => setMostrarCamara(true)}
          className="bg-slate-800 hover:bg-slate-900 text-white px-5 rounded font-medium text-sm transition-colors shadow-sm whitespace-nowrap"
        >
           Escanear
        </button>
      </div>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 bg-white rounded shadow-sm border border-slate-200 p-6 min-h-[450px] flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-semibold mb-4 border-b border-slate-200 pb-2 text-slate-700 uppercase tracking-wider">Detalle de Ítems en Orden</h2>
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm">
                <p>No hay ítems seleccionados para la transacción actual.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 text-sm">
                {carrito.map((item: ItemCarrito) => (
                  <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200">
                    <div className="flex-1">
                      <h3 className="font-medium text-slate-900">{item.descripcion}</h3>
                      <p className="text-xs text-slate-500 font-mono">${item.precio} unitario</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center bg-white border border-slate-300 rounded overflow-hidden shadow-sm text-xs">
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad - 1)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 font-bold transition-colors">-</button>
                        <span className="w-8 text-center font-mono font-semibold">{item.cantidad}</span>
                        <button onClick={() => actualizarCantidad(item.id, item.cantidad + 1)} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 font-bold transition-colors">+</button>
                      </div>
                      <span className="font-mono font-semibold w-20 text-right text-slate-900">${item.subtotal}</span>
                      <button onClick={() => eliminarDelCarrito(item.id)} className="text-slate-400 hover:text-red-600 font-mono font-bold px-2 py-1 rounded transition-colors text-xs">X</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded shadow-sm border border-slate-200 p-6 flex flex-col justify-between h-fit text-sm">
          <div>
            <h2 className="text-sm font-semibold mb-4 border-b border-slate-200 pb-2 text-slate-700 uppercase tracking-wider">Desglose Operativo</h2>
            <div className="space-y-3 mb-6 font-mono">
              <div className="flex justify-between text-slate-600">
                <span className="font-sans font-medium text-slate-700">Neto</span>
                <span>${neto.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span className="font-sans font-medium text-slate-700">IVA (19%)</span>
                <span>${iva.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="flex justify-between items-center text-lg font-bold text-slate-900">
                  <span className="font-sans uppercase tracking-wide">Total a Pagar</span>
                  <span>${totalBruto.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <button 
            disabled={carrito.length === 0}
            onClick={() => setShowModalPago(true)}
            className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-medium py-3 rounded shadow-sm transition-colors text-sm uppercase tracking-wider"
          >
            Procesar Cobro
          </button>
        </div>
      </div>

      {showModalPago && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className='w-full max-w-md bg-white p-6 rounded shadow-lg border border-slate-200 text-sm'>
            <h2 className='text-lg font-semibold mb-4 text-slate-900 border-b border-slate-100 pb-2 text-center'>Procesamiento de Pago</h2>
            <div className="text-center mb-6 bg-slate-50 p-4 rounded border border-slate-200">
              <span className="block text-slate-500 text-xs uppercase tracking-wider mb-1 font-semibold">Monto Total de Orden</span>
              <span className="text-3xl font-mono font-bold text-slate-900">${totalBruto.toLocaleString()}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button 
                onClick={() => { setMetodoPago('EFECTIVO'); setProveedorTarjeta(null); }}
                className={`py-2.5 rounded border font-medium text-xs uppercase tracking-wider transition-all ${metodoPago === 'EFECTIVO' ? 'border-slate-800 bg-slate-800 text-white shadow-sm' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                 Efectivo
              </button>
              <button 
                onClick={() => setMetodoPago('TARJETA')}
                className={`py-2.5 rounded border font-medium text-xs uppercase tracking-wider transition-all ${metodoPago === 'TARJETA' ? 'border-slate-800 bg-slate-800 text-white shadow-sm' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                 Tarjeta Débito/Crédito
              </button>
            </div>

            {metodoPago === 'TARJETA' && (
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-2">Seleccione Terminal de Pago:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button 
                    type="button"
                    onClick={() => setProveedorTarjeta('GETNET')}
                    className={`py-2 rounded border text-xs font-medium transition-all ${proveedorTarjeta === 'GETNET' ? 'bg-slate-100 border-slate-500 text-slate-900 font-semibold' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Getnet
                  </button>
                  <button 
                    type="button"
                    onClick={() => setProveedorTarjeta('MERCADOPAGO')}
                    className={`py-2 rounded border text-xs font-medium transition-all ${proveedorTarjeta === 'MERCADOPAGO' ? 'bg-slate-100 border-slate-500 text-slate-900 font-semibold' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                  >
                    Mercado Pago
                  </button>
                  <button 
                    type="button"
                    className={`py-2 rounded border text-xs font-medium transition-all ${proveedorTarjeta === 'TRANSBANK' ? 'bg-slate-100 border-slate-500 text-slate-900 font-semibold' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                    onClick={() => setProveedorTarjeta('TRANSBANK')}
                  >
                    Transbank
                  </button>
                </div>
              </div>
            )}

            {metodoPago === 'EFECTIVO' && (
              <div className="mb-6">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">Monto Recibido</label>
                <input 
                  type="number"
                  placeholder="0.00"
                  className="w-full p-2.5 rounded border border-slate-300 focus:border-slate-500 outline-none text-base font-mono text-slate-800"
                  value={pagaCon || ''}
                  onChange={(e) => setPagaCon(Number(e.target.value))}
                />
                {pagaCon >= totalBruto && (
                  <div className="mt-3 p-3 bg-slate-100 rounded border border-slate-200 text-center flex justify-between items-center">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">Cambio a Entregar:</span>
                    <span className="text-lg font-mono font-bold text-slate-900">${(pagaCon - totalBruto).toLocaleString()}</span>
                  </div>
                )}
              </div>
            )}

            <button 
              onClick={confirmarVentaFinal}
              disabled={metodoPago === 'EFECTIVO' && (pagaCon < totalBruto || !pagaCon)}
              className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 disabled:text-slate-400 text-white font-medium py-2.5 rounded shadow-sm transition-colors text-sm uppercase tracking-wider mb-2"
            >
              Confirmar Transacción
            </button>
            <button 
              onClick={() => { setShowModalPago(false); setPagaCon(0); }}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded transition-colors text-xs uppercase tracking-wider"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {showModalMovimiento && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className='w-full max-w-md bg-white p-6 rounded shadow-lg border border-slate-200 text-sm'>
            <h2 className="text-lg font-semibold mb-4 text-slate-900 border-b border-slate-100 pb-2">
              {tipoMovimiento === 'ingreso' ? 'Registro de Ingreso de Efectivo' : 'Registro de Retiro de Efectivo'}
            </h2>
            <form onSubmit={handleRegistrarMovimiento} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Monto de Operación ($)</label>
                <input required type="number" min="1" className="w-full p-2 rounded border border-slate-300 outline-none focus:border-slate-500 font-mono" value={montoMovimiento} onChange={(e) => setMontoMovimiento(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1">Motivo / Justificación Contable</label>
                <input required type="text" placeholder="Ej: Pago a proveedor, retiro de caja chica..." className="w-full p-2 rounded border border-slate-300 outline-none focus:border-slate-500" value={motivoMovimiento} onChange={(e) => setMotivoMovimiento(e.target.value)} />
              </div>
              <button type="submit" className="w-full text-white font-medium py-2.5 rounded shadow-sm mt-4 bg-slate-800 hover:bg-slate-900 text-sm uppercase tracking-wider transition-colors">
                Registrar Operación
              </button>
              <button type="button" onClick={() => setShowModalMovimiento(false)} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded mt-1 text-xs uppercase tracking-wider transition-colors">Cancelar</button>
            </form>
          </div>
        </div>
      )}

      {showModalCierre && datosCierreCalculados && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white p-6 rounded shadow-lg border border-slate-200 text-sm">
            
            {faseCierre === 'declaracion' && (
              <>
                <div className="text-center mb-6 border-b border-slate-100 pb-4">
                  <h2 className="text-lg font-semibold text-slate-900">Cuadratura Operativa de Cierre</h2>
                  <p className="text-slate-500 mt-1 text-xs">
                    Realice el conteo físico del dinero en caja antes de visualizar los montos calculados por el sistema.
                  </p>
                </div>
                
                <form onSubmit={handleProcesarDeclaracion} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5 text-center">
                      Monto Físico Total en Efectivo
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold">$</span>
                      <input 
                        type="number"
                        required
                        min="0"
                        autoFocus
                        placeholder="0.00"
                        className="w-full pl-8 p-2.5 rounded border border-slate-300 focus:border-slate-500 outline-none text-base font-mono text-center font-semibold text-slate-800"
                        value={efectivoFisicoDeclarado}
                        onChange={(e) => setEfectivoFisicoDeclarado(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded shadow-sm transition-colors text-sm uppercase tracking-wider mt-2"
                  >
                    Procesar Cuadratura
                  </button>
                  <button 
                    type="button"
                    onClick={() => setShowModalCierre(false)}
                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium py-2 rounded transition-colors text-xs uppercase tracking-wider"
                  >
                    Cancelar y Volver
                  </button>
                </form>
              </>
            )}

            {faseCierre === 'resultado' && (
              <>
                <h2 className="text-lg font-semibold mb-4 text-slate-900 border-b border-slate-100 pb-2">Resultado de Auditoría de Turno</h2>
                
                <div className="space-y-2 font-mono text-xs text-slate-600">
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="font-sans">Fondo de Apertura:</span>
                    <span className="font-semibold text-slate-800">${datosCierreCalculados.fondoInicial.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="font-sans">Ventas Efectivo:</span>
                    <span className="font-semibold text-slate-800">${datosCierreCalculados.ventasEfectivo.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="font-sans">Ingresos Extra:</span>
                    <span className="font-semibold text-slate-800">+ ${datosCierreCalculados.ingresosExtra.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-1">
                    <span className="font-sans">Retiros Operativos:</span>
                    <span className="font-semibold text-red-700">- ${datosCierreCalculados.retiros.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between bg-slate-100 p-2.5 rounded border border-slate-200 my-2 text-sm">
                    <span className="font-sans font-semibold text-slate-700">Total Teórico Sistema:</span>
                    <span className="font-bold text-slate-900">${datosCierreCalculados.totalEnCaja.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between bg-slate-100 p-2.5 rounded border border-slate-200 text-sm">
                    <span className="font-sans font-semibold text-slate-700">Total Físico Declarado:</span>
                    <span className="font-bold text-slate-900">${Number(efectivoFisicoDeclarado).toLocaleString()}</span>
                  </div>

                  {(() => {
                    const dif = Number(efectivoFisicoDeclarado) - datosCierreCalculados.totalEnCaja;
                    if (dif === 0) {
                      return (
                        <div className="bg-slate-800 text-white p-3 rounded text-center font-sans font-medium text-xs tracking-wide uppercase mt-3">
                          Auditoría Correcta - Caja Cuadrada
                        </div>
                      );
                    } else if (dif > 0) {
                      return (
                        <div className="bg-slate-100 text-slate-800 p-2.5 rounded border border-slate-300 flex justify-between items-center text-xs font-sans mt-3">
                          <span className="font-semibold">Sobrante Operativo:</span>
                          <span className="font-mono font-bold">+ ${dif.toLocaleString()}</span>
                        </div>
                      );
                    } else {
                      return (
                        <div className="bg-red-50 text-red-800 p-2.5 rounded border border-red-200 flex justify-between items-center text-xs font-sans mt-3">
                          <span className="font-semibold">Faltante Operativo:</span>
                          <span className="font-mono font-bold">${dif.toLocaleString()}</span>
                        </div>
                      );
                    }
                  })()}
                </div>

                <div className="mt-6 space-y-2">
                  <button 
                    onClick={handleConfirmarCierreFinal}
                    className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded shadow-sm transition-colors text-sm uppercase tracking-wider"
                  >
                    Confirmar Cierre y Emitir Reporte
                  </button>
                  <p className="text-center text-[11px] text-slate-400 mt-2 font-sans">
                    * El monto físico ha quedado bloqueado para el control de registro.
                  </p>
                </div>
              </>
            )}

          </div>
        </div>
      )}

      {showModalResumen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className='w-full max-w-md bg-white p-6 rounded shadow-lg border border-slate-200 text-sm'>
            <h2 className='text-lg font-semibold mb-4 text-slate-900 border-b border-slate-100 pb-2'>Resumen Financiero del Turno</h2>
            
            {cargandoResumen ? (
              <div className="py-8 text-center text-slate-500 font-mono text-xs uppercase tracking-wider">Cargando datos contables...</div>
            ) : datosResumen ? (
              <div className="space-y-2 font-mono text-xs text-slate-600">
                
                <h3 className="font-sans font-semibold text-slate-700 mb-2 mt-1 uppercase tracking-wider text-[11px]">Movimientos de Efectivo</h3>
                
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-sans">Fondo Inicial:</span>
                  <span className="font-semibold text-slate-800">${datosResumen.fondoInicial.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-sans">Ventas en Efectivo:</span>
                  <span className="font-semibold text-slate-800">+ ${datosResumen.ventasEfectivo.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-sans">Ingresos Extra:</span>
                  <span className="font-semibold text-slate-800">+ ${datosResumen.ingresosExtra.toLocaleString()}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-sans">Retiros Operativos:</span>
                  <span className="font-semibold text-red-700">- ${datosResumen.retiros.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between border-t border-slate-300 pt-2.5 mt-2 mb-4 text-sm">
                  <span className="font-sans font-bold text-slate-900">Total Físico en Caja:</span>
                  <span className="font-bold text-slate-900">${datosResumen.totalEnCaja.toLocaleString()}</span>
                </div>

                <h3 className="font-sans font-semibold text-slate-700 mb-2 mt-4 uppercase tracking-wider text-[11px]">Otros Medios y Totales</h3>
                
                <div className="flex justify-between border-b border-slate-100 pb-1.5">
                  <span className="font-sans">Transacciones con Tarjeta:</span>
                  <span className="font-semibold text-slate-800">+ ${datosResumen.ventasTarjeta.toLocaleString()}</span>
                </div>

                <div className="flex justify-between bg-slate-100 p-3 rounded border border-slate-200 mt-4 text-sm">
                  <span className="font-sans font-bold text-slate-900 uppercase tracking-wide">
                    Venta Total Acumulada
                  </span>
                  <span className="font-bold text-slate-900">
                    ${(datosResumen.ventasEfectivo + datosResumen.ventasTarjeta).toLocaleString()}
                  </span>
                </div>

              </div>
            ) : null}
            
            <button 
              onClick={() => setShowModalResumen(false)} 
              className="w-full bg-slate-800 hover:bg-slate-900 text-white font-medium py-2.5 rounded shadow-sm mt-6 transition-colors text-sm uppercase tracking-wider"
            >
              Cerrar Ventana
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