import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { Ventas } from './pages/Ventas';
import { Inventario } from './pages/Inventario';
import { Movimientos } from './pages/Movimientos';
import { Recetas } from './pages/Recetas';
import { Administracion } from './pages/Administracion';
import { DashboardLayout } from './components/DashboardLayout';
import { ProtectedRoute } from './components/ProtectedRoute'; // Asumiendo que ya tienes esto configurado

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas */}
        <Route path="/login" element={<Login />} />

        {/* Rutas Protegidas envueltas en el Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/ventas" element={<Ventas />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/movimientos" element={<Movimientos />} />
            <Route path="/recetas" element={<Recetas />} />
            <Route path="/administracion" element={<Administracion />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;