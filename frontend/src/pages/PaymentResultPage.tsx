import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, XCircle, Clock, Home, RefreshCw } from 'lucide-react';

type ResultType = 'success' | 'failure' | 'pending';

const CONFIG: Record<ResultType, {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bgGradient: string;
  iconBg: string;
  badge: string;
  badgeBg: string;
  btnLabel: string;
  btnClass: string;
}> = {
  success: {
    icon: <CheckCircle size={56} className="text-emerald-400" />,
    title: '¡Pago exitoso!',
    subtitle: 'Tu suscripción ha sido activada correctamente. Ya puedes disfrutar de todos los beneficios de UrbanGYM.',
    bgGradient: 'from-emerald-950 via-gray-950 to-gray-900',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    badge: 'Aprobado',
    badgeBg: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30',
    btnLabel: 'Ir al Dashboard',
    btnClass: 'bg-emerald-500 hover:bg-emerald-400 text-white',
  },
  failure: {
    icon: <XCircle size={56} className="text-red-400" />,
    title: 'Pago rechazado',
    subtitle: 'No pudimos procesar tu pago. Verifica los datos de tu tarjeta e intenta nuevamente.',
    bgGradient: 'from-red-950 via-gray-950 to-gray-900',
    iconBg: 'bg-red-500/10 border-red-500/20',
    badge: 'Rechazado',
    badgeBg: 'bg-red-500/20 text-red-300 border border-red-500/30',
    btnLabel: 'Intentar de nuevo',
    btnClass: 'bg-red-500 hover:bg-red-400 text-white',
  },
  pending: {
    icon: <Clock size={56} className="text-amber-400" />,
    title: 'Pago en proceso',
    subtitle: 'Tu pago está siendo procesado. Te notificaremos cuando sea confirmado. Puede tardar unos minutos.',
    bgGradient: 'from-amber-950 via-gray-950 to-gray-900',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    badge: 'Pendiente',
    badgeBg: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
    btnLabel: 'Ver mi perfil',
    btnClass: 'bg-amber-500 hover:bg-amber-400 text-white',
  },
};

interface PaymentResultPageProps {
  type: ResultType;
}

export default function PaymentResultPage({ type }: PaymentResultPageProps) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(8);
  const cfg = CONFIG[type];

  const paymentId = params.get('payment_id') ?? '—';
  const status = params.get('status') ?? '—';
  const externalRef = params.get('external_reference') ?? '';
  
  // Bug fix: Fallback to localStorage if external_reference is missing
  const plan = externalRef.split('|')[1] || localStorage.getItem('pendingPlan') || '—';

  // Auto-redirect después de 8 s en caso de éxito
  useEffect(() => {
    if (type !== 'success') return;
    const interval = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(interval);
          navigate('/perfil');
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [type, navigate]);

  // Limpiar pendingPlan del localStorage (solo después de haberlo usado arriba)
  useEffect(() => {
    // Retrasamos la limpieza para asegurar que el componente renderizó el plan
    const timer = setTimeout(() => {
      localStorage.removeItem('pendingPlan');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handlePrimary = () => {
    navigate('/perfil');
  };

  const PLAN_LABELS: Record<string, string> = {
    basic: 'Basic — $80.000 COP/mes',
    premium: 'Premium — $150.000 COP/mes',
    vip: 'VIP — $250.000 COP/mes',
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${cfg.bgGradient} flex items-center justify-center p-4`}>
      {/* Background decorative circles */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
        style={{ background: type === 'success' ? '#10b981' : type === 'failure' ? '#ef4444' : '#f59e0b' }}
      />

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl text-center">
          {/* UrbanGYM logo */}
          <div className="mb-6">
            <span className="text-white/40 text-sm font-bold tracking-widest uppercase">UrbanGYM</span>
          </div>

          {/* Status badge */}
          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-5 ${cfg.badgeBg}`}>
            {cfg.badge}
          </span>

          {/* Icon */}
          <div className={`w-24 h-24 mx-auto rounded-full border-2 ${cfg.iconBg} flex items-center justify-center mb-6`}>
            {cfg.icon}
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-white mb-3">{cfg.title}</h1>
          <p className="text-white/60 text-sm leading-relaxed mb-8">{cfg.subtitle}</p>

          {/* Payment details box */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-left space-y-3 mb-8">
            <div className="flex justify-between text-sm">
              <span className="text-white/40">ID de pago</span>
              <span className="text-white font-mono text-xs">{paymentId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Estado MP</span>
              <span className="text-white capitalize">{status}</span>
            </div>
            {plan !== '—' && PLAN_LABELS[plan] && (
              <div className="flex justify-between text-sm">
                <span className="text-white/40">Plan</span>
                <span className="text-white capitalize">{PLAN_LABELS[plan] ?? plan}</span>
              </div>
            )}
          </div>

          {/* Auto-redirect countdown for success */}
          {type === 'success' && (
            <p className="text-white/40 text-xs mb-4">
              Redirigiendo al perfil en <span className="text-white font-semibold">{countdown}s</span>...
            </p>
          )}

          {/* Buttons */}
          <div className="space-y-3">
            <button
              onClick={handlePrimary}
              className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2 ${cfg.btnClass}`}
            >
              {type === 'failure' ? <RefreshCw size={16} /> : <Home size={16} />}
              {cfg.btnLabel}
            </button>
            {type !== 'success' && (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full py-3 rounded-xl font-semibold text-sm text-white/50 hover:text-white transition-colors"
              >
                Ir al Dashboard
              </button>
            )}
          </div>
        </div>

        {/* Security badge */}
        <div className="mt-6 flex items-center justify-center gap-2 text-white/20 text-xs">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          Pago procesado de forma segura por MercadoPago
        </div>
      </div>
    </div>
  );
}
