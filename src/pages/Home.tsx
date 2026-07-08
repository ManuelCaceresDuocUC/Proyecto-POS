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
      {/* Encabezado de Bienvenida */}
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-3xl font-black text-slate-800">
          Hola, {nombreParaMostrar} 👋
        </h1>
        <p className="text-slate-500 mt-2">
          Bienvenido al sistema de administración. Desde aquí puedes monitorear los pedidos en tiempo real.
        </p>
      </div>

      {/* 🚀 Panel de Vercel Incrustado */}
      <div className="w-full flex flex-col bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-[600px]">
        
        {/* Pequeña barra superior para darle aspecto de "aplicación" (Opcional) */}
        <div className="bg-slate-50 border-b border-slate-200 px-6 py-3">
          <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            📦 Panel de Pedidos (En vivo)
          </h2>
        </div>

        {/* El iframe que carga tu app de Vercel */}
        <iframe 
          src="https://panel-local.vercel.app/" 
          width="100%" 
          height="100%" 
          title="Panel de Pedidos Externo"
          className="border-none flex-grow"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
        />
      </div>
      
    </div>
  );
};