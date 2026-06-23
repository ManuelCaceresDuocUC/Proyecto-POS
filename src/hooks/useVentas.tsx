import { useState } from "react";
import Swal from "sweetalert2";

export interface Producto {
  id: number;
  descripcion: string;
  precio: number;
  stock: number;
}

// 1. Interfaz simplificada y unificada
export interface ItemCarrito extends Producto {
  cantidad: number;
  subtotal: number;
}

export const useVentas = (onVentaExitosa?: () => void) => {
  const [metodoPago, setMetodoPago] = useState("");
  const [showModalPago, setShowModalPago] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  
  // 2. El estado ahora usa directamente ItemCarrito[]
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  
  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(p => p.id === producto.id);
      if (existe) {
        return prev.map(p => 
          p.id === producto.id 
            ? { ...p, cantidad: p.cantidad + 1, subtotal: (p.cantidad + 1) * p.precio }
            : p
        );
      }
      // Se inicializa con cantidad 1 y su subtotal
      return [...prev, { ...producto, cantidad: 1, subtotal: producto.precio }];
    });
  };

  const eliminarDelCarrito = (id: number) => {
    setCarrito(prev => prev.filter(p => p.id !== id));
  };

  // 3. FIX: Se cambió 'delta' por 'nuevaCantidad' porque la UI manda el valor total
  const actualizarCantidad = (id: number, nuevaCantidad: number) => {
    setCarrito(prev => prev.map(p => {
      if (p.id === id) {
        if (nuevaCantidad >= 1 && nuevaCantidad <= p.stock) {
          return { ...p, cantidad: nuevaCantidad, subtotal: nuevaCantidad * p.precio };
        }
      }
      return p;
    }));
  };

  // 4. El totalVenta ahora es mucho más fácil de calcular sumando los subtotales
  const totalVenta = carrito.reduce((acc, p) => acc + p.subtotal, 0);
  
  const vaciarCarrito = () => setCarrito([]);

  const confirmarVentaFinal = async () => {
    if (!metodoPago) return;

    try {
      Swal.fire({
        title: 'Procesando...',
        text: metodoPago === 'TARJETA' ? 'Siga las instrucciones en la maquinita Getnet' : 'Registrando venta',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // ✨ NUEVO: Obtenemos el ID del usuario logueado (por defecto 1 si no hay nadie)
      const usuarioIdLogueado = localStorage.getItem('usuarioId') || "1";

      const datosVenta = {
        monto: Math.round(totalVenta),
        usuarioId: Number(usuarioIdLogueado), // ✨ NUEVO: Enviamos el cajero al backend
        items: carrito.map(p => ({
          productoId: p.id,
          cantidad: p.cantidad
        }))
      };

      if (metodoPago === 'TARJETA') {
        // 1. PASO LOCAL
        const resAgente = await fetch('https://mulch-jolt-glamorous.ngrok-free.dev/api/pos/cobrar', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' 
          },
          body: JSON.stringify({ monto: datosVenta.monto })
        });

        const resultadoAgente = await resAgente.json();

        if (!resAgente.ok || resultadoAgente.status !== "APROBADO") {
          throw new Error(resultadoAgente.mensaje || "Pago rechazado por la maquinita Getnet");
        }

        // 2. PASO NUBE
        const urlAws = `${import.meta.env.VITE_API_URL}/pagos/cobrar`; 
        const resAws = await fetch(urlAws, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosVenta) // ✨ Aquí ya va el usuarioId incluido
        });

        if (!resAws.ok) throw new Error("Cobro exitoso en máquina, pero falló al guardar en la nube");

      } else {
        // PASO EFECTIVO
        const url = `${import.meta.env.VITE_API_URL}/pagos/efectivo`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosVenta) // ✨ Aquí ya va el usuarioId incluido
        });

        const resultado = await res.json();
        if (!res.ok) throw new Error(resultado.message || "Error en la transacción en la nube");
      }

      Swal.fire({
        title: '¡Venta Completada!',
        text: 'Registro guardado exitosamente',
        icon: 'success',
        timer: 2000
      });

      setCarrito([]);
      setShowModalPago(false);
      setMetodoPago("");
      setBusqueda("");

      if (onVentaExitosa) {
        onVentaExitosa();
      }

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado";
      Swal.fire('Venta Cancelada', msg, 'error');
    }
  };
  
  return {
    carrito,
    setCarrito,
    agregarAlCarrito,
    eliminarDelCarrito,
    actualizarCantidad,
    totalVenta,
    vaciarCarrito,
    confirmarVentaFinal,
    showModalPago,
    busqueda,
    setBusqueda,
    setShowModalPago,
    metodoPago,
    setMetodoPago
  };
};