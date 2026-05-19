import { useState } from "react";
import Swal from "sweetalert2";

interface Producto {
    id: number;
    descripcion: string;
    precio: number;
    stock: number;
}

interface ProductoCarrito extends Producto {
    cantidadSeleccionada: number;
}

// 👉 CAMBIO AQUI: Recibe una función opcional para recargar el stock
export const useVentas = (onVentaExitosa?: () => void) => {
    const [metodoPago, setMetodoPago] = useState("");
    const [showModalPago, setShowModalPago] = useState(false);
    const [busqueda, setBusqueda] = useState('');

    const [carrito, setCarrito] = useState<ProductoCarrito[]>([])
    
    const agregarAlCarrito = (producto: Producto) => {
        setCarrito( prev =>{
            const existe = prev.find( p => p.id === producto.id);
            if (existe){
                return prev.map(p => p.id === producto.id ? {...p, cantidadSeleccionada: p.cantidadSeleccionada + 1}:p)
            };
            return [...prev,{...producto,cantidadSeleccionada: 1}];
        });
    };

    const eliminarDelCarrito = (id: number) => {
        setCarrito(prev => prev.filter(p => p.id !== id));
    };

    const actualizarCantidad = (id: number, delta: number) => {
        setCarrito(prev => prev.map(p => {
            if (p.id === id) {
            const nuevaCant = p.cantidadSeleccionada + delta;
            if (nuevaCant >= 1 && nuevaCant <= p.stock) {
                return { ...p, cantidadSeleccionada: nuevaCant };
            }
            }
            return p;
        }));
    };

    const totalVenta = carrito.reduce((acc, p) => acc + (p.precio * p.cantidadSeleccionada), 0);
    
    const vaciarCarrito = () => setCarrito([]);

    const confirmarVentaFinal = async () => {
        if (!metodoPago) return;

        try {
            Swal.fire({
                title: 'Procesando...',
                text: metodoPago === 'tarjeta' ? 'Siga las instrucciones en la maquinita Getnet' : 'Registrando venta',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const datosVenta = {
                monto: Math.round(totalVenta),
                items: carrito.map(p => ({
                    productoId: p.id,
                    cantidad: p.cantidadSeleccionada
                }))
            };

            if (metodoPago === 'tarjeta') {
                // 1. PASO LOCAL: Despertamos al Agente Local en tu PC para que active el POS
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

                // 2. PASO NUBE: Si la maquinita aprobó, ahora sí guardamos la venta en AWS
                const urlAws = `${import.meta.env.VITE_API_URL}/pagos/cobrar`; 
                const resAws = await fetch(urlAws, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosVenta)
                });

                if (!resAws.ok) throw new Error("Cobro exitoso en máquina, pero falló al guardar en la nube");

            } else {
                // PASO EFECTIVO: Va directo a la nube de AWS
                const url = `${import.meta.env.VITE_API_URL}/pagos/efectivo`;
                const res = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(datosVenta)
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

            // 👉 CAMBIO AQUI: Ejecutamos la función para refrescar el stock si nos la enviaron
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
    }
}