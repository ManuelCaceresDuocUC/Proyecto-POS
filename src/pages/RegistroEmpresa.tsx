import React, { useState } from 'react';
import type { FormEvent } from 'react'; 
import { useNavigate, Link } from 'react-router-dom'; 
import { Building2, User, Plus, Trash2, ShieldAlert, ArrowRight, ArrowLeft } from 'lucide-react';
import Swal from 'sweetalert2'; // ✨ 1. Importamos SweetAlert2

interface EmpleadoInmediato {
  usuario: string;
  contrasena: string;
  rol: 'vendedor' | 'administrador';
}

export const RegistroEmpresa = () => {
  const navigate = useNavigate(); 

  // 1. Estado de la Empresa
  const [empresa, setEmpresa] = useState({
    rut_empresa: '',
    razon_social: '',
    giro: '',
    direccion: '', 
    comuna: ''
  });

  // 2. Estado del Usuario Administrador principal
  const [admin, setAdmin] = useState({
    usuario: '',
    correo: '',
    contrasena: ''
  });

  // 3. Estado para cuentas extras de empleados
  const [empleados, setEmpleados] = useState<EmpleadoInmediato[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Manejadores de inputs
  const handleEmpresaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmpresa({ ...empresa, [e.target.name]: e.target.value });
  };

  const handleAdminChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAdmin({ ...admin, [e.target.name]: e.target.value });
  };

  // Funciones para gestionar empleados dinámicamente
  const agregarFilaEmpleado = () => {
    setEmpleados([...empleados, { usuario: '', contrasena: '', rol: 'vendedor' }]);
  };

  const eliminarEmpleado = (index: number) => {
    setEmpleados(empleados.filter((_, i) => i !== index));
  };

  const handleEmpleadoChange = (index: number, field: keyof EmpleadoInmediato, value: string) => {
    const nuevosEmpleados = [...empleados];
    nuevosEmpleados[index] = { ...nuevosEmpleados[index], [field]: value };
    setEmpleados(nuevosEmpleados);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validaciones básicas obligatorias
    if (!empresa.rut_empresa || !empresa.razon_social || !empresa.giro || !admin.usuario || !admin.contrasena || !admin.correo) {
      setError('Por favor completa todos los campos obligatorios de la empresa y del administrador.');
      return;
    }

    try {
      setLoading(true);

      const payloadCompleto = {
        empresa: {
          ...empresa,
          direccion: empresa.direccion.trim() !== '' ? empresa.direccion : 'Sin dirección registrada',
          comuna: empresa.comuna.trim() !== '' ? empresa.comuna : 'Sin comuna registrada',
          activo: true,
          fecha_registro: new Date().toISOString()
        },
        admin: {
          ...admin,
          rol: 'admin'
        },
        empleados: empleados.filter(emp => emp.usuario && emp.contrasena)
      };

      console.log('Enviando payload al backend:', payloadCompleto);
      
      // ✨ 2. Uso de variable de entorno VITE_API_URL
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/registrar-empresa`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify(payloadCompleto)
      });

      // ✨ 3. Manejo de errores idéntico a agregarProducto en useInventario
      if (!response.ok) {
        const errorMsg = await response.text();
        throw new Error(errorMsg || 'Error en el servidor al registrar la empresa');
      }

      // ✨ 4. Reemplazamos alert() por Swal.fire() con estilo y confirmación
      await Swal.fire(
        '¡Registro Exitoso!', 
        'La empresa y los usuarios han sido guardados correctamente.', 
        'success'
      );
      
      navigate('/login');

    } catch (err: unknown) {
      console.error("Error al registrar empresa:", err);
      const mensaje = err instanceof Error ? err.message : String(err);
      
      setError(mensaje || 'Ocurrió un error al procesar el registro. Verifica los datos.');
      
      // ✨ 5. Notificación de error con SweetAlert2
      Swal.fire('Error', mensaje || 'No se pudo procesar el registro', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-8 font-sans text-slate-800">
      <div className="w-full max-w-4xl">
        
        {/* BARRA SUPERIOR SOBRIA */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-8">
          <div>
            <Link 
              to="/" 
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors mb-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver al Inicio</span>
            </Link>
            <h1 className="text-3xl font-semibold text-slate-900 tracking-tight">Registro de Empresa</h1>
            <p className="text-slate-500 text-sm mt-0.5">Configura tu organización y las cuentas de usuario del sistema.</p>
          </div>

          {/* Logo KIPI minimalista */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center text-white font-bold tracking-tighter text-sm shadow-sm">
              KP
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              KIPI<span className="text-slate-400">.</span>
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 p-4 rounded text-sm text-red-700 font-medium flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 text-red-600 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* SECCIÓN 1: DATOS DE LA EMPRESA */}
          <div className="bg-white p-6 rounded shadow-sm border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">1. Información de la Empresa</h3>
              <Building2 className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">RUT Empresa *</label>
                <input
                  type="text"
                  name="rut_empresa"
                  placeholder="Ej: 76.123.456-K"
                  value={empresa.rut_empresa}
                  onChange={handleEmpresaChange}
                  className="w-full p-2.5 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
                />
                <span className="text-xs text-slate-400 mt-1 block">Se utilizará como identificador de acceso.</span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Razón Social *</label>
                <input
                  type="text"
                  name="razon_social"
                  placeholder="Ej: Comercial Los Cáceres Limitada"
                  value={empresa.razon_social}
                  onChange={handleEmpresaChange}
                  className="w-full p-2.5 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Giro Comercial *</label>
              <input
                type="text"
                name="giro"
                placeholder="Ej: Venta al por menor de artículos de almacén"
                value={empresa.giro}
                onChange={handleEmpresaChange}
                className="w-full p-2.5 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
              />
            </div>
          </div>

          {/* SECCIÓN 2: CUENTA ADMINISTRADOR */}
          <div className="bg-white p-6 rounded shadow-sm border border-slate-200 space-y-4">
            <div className="border-b border-slate-100 pb-3 mb-2 flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">2. Cuenta de Administrador Principal</h3>
              <User className="w-4 h-4 text-slate-400" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Usuario *</label>
                <input
                  type="text"
                  name="usuario"
                  placeholder="ej: admin_caceres"
                  value={admin.usuario}
                  onChange={handleAdminChange}
                  className="w-full p-2.5 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  name="correo"
                  placeholder="admin@empresa.com"
                  value={admin.correo}
                  onChange={handleAdminChange}
                  className="w-full p-2.5 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Contraseña *</label>
                <input
                  type="password"
                  name="contrasena"
                  placeholder="••••••••"
                  value={admin.contrasena}
                  onChange={handleAdminChange}
                  className="w-full p-2.5 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: CUENTAS RELACIONADAS */}
          <div className="bg-white p-6 rounded shadow-sm border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <div>
                <h3 className="text-base font-semibold text-slate-900">3. Cuentas para Colaboradores</h3>
                <p className="text-xs text-slate-500">Opcional. Puedes agregar usuarios para caja o administración.</p>
              </div>
              <button
                type="button"
                onClick={agregarFilaEmpleado}
                className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded font-medium text-xs transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Agregar Cuenta
              </button>
            </div>

            {empleados.length === 0 ? (
              <div className="text-sm text-slate-500 text-center py-6 bg-slate-50/50 rounded border border-slate-200">
                No se han agregado colaboradores iniciales.
              </div>
            ) : (
              <div className="space-y-3">
                {empleados.map((emp, index) => (
                  <div key={index} className="flex flex-col md:flex-row gap-3 items-center bg-slate-50 p-3 rounded border border-slate-200">
                    <div className="w-full md:flex-1">
                      <input
                        type="text"
                        placeholder="Usuario empleado"
                        value={emp.usuario}
                        onChange={(e) => handleEmpleadoChange(index, 'usuario', e.target.value)}
                        className="w-full p-2 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
                      />
                    </div>
                    <div className="w-full md:flex-1">
                      <input
                        type="password"
                        placeholder="Contraseña"
                        value={emp.contrasena}
                        onChange={(e) => handleEmpleadoChange(index, 'contrasena', e.target.value)}
                        className="w-full p-2 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white"
                      />
                    </div>
                    <div className="w-full md:w-48">
                      <select
                        value={emp.rol}
                        onChange={(e) => handleEmpleadoChange(index, 'rol', e.target.value as 'vendedor' | 'administrador')}
                        className="w-full p-2 rounded border border-slate-300 shadow-sm outline-none text-sm focus:border-slate-500 bg-white cursor-pointer"
                      >
                        <option value="vendedor">Vendedor / Cajero</option>
                        <option value="administrador">Admin secundario</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => eliminarEmpleado(index)}
                      className="p-2 text-slate-400 hover:text-red-600 rounded transition-colors self-end md:self-center"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BOTÓN DE ENVÍO */}
          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="w-full md:w-auto bg-slate-800 hover:bg-slate-900 text-white px-8 py-3 rounded font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Finalizar Registro'}
              {!loading && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};