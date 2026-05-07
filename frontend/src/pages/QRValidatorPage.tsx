import { useState, useEffect, useRef } from 'react';
import { authApi } from '../api/api';
import { QrCode, CheckCircle, XCircle, Loader2, ScanLine, RotateCcw, Camera, CameraOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ValidationResult {
  valid: boolean;
  reason?: string;
  member?: {
    id: string;
    name: string;
    email: string;
    subscription_plan: string;
    subscription_status: string;
    role: string;
  };
}

export default function QRValidatorPage() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const SCANNER_ID = 'qr-scanner-container';

  const handleValidate = async (tokenValue?: string) => {
    const t = (tokenValue ?? token).trim();
    if (!t) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await authApi.validateQR(t);
      setResult(data);
    } catch {
      setResult({ valid: false, reason: 'Error al conectar con el servidor' });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setToken('');
    setResult(null);
  };

  const startScanner = async () => {
    setCameraError(null);
    setScanning(true);
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch {
        // ignorar errores al detener
      }
      scannerRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    if (!scanning) return;

    const scanner = new Html5Qrcode(SCANNER_ID);
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'user' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          await stopScanner();
          setToken(decodedText);
          await handleValidate(decodedText);
        },
        () => {
          // frame sin QR, ignorar
        },
      )
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err);
        setCameraError('No se pudo acceder a la cámara. Verifica los permisos. ' + msg);
        setScanning(false);
      });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Validación de Acceso</h1>
        <p className="text-gray-500 mt-1">Escanea con la cámara o pega el token del código QR del socio.</p>
      </div>

      {/* Escáner de cámara */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <Camera size={18} className="text-indigo-500" />
          <span className="font-medium text-sm">Escanear con cámara</span>
        </div>

        {!scanning ? (
          <button
            onClick={startScanner}
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Camera size={16} />
            Activar cámara
          </button>
        ) : (
          <div className="space-y-3">
            <div
              id={SCANNER_ID}
              className="w-full rounded-lg overflow-hidden bg-black"
              style={{ minHeight: '300px' }}
            />
            <button
              onClick={stopScanner}
              className="w-full py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <CameraOff size={15} />
              Detener cámara
            </button>
          </div>
        )}

        {cameraError && (
          <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{cameraError}</p>
        )}
      </div>

      {/* Separador */}
      <div className="flex items-center gap-3 text-gray-400 text-sm">
        <div className="flex-1 border-t border-gray-200" />
        <span>o ingresa el token manualmente</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>

      {/* Input de token */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
        <div className="flex items-center gap-2 text-gray-600 mb-2">
          <ScanLine size={18} className="text-indigo-500" />
          <span className="font-medium text-sm">Token del QR</span>
        </div>
        <textarea
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Pega aquí el token del código QR del socio..."
          rows={4}
          className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <div className="flex gap-3">
          <button
            onClick={() => handleValidate()}
            disabled={!token.trim() || loading}
            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />}
            {loading ? 'Validando...' : 'Validar Acceso'}
          </button>
          {result && (
            <button
              onClick={handleReset}
              className="px-4 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2"
            >
              <RotateCcw size={15} />
              Nuevo
            </button>
          )}
        </div>
      </div>

      {/* Resultado */}
      {result && (
        <div className={`rounded-xl border-2 p-6 ${result.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          {result.valid ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle size={28} className="text-green-600" />
                </div>
                <div>
                  <p className="text-lg font-bold text-green-800">Acceso Permitido</p>
                  <p className="text-sm text-green-600">Suscripción activa y token válido</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 space-y-3 border border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <span className="text-indigo-700 font-bold text-sm">
                      {result.member!.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{result.member!.name}</p>
                    <p className="text-sm text-gray-500">{result.member!.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs">Plan</p>
                    <p className="font-semibold text-gray-700 capitalize">{result.member!.subscription_plan}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Estado</p>
                    <span className="inline-block px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                      Activo
                    </span>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs">Rol</p>
                    <p className="font-semibold text-gray-700 capitalize">{result.member!.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                <XCircle size={28} className="text-red-500" />
              </div>
              <div>
                <p className="text-lg font-bold text-red-800">Acceso Denegado</p>
                <p className="text-sm text-red-600">{result.reason || 'Token inválido o expirado'}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instrucciones */}
      {!result && (
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100 text-sm text-blue-700">
          <p className="font-semibold mb-1">¿Cómo funciona?</p>
          <ol className="list-decimal list-inside space-y-1 text-blue-600">
            <li>El socio genera su QR en <strong>Mi Perfil → Generar QR</strong></li>
            <li>El admin activa la cámara y apunta al QR del socio</li>
            <li>El sistema detecta el QR automáticamente y valida el acceso</li>
            <li>También puedes pegar el token manualmente si lo prefieres</li>
          </ol>
        </div>
      )}
    </div>
  );
}
