import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/api';
import { Dumbbell, Loader2, Lock, CheckCircle2 } from 'lucide-react';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (!token) {
      setError('El token es inválido o no existe');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Error al restablecer la contraseña. Es posible que el enlace haya caducado.');
    } finally {
      setLoading(false);
    }
  };

  if (!token && !success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">Enlace inválido</h2>
          <p className="text-gray-500 mb-6">No hemos encontrado un token válido en la URL para cambiar tu contraseña.</p>
          <Link to="/login" className="text-indigo-600 font-semibold hover:underline">Ir a Iniciar Sesión</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1044 50%, #24243e 100%)' }}>
      <div className="w-full flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Dumbbell size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">UrbanGym</h1>
          </div>

          <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
            <div className="mb-7">
              <h2 className="text-2xl font-black text-gray-900">Nueva Contraseña</h2>
              <p className="text-gray-400 text-sm mt-1">
                {success ? '¡Contraseña actualizada!' : 'Crea una nueva contraseña segura'}
              </p>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 mb-5 text-sm font-medium flex items-center gap-2" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626' }}>
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
              </div>
            )}

            {success ? (
              <div className="text-center py-6">
                <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">¡Todo listo!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Tu contraseña ha sido actualizada correctamente. Ya puedes iniciar sesión.
                </p>
                <button
                  onClick={() => navigate('/login')}
                  className="w-full inline-block text-white font-bold py-3 rounded-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                >
                  Ir a Iniciar Sesión
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm transition-all outline-none"
                      style={{ border: '1.5px solid #e5e7eb', background: '#f9fafb' }}
                      onFocus={(e) => { e.target.style.borderColor = '#6366f1'; e.target.style.background = '#fff'; }}
                      onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Confirmar nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
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
                  {loading ? 'Guardando...' : 'Cambiar Contraseña'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
