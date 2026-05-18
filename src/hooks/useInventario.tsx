import { useEffect, useState } from "react";
import Swal from "sweetalert2";

export interface Producto {
    id: number;
    codigoBarras?: string;
    descripcion: string;
    precio: number;
    stock: number;
    stockCritico: number;
    esInsumo: boolean;
    unidadMedida: string;
    receta?: IngredienteReceta[];
    }
interface IngredienteParaEnviar {
    insumoId: number;
    cantidad: number;
}
export interface IngredienteReceta {
    id: number;
    cantidadUsada: number;
    insumo: {
        id: number;
        descripcion: string;
        stock: number;
    };
}

export const useInventario = () => {

    const [productos, setProductos] = useState<Producto[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState('');

    const API_URL = `${import.meta.env.VITE_API_URL}/productos`;

    const cargarProductos = async () => {
        try {
            setLoading(true);
            // Si usas paginación, aquí puedes agregar ?page=0&size=20
            const respuesta = await fetch(API_URL); 
            
            if (!respuesta.ok) {
                throw new Error("No es posible contactar el servidor");
            }
            const datos = await respuesta.json();
            
            // LA MAGIA ESTÁ AQUÍ:
            // Si "content" existe, es porque viene paginado de Spring Boot. 
            // Si no, es una lista normal.
            const listaProductos = datos.content ? datos.content : datos;
            
            setProductos(listaProductos);
        } catch (err: unknown) {
            const mensaje = err instanceof Error ? err.message : "Error desconocido";
            setError(mensaje);
            console.error("Error al cargar inventario", err);
        } finally {
            setLoading(false);
        }
    };   
    useEffect(() => {
        cargarProductos();
    }, []);

    const eliminarProducto = async (id: number) => {
        const result = await Swal.fire({
            title: '¿Estás seguro?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
                if(!res.ok) throw new Error("Error al eliminar en el servidor");

                setProductos(productos.filter(p => p.id !== id));
                Swal.fire('¡Eliminado!', 'El producto ha sido borrado.', 'success');
            } catch (err: unknown) {
                console.error("Error al eliminar:", err);
                Swal.fire('Error', 'No se pudo eliminar el producto', 'error');
            }
        }
    };

    const agregarProducto = async (nuevo: Omit<Producto, 'id'>, ingredientes?: IngredienteParaEnviar[]) => {
        try {
            const urlFinal = ingredientes && ingredientes.length > 0 
                ? `${API_URL}/con-receta` 
                : API_URL;
            const body = ingredientes && ingredientes.length > 0
                ? { productoPrincipal: nuevo, ingredientes: ingredientes }
                : nuevo;
            const res = await fetch(urlFinal, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (!res.ok) {
                const errorMsg = await res.text();
                throw new Error(errorMsg || "Error en el servidor");
            }
            await cargarProductos(); 
            Swal.fire('Guardado', 'Producto y receta registrados con éxito', 'success');
        } catch (err: unknown) {
            console.error("Error al agregar:", err);
            Swal.fire('Error', 'No se pudo guardar el producto.', 'error');
            throw err;
        }
    };

    const editarProducto = async (id: number, datosActualizados: Omit<Producto, 'id'>) => {
        try {
            const res = await fetch(`${API_URL}/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(datosActualizados)
            });
            if (!res.ok) throw new Error("Error al actualizar en el servidor");
            const productoServidor = await res.json();
            setProductos(prevProductos => 
                prevProductos.map(p => p.id === id ? productoServidor : p)
            );
            Swal.fire('¡Éxito!', 'Producto actualizado correctamente', 'success');
        } catch (err: unknown) {
            console.error("Error al editar:", err);
            Swal.fire('Error', 'No se pudo modificar el producto', 'error');
        }
    };

    const obtenerStockVisual = (producto: Producto) => {
        if (producto.esInsumo || !producto.receta || producto.receta.length === 0) {
        return producto.stock;
        }
        const limites = producto.receta.map(item => {
        const insumoOriginal = productos.find(p => p.id === item.insumo.id);
        if (!insumoOriginal || insumoOriginal.stock <= 0) return 0;
        return Math.floor(insumoOriginal.stock / item.cantidadUsada);
        });
        return Math.min(...limites);
    };
    const productosFiltrados = productos.filter(p => {
        const b = busqueda.toLowerCase();
        return p.descripcion.toLowerCase().includes(b) || p.codigoBarras?.toLowerCase().includes(b) || p.id.toString().includes(b);
    });


    return {
        productosFiltrados,
        busqueda,
        setBusqueda,
        productos,
        loading, 
        error,
        cargarProductos,   
        eliminarProducto,
        agregarProducto,
        editarProducto,
        obtenerStockVisual,
        refrescar: cargarProductos 
    };
};