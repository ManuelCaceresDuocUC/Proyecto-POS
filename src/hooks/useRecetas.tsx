import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export interface Receta {
    id?: number;
    productoPadreId: number;
    // 🟢 CORRECCIÓN 1: Agregamos variaciones de nombres comunes que Spring Boot suele enviar al mapear el JSON
    productoPadreNombre?: string; 
    productoNombre?: string; 
    insumoId: number;        
    insumoNombre?: string;
    cantidadUsada: number;   
    // Por si tu backend devuelve el objeto completo embebido:
    insumo?: {
        id: number;
        descripcion: string;
    };
    producto?: {
        id: number;
        descripcion: string;
    };
}

export const useRecetas = () => {
    const [recetas, setRecetas] = useState<Receta[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const API_URL = `${import.meta.env.VITE_API_URL}/recetas`;

    const cargarRecetas = async () => {
        try {
            setLoading(true);
            const respuesta = await fetch(API_URL);
            if (!respuesta.ok) throw new Error("Error al conectar con el servidor");
            const datos = await respuesta.json();
            
            console.log("Recetas recibidas del backend:", datos); // Te ayudará a inspeccionar los nombres reales de las columnas en F12
            setRecetas(datos);
        } catch (err: unknown) {
            const mensaje = err instanceof Error ? err.message : "Error desconocido";
            setError(mensaje);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarRecetas();
    }, []);

    const eliminarReceta = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Eliminar vínculo?',
            text: "Se borrará la relación de este insumo con el producto.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if (!res.ok) throw new Error("Error en el servidor");

                setRecetas(recetas.filter(r => r.id !== id));
                Swal.fire('Eliminado', 'La receta ha sido actualizada.', 'success');
            } catch (err) {
                console.error("Error al eliminar:", err);
                const mensajeError = err instanceof Error ? err.message : 'Ocurrió un problema inesperado';

                Swal.fire('Error', mensajeError, 'error');
            }
        }
    };

    const agregarReceta = async (nuevo: Omit<Receta, 'id' | 'productoPadreNombre' | 'insumoNombre'>) => {
        try {
            const res = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nuevo)
            });
            if (!res.ok) throw new Error("Error al guardar");
            
            const recetaGuardada = await res.json();
            setRecetas([...recetas, recetaGuardada]);
            Swal.fire('Éxito', 'Insumo vinculado correctamente', 'success');
        } catch (err) {
            console.error("Error al agregar:", err);
            const mensajeError = err instanceof Error ? err.message : 'Ocurrió un problema inesperado';

            Swal.fire('Error', mensajeError, 'error');
        }
    };

    const editarReceta = async (id: number, datosActualizados: Partial<Receta>) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });

            if (!res.ok) throw new Error("Error al actualizar");

            const recetaServidor = await res.json();
            setRecetas(prev => prev.map(r => r.id === id ? recetaServidor : r));

            Swal.fire('Actualizado', 'Los cambios han sido guardados', 'success');
        } catch (err: unknown) {
            console.error("Error al actualizar:", err); 
            const mensajeError = err instanceof Error ? err.message : 'Ocurrió un problema inesperado';

            Swal.fire('Error', mensajeError, 'error');
        }
    };

    // 🟢 CORRECCIÓN 2: Exportamos "cargarRecetas" explícitamente junto con "refrescar"
    return {
        recetas,
        loading,
        error,
        eliminarReceta,
        agregarReceta,
        editarReceta,
        cargarRecetas, // <-- Ahora sí podemos usar { cargarRecetas } en Recetas.tsx sin errores
        refrescar: cargarRecetas 
    };
};