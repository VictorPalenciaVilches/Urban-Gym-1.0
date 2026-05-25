import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/api';
import { Dumbbell, Loader2, Mail, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      setSuccess(true);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Error al solicitar recuperación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #0f0c29 0%, #1a1044 50%, #24243e 100%)' }}>
      <div className="w-full flex items-center justify-center px-8">
        <div className="w-full max-w-md">
          {/* Logo móvil/general */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-3" style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              <Dumbbell size={30} className="text-white" />
            </div>
            <h1 className="text-2xl font-black text-white">UrbanGym</h1>
          </div>

          {/* Card */}
          <div className="rounded-3xl p-8 shadow-2xl" style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}>
            <div className="mb-7">
              <h2 className="text-2xl font-black text-gray-900">Recuperar Contraseña</h2>
              <p className="text-gray-400 text-sm mt-1">
                {success 
                  ? 'Te hemos enviado un correo.' 
                  : 'Ingresa tu correo y te enviaremos un enlace para restablecerla.'}
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
                <h3 className="text-lg font-bold text-gray-900 mb-2">¡Correo enviado!</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Revisa tu bandeja de entrada o la carpeta de spam para encontrar el enlace de recuperación.
                </p>
                <Link
                  to="/login"
                  className="w-full inline-block text-white font-bold py-3 rounded-xl transition-all"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)' }}
                >
                  Volver a Iniciar Sesión
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                      type="email"
                      name="email"
                      autoComplete="email"
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

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-2"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', boxShadow: '0 4px 20px rgba(99,102,241,0.4)', opacity: loading ? 0.7 : 1 }}
                >
                  {loading && <Loader2 size={18} className="animate-spin" />}
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>
            )}

            {!success && (
              <p className="text-center text-sm text-gray-400 mt-6">
                <Link to="/login" className="font-semibold hover:underline" style={{ color: '#6366f1' }}>
                  ← Volver a Iniciar Sesión
                </Link>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
