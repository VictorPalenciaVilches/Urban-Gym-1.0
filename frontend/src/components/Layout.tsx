import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, LogOut, Dumbbell, ShieldCheck,
  UserCheck, UserCircle, ScanLine, Building2, Activity, Menu, X,
} from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar when route changes (mobile navigation)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = {
    member: [
      { to: '/dashboard', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      { to: '/entrenamientos', icon: <Activity size={18} />, label: 'Mis Entrenamientos' },
      { to: '/instalaciones', icon: <Building2 size={18} />, label: 'Instalaciones' },
      { to: '/perfil', icon: <UserCircle size={18} />, label: 'Mi Perfil' },
    ],
    admin: [
      { to: '/admin', icon: <ShieldCheck size={18} />, label: 'Panel Admin' },
      { to: '/admin/socios', icon: <Users size={18} />, label: 'Socios' },
      { to: '/admin/entrenamientos', icon: <Activity size={18} />, label: 'Entrenamientos IoT' },
      { to: '/admin/instalaciones', icon: <Building2 size={18} />, label: 'Instalaciones' },
      { to: '/admin/validar-qr', icon: <ScanLine size={18} />, label: 'Validar Acceso QR' },
    ],
    trainer: [
      { to: '/trainer', icon: <UserCheck size={18} />, label: 'Mi Panel' },
      { to: '/trainer/socios', icon: <Users size={18} />, label: 'Mis Socios' },
      { to: '/trainer/entrenamientos', icon: <Activity size={18} />, label: 'Entrenamientos IoT' },
      { to: '/instalaciones', icon: <Building2 size={18} />, label: 'Instalaciones' },
    ],
  };

  const items = navItems[user?.role as keyof typeof navItems] || navItems.member;

  const roleConfig = {
    admin: { label: 'Administrador', gradient: 'linear-gradient(135deg, #7c3aed, #6d28d9)' },
    trainer: { label: 'Entrenador', gradient: 'linear-gradient(135deg, #2563eb, #0891b2)' },
    member: { label: 'Socio', gradient: 'linear-gradient(135deg, #4f46e5, #7c3aed)' },
  };
  const role = roleConfig[user?.role as keyof typeof roleConfig] ?? roleConfig.member;

  const sidebarContent = (
    <aside
      className="w-64 flex flex-col h-full"
      style={{ background: 'linear-gradient(180deg, #0f0c29 0%, #1a1044 50%, #24243e 100%)' }}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-5 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Dumbbell size={20} className="text-white" />
          </div>
          <div>
            <span className="text-base font-bold text-white tracking-wide">UrbanGym</span>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Platform</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          className="lg:hidden p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-all"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={18} />
        </button>
      </div>

      {/* User info */}
      <div className="px-4 py-3 mx-3 my-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ background: role.gradient }}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </div>
          <div className="overflow-hidden min-w-0">
            <p className="text-sm font-semibold text-white truncate">{user?.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>{user?.email}</p>
          </div>
        </div>
        <div className="mt-2">
          <span
            className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold text-white"
            style={{ background: role.gradient }}
          >
            {role.label}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/admin' || item.to === '/trainer'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive ? 'text-white shadow-lg' : 'hover:text-white'
              }`
            }
            style={({ isActive }) =>
              isActive
                ? { background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 15px rgba(99,102,241,0.35)' }
                : { color: 'rgba(255,255,255,0.55)' }
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group"
          style={{ color: 'rgba(255,255,255,0.5)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.15)';
            (e.currentTarget as HTMLButtonElement).style.color = '#f87171';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            (e.currentTarget as HTMLButtonElement).style.color = 'rgba(255,255,255,0.5)';
          }}
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );

  const shellRole = user?.role === 'admin' ? 'admin' : user?.role === 'trainer' ? 'trainer' : 'member';

  return (
    <div className="flex h-screen ug-main-canvas" data-app-shell={shellRole}>

      {/* ── Desktop Sidebar ─────────────────────────────── */}
      <div className="hidden lg:flex w-64 flex-shrink-0 shadow-2xl">
        {sidebarContent}
      </div>

      {/* ── Mobile Sidebar Overlay ──────────────────────── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Mobile Sidebar Drawer ───────────────────────── */}
      <div
        className={`fixed top-0 left-0 h-full w-64 z-50 shadow-2xl transition-transform duration-300 ease-in-out lg:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>

      {/* ── Main Content ────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">

        {/* Header */}
        <header
          className="px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4 flex-shrink-0"
          style={{
            background: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(99,102,241,0.1)',
            boxShadow: '0 1px 20px rgba(0,0,0,0.06)',
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* Hamburger — mobile only */}
            <button
              className="lg:hidden p-2 rounded-xl transition-all duration-200 flex-shrink-0"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={18} className="text-indigo-600" />
            </button>

            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-1 h-5 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(180deg, #6366f1, #8b5cf6)' }} />
              <h1 className="text-gray-500 text-sm truncate">
                Bienvenido de vuelta,{' '}
                <span className="font-bold text-gray-800">{user?.name}</span>
              </h1>
            </div>
          </div>

          <div
            className="flex flex-col items-end gap-1 flex-shrink-0 text-right sm:flex-row sm:items-center sm:gap-2"
          >
            <div
              className="sm:hidden flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] text-slate-500"
              style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </div>
            <div
              className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs text-gray-400"
              style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)' }}
            >
              <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 pb-[max(1rem,env(safe-area-inset-bottom,0px))] sm:pb-6 lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
