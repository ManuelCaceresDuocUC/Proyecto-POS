import { useEffect, useState } from "react";



export interface VentaDetalle {
    id: number;
    cantidad: number;
    precioUnitario: number;
    producto: {
        descripcion: string;
        precio: number;
    };
}

export interface Movimiento { 
    id: number;
    total: number;
    metodoPago: string;
    fechaHora: string;
    detalles: VentaDetalle[];
}

export const useMovimiento = () => {
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const API_URL = `${import.meta.env.VITE_API_URL}/movimientos`;

    // Recibimos las fechas opcionales
    const cargarMovimientos = async (fechaInicio?: string, fechaFin?: string) => {
        try {
            setLoading(true);
            
            // Construimos la URL con los parámetros si existen
            let url = API_URL;
            if (fechaInicio) {
                url += `?fechaInicio=${fechaInicio}`;
                if (fechaFin) {
                    url += `&fechaFin=${fechaFin}`;
                }
            }

            const respuesta = await fetch(url);
            if (!respuesta.ok) throw new Error("Error en la respuesta del servidor");
            
            const datos = await respuesta.json();
            setMovimientos(datos);
        } catch (err) {
            console.log(err);
            setError("Error al procesar los datos del servidor");
        } finally {
            setLoading(false);
        }
    };

    // Al montar el componente, se llama sin parámetros (el backend asumirá que es HOY)
    useEffect(() => {
        cargarMovimientos();
    }, []);

    return { cargarMovimientos, movimientos, loading, error, setError };
}