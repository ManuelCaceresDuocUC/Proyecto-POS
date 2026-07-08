import { useState } from "react";
import Swal from "sweetalert2";

export interface Producto {
  id: number;
  descripcion: string;
  precio: number;
  stock: number;
}

export interface ItemCarrito extends Producto {
  cantidad: number;
  subtotal: number;
}

export const useVentas = (onVentaExitosa?: () => void) => {
  const [metodoPago, setMetodoPago] = useState("");
  
  // 1️⃣ CAMBIO: Añadimos "TRANSBANK" a los tipos válidos del estado
  const [proveedorTarjeta, setProveedorTarjeta] = useState<"GETNET" | "MERCADOPAGO" | "TRANSBANK" | null>(null);
  
  const [showModalPago, setShowModalPago] = useState(false);
  const [busqueda, setBusqueda] = useState('');
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
      return [...prev, { ...producto, cantidad: 1, subtotal: producto.precio }];
    });
  };

  const eliminarDelCarrito = (id: number) => {
    setCarrito(prev => prev.filter(p => p.id !== id));
  };

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

  const totalVenta = carrito.reduce((acc, p) => acc + p.subtotal, 0);
  const vaciarCarrito = () => setCarrito([]);

  const confirmarVentaFinal = async () => {
    if (!metodoPago) return;

    // 2️⃣ CAMBIO: Actualizamos el mensaje de validación para incluir Transbank
    if (metodoPago === 'TARJETA' && !proveedorTarjeta) {
      Swal.fire('Atención', 'Selecciona la terminal (Getnet, Mercado Pago o Transbank)', 'warning');
      return;
    }

    try {
      Swal.fire({
        title: 'Procesando...',
        text: metodoPago === 'TARJETA' ? `Instrucciones en ${proveedorTarjeta}` : 'Registrando venta',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      const usuarioIdLogueado = localStorage.getItem('usuarioId') || "1";
      const empresaIdLogueada = localStorage.getItem('empresaId') || "1";

      const datosVenta = {
          monto: Math.round(totalVenta),
          usuarioId: Number(usuarioIdLogueado),
          empresaId: Number(empresaIdLogueada), 
          items: carrito.map(p => ({
              productoId: p.id,
              descripcion: p.descripcion, 
              precio: p.precio,
              cantidad: p.cantidad,
              subtotal: p.subtotal
          }))
      };

      let respuestaBackend;

      if (metodoPago === 'TARJETA') {
        // Comunicación con tu Agente Local (Java)
        const resAgente = await fetch('https://mulch-jolt-glamorous.ngrok-free.dev/api/pos/cobrar', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true' 
          },
          // 3️⃣ CAMBIO: Agregamos de manera dinámica el campo 'ticket' para Transbank
          body: JSON.stringify({ 
            monto: datosVenta.monto,
            proveedor: proveedorTarjeta,
            deviceId: proveedorTarjeta === "MERCADOPAGO" ? "POINT-SIMULADO-CHILE-12345" : null,
            ticket: proveedorTarjeta === "TRANSBANK" ? `TKT-${Date.now()}` : null
          })
        });

        const resultadoAgente = await resAgente.json();

        if (!resAgente.ok || resultadoAgente.status !== "APROBADO") {
          throw new Error(resultadoAgente.mensaje || "Pago rechazado por la terminal");
        }

        // Paso a la Nube (AWS)
        const urlAws = `${import.meta.env.VITE_API_URL}/pagos/cobrar`; 
        const resAws = await fetch(urlAws, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosVenta)
        });

        if (!resAws.ok) throw new Error("Fallo al guardar en la nube tras cobro exitoso");
        respuestaBackend = await resAws.json();

      } else {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/pagos/efectivo`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(datosVenta)
        });

        respuestaBackend = await res.json();
        if (!res.ok) throw new Error(respuestaBackend.message || "Error en la nube");
      }

      if (respuestaBackend?.boletaPdf) {
        const linkSource = `data:application/pdf;base64,${respuestaBackend.boletaPdf}`;
        const downloadLink = document.createElement("a");
        downloadLink.href = linkSource;
        downloadLink.download = `Boleta_${Date.now()}.pdf`;
        downloadLink.click();
      }

      Swal.fire({ title: '¡Venta Completada!', icon: 'success', timer: 2000 });

      setCarrito([]);
      setShowModalPago(false);
      setMetodoPago("");
      setProveedorTarjeta(null); 
      setBusqueda("");

      if (onVentaExitosa) onVentaExitosa();

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
    setShowModalPago,
    busqueda,
    setBusqueda,
    metodoPago,
    setMetodoPago,
    proveedorTarjeta,
    setProveedorTarjeta
  };
};