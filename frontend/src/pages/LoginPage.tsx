import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Dumbbell, Loader2, Mail, Lock } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Si ya está autenticado, redirigir según rol
  if (user) {
    const redirect = user.role === 'admin' ? '/admin' : user.role === 'trainer' ? '/trainer' : '/dashboard';
    navigate(redirect, { replace: true });
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const stored = localStorage.getItem('user');
      const userData = stored ? JSON.parse(stored) : null;
      const redirect = userData?.role === 'admin' ? '/admin' : userData?.role === 'trainer' ? '/trainer' : '/dashboard';
      navigate(redirect, { replace: true });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Credenciales inválidas');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1044 50%, #24243e 100%)' }}>
      {/* Panel izquierdo — decorativo */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center px-16 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute -bottom-20 -right-20 w-96 h-96 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />

        <div className="relative z-10 text-center">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl mb-8 shadow-2xl" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Dumbbell size={48} className="text-white" />
          </div>
          <h1 className="text-5xl font-black text-white mb-4 tracking-tight">UrbanGym</h1>
          <p className="text-lg" style={{ color: 'rgba(255,255,255,0.5)' }}>Plataforma de Gestión Deportiva</p>

          <div className="mt-12 grid grid-cols-3 gap-6">
            {[
              { value: '500+', label: 'Socios activos' },
              { value: '12', label: 'Clases semanales' },
              { value: '3', label: 'Sedes' },
            ].map((stat) => (
              <div key={stat.label} className="p-4 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Logo móvil */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Dumbbell size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">UrbanGym</h1>
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
            <div className="mb-7">
              <h2 className="text-2xl font-black text-gray-900">Bienvenido</h2>
              <p className="text-gray-400 text-sm mt-1">Inicia sesión en tu cuenta</p>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 mb-5 text-sm font-medium flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none"
                    style={{ border: '1.5px solid #e5e7eb', background: '#f9fafb' }}
                    onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                    placeholder="tu@email.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none"
                    style={{ border: '1.5px solid #e5e7eb', background: '#f9fafb' }}
                    onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', opacity: loading ? 0.7 : 1 }}
              >
                {loading && <Loader2 size={18} className="animate-spin" />}
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </button>
            </form>

            <p className="text-center text-sm text-gray-400 mt-6">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="font-semibold hover:underline" style={{ color: '#6366f1' }}>
                Regístrate aquí
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
