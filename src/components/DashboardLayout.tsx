import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';

export const DashboardLayout = () => {
  const navigate = useNavigate();
  const location = useLocation(); // Para saber en qué ruta estamos y pintar el botón activo

  const handleLogout = () => {
    localStorage.removeItem('user_session');
    navigate('/login');
  };

  // Definimos las opciones del menú para iterarlas fácilmente
  const menuOptions = [
    { name: 'Inicio', path: '/' },
    { name: 'Caja', path: '/ventas' },
    { name: 'Inventario', path: '/inventario' },
    { name: 'Movimientos', path: '/movimientos' },
    { name: 'Recetas', path: '/recetas' },
    { name: 'Administración', path: '/administracion' },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* SIDEBAR (BARRA LATERAL) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-xl z-10">
        {/* Título o Logo del sistema */}
        <div className="h-20 flex items-center justify-center border-b border-slate-700">
          <h2 className="text-2xl font-black text-white tracking-wider">
            Los Cáceres <span className="text-blue-500">POS</span>
          </h2>
        </div>

        {/* Navegación */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuOptions.map((opcion) => {
            const isActive = location.pathname === opcion.path || 
                             (opcion.path !== '/' && location.pathname.startsWith(opcion.path));
            
            return (
              <Link 
                key={opcion.name} 
                to={opcion.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-md' 
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                {opcion.name}
              </Link>
            );
          })}
        </nav>

        {/* Botón de Cerrar Sesión al fondo */}
        <div className="p-4 border-t border-slate-700">
          <button 
            onClick={handleLogout}
            className="w-full flex justify-center items-center gap-2 bg-slate-800 hover:bg-red-600 hover:text-white text-slate-400 py-3 rounded-lg transition-colors font-bold text-sm"
          >
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* ÁREA DE CONTENIDO PRINCIPAL (Donde se renderizan los módulos) */}
      <main className="flex-1 overflow-y-auto relative">
        {/* El componente <Outlet /> inyecta aquí la página correspondiente a la ruta actual */}
        <Outlet />
      </main>
      
    </div>
  );
};