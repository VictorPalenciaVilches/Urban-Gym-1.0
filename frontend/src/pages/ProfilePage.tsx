import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { membersApi, authApi, billingApi } from '../api/api';
import { User, Mail, Phone, CreditCard, RefreshCw, Loader2, CheckCircle, QrCode, Receipt, TrendingUp } from 'lucide-react';

// Valores en centavos (igual que en Stripe y Supabase)
const PLAN_PRICES: Record<string, number> = { basic: 8000000, premium: 15000000, vip: 25000000 };

// Convierte centavos a formato $ 80.000 COP
const formatCOP = (cents: number) =>
  `$ ${(cents / 100).toLocaleString('es-CO')} COP`;

export default function ProfilePage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [qrExpires, setQrExpires] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingQr, setLoadingQr] = useState(false);
  const [memberData, setMemberData] = useState<{
    name: string;
    phone: string | null;
    subscription_plan: string | null;
    subscription_status: string;
    created_at: string;
  } | null>(null);
  const [billing, setBilling] = useState<{
    subscription: any;
    payments: any[];
  } | null>(null);
  const [changingPlan, setChangingPlan] = useState(false);

  // Estados para BMI y Planes
  const [metricsForm, setMetricsForm] = useState({ weight_kg: '', height_cm: '', goal: 'loss_weight' });
  const [savingMetrics, setSavingMetrics] = useState(false);
  const [fitnessPlan, setFitnessPlan] = useState<any>(null);

  useEffect(() => {
    membersApi.getMe().then(({ data }) => {
      setMemberData(data);
      setForm({ name: data.name, phone: data.phone || '' });
    }).catch(() => {});

    billingApi.getMyBilling().then(({ data }) => {
      setBilling(data);
    }).catch(() => {});

    if (user?.id) {
      import('../api/api').then(({ recommendationsApi }) => {
        recommendationsApi.getFitnessPlan(user.id)
          .then(({ data }) => {
            if (data?.metrics) {
              setMetricsForm({
                weight_kg: data.metrics.weight_kg.toString(),
                height_cm: data.metrics.height_cm.toString(),
                goal: data.metrics.goal
              });
              setFitnessPlan(data);
            }
          })
          .catch(() => {});
      });
    }
  }, [user?.id]);

  const handleChangePlan = async (plan: string) => {
    if (!confirm(`¿Cambiar al plan ${plan.toUpperCase()}? Serás redirigido a MercadoPago para completar el pago.`)) return;
    setChangingPlan(true);
    try {
      const { data } = await billingApi.changePlan(plan);
      if (data?.checkoutUrl) {
        // Guardar el plan seleccionado para refrescar al volver
        localStorage.setItem('pendingPlan', plan);
        window.location.href = data.checkoutUrl;
      } else {
        alert('No se pudo obtener el link de pago');
      }
    } catch {
      alert('Error al iniciar el proceso de pago');
    } finally {
      setChangingPlan(false);
    }
  };

  const handleSaveMetrics = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSavingMetrics(true);
    try {
      const { recommendationsApi } = await import('../api/api');
      await recommendationsApi.saveMetrics(user.id, {
        weight_kg: Number(metricsForm.weight_kg),
        height_cm: Number(metricsForm.height_cm),
        goal: metricsForm.goal
      });
      // Recargar plan
      const { data } = await recommendationsApi.getFitnessPlan(user.id);
      setFitnessPlan(data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || 'Error al calcular IMC');
    } finally {
      setSavingMetrics(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setSaving(true);
    try {
      await membersApi.update(user.id, { name: form.name, phone: form.phone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      alert('Error al guardar cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateQR = async () => {
    setLoadingQr(true);
    try {
      const { data } = await authApi.getQR();
      setQrCode(data.qrCode);
      setQrToken(data.qrToken);
      setQrExpires(data.expiresAt);
    } catch {
      alert('Error al generar el código QR');
    } finally {
      setLoadingQr(false);
    }
  };

  const timeUntilExpiry = () => {
    if (!qrExpires) return '';
    const diff = new Date(qrExpires).getTime() - Date.now();
    if (diff <= 0) return 'Expirado';
    const mins = Math.floor(diff / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    return `${mins}m ${secs}s`;
  };

  const sub = billing?.subscription;
  const currentPlan = sub?.plan || memberData?.subscription_plan || 'basic';
  const subStatus = sub?.status || memberData?.subscription_status || 'inactive';
  const monthlyAmount = formatCOP(sub?.amount ?? PLAN_PRICES[currentPlan] ?? PLAN_PRICES.basic);
  const nextBilling = sub?.current_period_end
    ? new Date(sub.current_period_end).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : '—';

  return (
    <div className="space-y-6 max-w-3xl page-enter">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Mi Perfil</h1>
        <p className="text-gray-500 mt-1">Gestiona tu información personal y acceso al gimnasio.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información personal */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <User size={18} className="text-indigo-500" />
            Información Personal
          </h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Nombre</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Mail size={13} /> Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-100 rounded-lg text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1 flex items-center gap-1">
                <Phone size={13} /> Teléfono
              </label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="3001234567"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving && <Loader2 size={15} className="animate-spin" />}
              {saved ? <><CheckCircle size={15} /> Guardado</> : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Metas Físicas e IMC */}
        <div className="bg-white rounded-xl shadow-sm border border-indigo-100 p-6">
          <h2 className="font-semibold text-indigo-900 mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-indigo-500" />
            Mis Metas Físicas (IMC)
          </h2>
          <form onSubmit={handleSaveMetrics} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Peso (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={metricsForm.weight_kg}
                  onChange={(e) => setMetricsForm({ ...metricsForm, weight_kg: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Altura (cm)</label>
                <input
                  type="number"
                  required
                  value={metricsForm.height_cm}
                  onChange={(e) => setMetricsForm({ ...metricsForm, height_cm: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Objetivo Físico</label>
              <select
                required
                value={metricsForm.goal}
                onChange={(e) => setMetricsForm({ ...metricsForm, goal: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="lose_weight">Bajar de Peso (Reducir %) </option>
                <option value="gain_mass">Ganar Masa Muscular (Hipertrofia)</option>
                <option value="maintain">Mantenimiento y Salud</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={savingMetrics}
              className="w-full py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {savingMetrics && <Loader2 size={15} className="animate-spin" />}
              Calcular IMC y Ver Plan
            </button>
          </form>

          {fitnessPlan?.metrics && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm font-medium text-gray-600">Tu IMC actual:</span>
                <span className={`px-2 py-1 rounded text-lg font-bold ${
                  fitnessPlan.metrics.bmi < 18.5 ? 'bg-blue-100 text-blue-700' :
                  fitnessPlan.metrics.bmi < 25 ? 'bg-green-100 text-green-700' :
                  fitnessPlan.metrics.bmi < 30 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {fitnessPlan.metrics.bmi}
                </span>
              </div>
              <p className="text-xs text-gray-500 text-center mb-4">
                {fitnessPlan.metrics.bmi < 18.5 ? 'Bajo peso' :
                 fitnessPlan.metrics.bmi < 25 ? 'Peso Normal o Saludable' :
                 fitnessPlan.metrics.bmi < 30 ? 'Sobrepeso' : 'Obesidad'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Planes recomendados */}
      {fitnessPlan?.plan && (
        <div className="bg-white rounded-xl shadow-sm border border-indigo-200 overflow-hidden">
          <div className="bg-indigo-50 px-6 py-4 border-b border-indigo-100">
            <h2 className="font-bold text-indigo-900 text-lg flex items-center gap-2">
              ⭐ Plan Asignado: {fitnessPlan.plan.name}
            </h2>
            <p className="text-sm text-indigo-600 mt-1">Este plan fue creado específicamente para tu objetivo de {fitnessPlan.metrics.goal === 'lose_weight' ? 'Bajar de peso' : fitnessPlan.metrics.goal === 'gain_mass' ? 'Ganar masa' : 'Mantener tu peso'}.</p>
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 border-b pb-2">Rutina Recomendada</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                {fitnessPlan.plan.workout_plan.split('•').filter(Boolean).map((line: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-indigo-500">•</span> {line.trim()}</li>
                ))}
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-800 border-b pb-2">Guía Nutricional</h3>
              <ul className="text-sm text-gray-600 space-y-2">
                {fitnessPlan.plan.nutrition_plan.split('•').filter(Boolean).map((line: string, i: number) => (
                  <li key={i} className="flex gap-2"><span className="text-orange-500">•</span> {line.trim()}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tercera fila: Suscripción y QR */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Suscripción */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <CreditCard size={18} className="text-indigo-500" />
              Suscripción
            </h2>
            <div className="space-y-3 text-sm mb-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Plan actual</span>
                <span className="font-semibold text-gray-800 capitalize">{currentPlan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Estado</span>
                <span className={`font-semibold ${subStatus === 'active' ? 'text-green-600' : 'text-red-500'}`}>
                  {subStatus === 'active' ? 'Activa' : subStatus === 'suspended' ? 'Suspendida' : 'Inactiva'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cobro mensual</span>
                <span className="font-semibold text-gray-800">{monthlyAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Próximo cobro</span>
                <span className="font-semibold text-gray-800">{nextBilling}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Miembro desde</span>
                <span className="font-semibold text-gray-800">
                  {memberData?.created_at
                    ? new Date(memberData.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '—'}
                </span>
              </div>
            </div>

            {/* Botón Pagar Ahora si no está activa */}
            {subStatus !== 'active' && (
              <div className="mb-4">
                <button
                  onClick={async () => {
                    try {
                      setChangingPlan(true);
                      const { data } = await billingApi.createCheckout(currentPlan);
                      if (data?.checkoutUrl) {
                        window.location.href = data.checkoutUrl;
                      }
                    } catch {
                      alert('Error al generar link de pago');
                    } finally {
                      setChangingPlan(false);
                    }
                  }}
                  disabled={changingPlan}
                  className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {changingPlan ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Pagar suscripción ahora
                </button>
                <p className="text-[10px] text-gray-400 mt-1 text-center italic">
                  Serás redirigido a MercadoPago (Zona de Pruebas)
                </p>
              </div>
            )}

            {/* Cambio de plan */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
                <TrendingUp size={12} /> Cambiar plan
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(['basic', 'premium', 'vip'] as const).map((plan) => (
                  <button
                    key={plan}
                    onClick={() => handleChangePlan(plan)}
                    disabled={changingPlan || currentPlan === plan}
                    className={`py-2 rounded-lg text-xs font-semibold transition-colors ${
                      currentPlan === plan
                        ? 'bg-indigo-100 text-indigo-700 cursor-default'
                        : 'bg-gray-100 hover:bg-indigo-50 hover:text-indigo-700 text-gray-600 disabled:opacity-50'
                    }`}
                  >
                    {changingPlan && currentPlan !== plan ? (
                      <Loader2 size={12} className="animate-spin mx-auto" />
                    ) : (
                      <>
                        <div className="capitalize">{plan}</div>
                        <div className="font-normal text-gray-400">{formatCOP(PLAN_PRICES[plan])}/mes</div>
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* QR de acceso */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <QrCode size={18} className="text-indigo-500" />
              Código QR de Acceso
            </h2>
            <p className="text-xs text-gray-400 mb-4">Válido por 5 minutos. Muéstralo en recepción para acceder.</p>

            {qrCode ? (
              <div className="flex flex-col items-center gap-3">
                <img src={qrCode} alt="QR de acceso" className="w-48 h-48 rounded-lg border border-gray-100" />
                <p className="text-xs text-gray-500">Expira en: <span className="font-semibold text-indigo-600">{timeUntilExpiry()}</span></p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(qrToken || '');
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }}
                  className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  {copied ? '✓ Token copiado' : 'Copiar Token para Validador'}
                </button>
                <button
                  onClick={handleGenerateQR}
                  className="flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <RefreshCw size={14} /> Renovar QR
                </button>
              </div>
            ) : (
              <button
                onClick={handleGenerateQR}
                disabled={loadingQr}
                className="w-full py-2.5 border-2 border-dashed border-indigo-300 hover:border-indigo-500 text-indigo-600 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {loadingQr ? <Loader2 size={15} className="animate-spin" /> : <QrCode size={15} />}
                {loadingQr ? 'Generando...' : 'Generar QR de Acceso'}
              </button>
            )}
          </div>
        </div>

      {/* Historial de pagos */}
      {billing?.payments && billing.payments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Receipt size={18} className="text-indigo-500" />
            Historial de Pagos
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-400 border-b border-gray-100">
                  <th className="pb-2 font-medium">Factura</th>
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium text-right">Monto</th>
                  <th className="pb-2 font-medium text-right">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {billing.payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="py-3 text-gray-500 font-mono text-xs">{p.invoice_number || '—'}</td>
                    <td className="py-3 text-gray-700">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '—'}
                    </td>
                    <td className="py-3 text-gray-700 capitalize">{p.plan || currentPlan}</td>
                    <td className="py-3 text-gray-800 font-semibold text-right">
                      {formatCOP(p.amount ?? 0)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        p.status === 'succeeded'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'failed'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status === 'succeeded' ? 'Pagado' : p.status === 'failed' ? 'Fallido' : p.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
