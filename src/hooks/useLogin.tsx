import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

interface Usuario {
    usuario: string;
    contrasena: string;
}

export const useLogin = () => {
    const API_URL = `${import.meta.env.VITE_API_URL}/usuarios`;
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);

    const eliminarUsuario = (usuario: string) => {
        setUsuarios(usuarios.filter(p => p.usuario !== usuario));
    };
    
    const agregarUsuario = (nuevo: Usuario) => {
        setUsuarios([...usuarios, nuevo]);
    };
    
    const cargarUsuarios = async () => {
        try {
            setLoading(true);
            const respuesta = await fetch(API_URL);
            if (!respuesta.ok) throw new Error("Error al conectar con el servidor");
            const datos = await respuesta.json();
            setUsuarios(datos);
        } catch (err: unknown) {
            const mensaje = err instanceof Error ? err.message : "Error desconocido";
            setError(mensaje);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        cargarUsuarios();
    }, []);

    const logearUsuario = async (credenciales: Usuario) => {
        setLoading(true); 
        setError(null);
        try {
            const respuesta = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(credenciales)
            });

            if (respuesta.ok) {
                const { usuario: usuarioLogeado, token } = await respuesta.json(); // Leemos el objeto y el token
                
                Swal.fire({
                    title: `¡Bienvenido ${usuarioLogeado.usuario}!`,
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });

                // ✨ Guardamos el token criptográfico para usarlo después
                localStorage.setItem('jwt_token', token);

                localStorage.setItem('user_session', JSON.stringify(usuarioLogeado));
                const rolUsuario = usuarioLogeado.rol || 'vendedor';
                localStorage.setItem('usuarioRol', rolUsuario);
                localStorage.setItem('usuarioNombre', usuarioLogeado.usuario);
                localStorage.setItem('usuarioId', usuarioLogeado.id?.toString() || '1');
                const idEmpresa = usuarioLogeado.empresa?.id || 1;
                localStorage.setItem('empresaId', idEmpresa.toString());

                if (rolUsuario === 'administrador' || rolUsuario === 'admin') {
                    navigate('/administracion');
                } else {
                    navigate('/home');
                }
            }

            
        } catch (err) {
            Swal.fire({
                title: `Error de acceso ${err}`,
                text: "Usuario o contraseña incorrectos",
                icon: 'error',
                confirmButtonText: 'Reintentar'
            });
        } finally {
            setLoading(false);
        }
    };

    return {
        usuarios,
        eliminarUsuario,
        agregarUsuario,
        logearUsuario,
        loading, 
        error,
    };
};