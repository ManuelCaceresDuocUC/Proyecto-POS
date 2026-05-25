import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export const Home = () => {
  const navigate = useNavigate();

  // 1. Inicializamos el estado leyendo el localStorage directamente
  const [nombreParaMostrar] = useState(() => {
    const sesion = localStorage.getItem('user_session');
    if (!sesion) return 'Usuario'; // Valor por defecto si no hay sesión
    
    try {
      const usuarioObj = JSON.parse(sesion);
      return usuarioObj.usuario || usuarioObj.nombre || 'Usuario';
    } catch (e) {
      console.log(e);
      return sesion; // Por si es texto plano
    }
  });

  // 2. Mantenemos el useEffect SOLO para la redirección de seguridad
  useEffect(() => {
    const sesion = localStorage.getItem('user_session');
    if (!sesion) {
      navigate('/login'); 
    }
  }, [navigate]);

  return (
    <div className="p-10 flex flex-col gap-8">
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-slate-800">
          Hola, {nombreParaMostrar} 👋
        </h1>
        <p className="text-slate-500 mt-2">
          Bienvenido al sistema de administración. Selecciona un módulo en el menú lateral para comenzar.
        </p>
      </div>

      {/* Widgets de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white h-32 rounded-xl border border-slate-200 border-dashed flex items-center justify-center text-slate-400 font-medium">
          Espacio para Resumen de Ventas
        </div>
        <div className="bg-white h-32 rounded-xl border border-slate-200 border-dashed flex items-center justify-center text-slate-400 font-medium">
          Espacio para Top Productos
        </div>
        <div className="bg-white h-32 rounded-xl border border-slate-200 border-dashed flex items-center justify-center text-slate-400 font-medium">
          Espacio para Alertas de Stock
        </div>
      </div>
    </div>
  );
};