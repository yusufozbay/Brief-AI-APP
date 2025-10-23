import React, { useState, useEffect } from 'react';
import { referralService } from '../services/referralService';
import { CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface ReferralCodeInputProps {
  onCodeValidated: (code: string, remainingCredits: number) => void;
  onCodeInvalid: () => void;
}

const ReferralCodeInput: React.FC<ReferralCodeInputProps> = ({
  onCodeValidated,
  onCodeInvalid
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'idle' | 'valid' | 'invalid' | 'error'>('idle');
  const [remainingCredits, setRemainingCredits] = useState(0);

  // Auto-validate code when it changes
  useEffect(() => {
    if (code.trim().length >= 5) { // Minimum code length
      validateCode();
    } else {
      setStatus('idle');
    }
  }, [code]);

  const validateCode = async () => {
    if (!code.trim()) {
      setStatus('error');
      return;
    }

    setLoading(true);
    try {
      const credits = await referralService.checkCredits(code.trim().toUpperCase());
      
      if (credits.hasCredits) {
        setStatus('valid');
        setRemainingCredits(credits.remaining);
        onCodeValidated(code.trim().toUpperCase(), credits.remaining);
      } else {
        setStatus('invalid');
        onCodeInvalid();
      }
    } catch (error) {
      console.error('Error validating referral code:', error);
      setStatus('error');
      onCodeInvalid();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <CreditCard className="w-6 h-6 text-blue-600" />
        <h2 className="text-xl font-semibold text-gray-900">
          Referans Kodu Girin
        </h2>
      </div>
      
      <p className="text-gray-600 mb-4">
        Brief oluşturmak için geçerli bir referans kodunuz olmalıdır.
      </p>

      <div className="flex gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setStatus('idle');
            }}
            placeholder="REF12345"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              status === 'valid' ? 'border-green-500 bg-green-50' :
              status === 'invalid' ? 'border-red-500 bg-red-50' :
              status === 'error' ? 'border-red-500 bg-red-50' :
              'border-gray-300'
            }`}
            disabled={loading}
          />
        </div>
        
        {loading && (
          <div className="flex items-center justify-center px-6 py-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Status Messages */}
      {status === 'valid' && (
        <div className="mt-4 flex items-center gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
          <CheckCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Kod geçerli!</p>
          </div>
        </div>
      )}

      {status === 'invalid' && (
        <div className="mt-4 flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
          <XCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Geçersiz kod veya kredi yetersiz</p>
            <p className="text-sm">
              Lütfen geçerli bir referans kodu girin veya kredi limitinizi kontrol edin.
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="mt-4 flex items-center gap-2 text-red-700 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Hata oluştu</p>
            <p className="text-sm">
              Kod doğrulanırken bir hata oluştu. Lütfen tekrar deneyin.
            </p>
          </div>
        </div>
      )}

      <div className="mt-4 text-sm text-gray-500">
        <p>• Referans kodunuzu yukarıdaki alana girin</p>
      </div>
    </div>
  );
};

export default ReferralCodeInput;
