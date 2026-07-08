import { useState } from "react";
import { useLogin } from "../hooks/useLogin";
import Swal from "sweetalert2";

export const Login = () => {
  const { logearUsuario } = useLogin();

  const [form, setForm] = useState({
    usuario: '',
    contrasena: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación amigable con SweetAlert2
    if (!form.usuario.trim() || !form.contrasena.trim()) {
      return Swal.fire({
        icon: 'warning',
        title: 'Campos incompletos',
        text: 'Por favor, ingresa tanto tu nombre de usuario como tu contraseña para poder entrar al sistema.',
        confirmButtonColor: '#3B82F6',
        confirmButtonText: 'Entendido',
      });
    }

    // Ejecutamos el login
    // Nota: Si useLogin maneja errores internamente y lanza alertas, el texto de 
    // los inputs ya no se borrará si el login falla, permitiendo al usuario corregirlo.
    logearUsuario({
      usuario: form.usuario.trim(),
      contrasena: form.contrasena.trim()
    });

    // ✨ ELIMINAMOS el setForm() que limpiaba los campos aquí.
    // Ahora, si hay un error, el texto se mantiene. Si el login es exitoso, 
    // el usuario será redirigido, así que no importa que el texto siga ahí.
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative font-sans">
      
      {/* Tarjeta de Login */}
      <div className="bg-white w-full max-w-md p-8 sm:p-10 rounded-2xl shadow-xl border border-slate-100">
        
        {/* Cabecera / Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-wider text-slate-900 mb-2">
            Los Cáceres <span className="text-blue-500">POS</span>
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Bienvenido de vuelta. Ingresa tus credenciales para acceder al panel de control y punto de venta.
          </p>
        </div>

        <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
          
          {/* Campo Usuario */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              👤 Nombre de Usuario
            </label>
            <input
              type="text"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
              placeholder="Ej: admin_caceres"
              value={form.usuario}
              onChange={(e) => setForm({ ...form, usuario: e.target.value })}
            />
          </div>

          {/* Campo Contraseña */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">
              🔒 Contraseña
            </label>
            <input
              type="password"
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-slate-800"
              placeholder="••••••••"
              value={form.contrasena}
              onChange={(e) => setForm({ ...form, contrasena: e.target.value })}
            />
          </div>

          {/* Botón Submit */}
          <button
            type="submit"
            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex justify-center items-center gap-2"
          >
            Iniciar Sesión
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </button>
          
        </form>
      </div>
    </div>
  );
};