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
    categoria?: {
    id: number;
    nombre: string;
    };
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
            
            // ✨ 1. Obtenemos el ID de la empresa del LocalStorage
            const empresaId = localStorage.getItem('empresaId') || "1";
            
            // ✨ 2. Lo agregamos a la URL
            const urlConEmpresa = `${API_URL}?empresaId=${empresaId}`;
            
            const respuesta = await fetch(urlConEmpresa); 
            
            if (!respuesta.ok) {
                throw new Error("No es posible contactar el servidor");
            }
            const datos = await respuesta.json();
            
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
        // ✨ 1. Obtenemos el ID de la empresa de la sesión actual
        const empresaIdStr = localStorage.getItem('empresaId') || "1";
        const empresaId = parseInt(empresaIdStr, 10);

        // ✨ 2. Creamos una copia del producto inyectándole la relación de la empresa
        const productoConEmpresa = {
            ...nuevo,
            empresa: { id: empresaId } // La estructura exacta que espera Spring Boot
        };

        // ✨ 3. Determinamos la URL y adaptamos el cuerpo (body) según corresponda
        const urlFinal = ingredientes && ingredientes.length > 0 
            ? `${API_URL}/con-receta` 
            : API_URL;

        const body = ingredientes && ingredientes.length > 0
            ? { productoPrincipal: productoConEmpresa, ingredientes: ingredientes }
            : productoConEmpresa;

        // 4. Enviamos la petición HTTP
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