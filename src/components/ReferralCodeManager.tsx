import React, { useState, useEffect } from 'react';
import { referralService, ReferralCode } from '../services/referralService';
import { Plus, Users, CreditCard, Activity, Eye, Copy } from 'lucide-react';

const ReferralCodeManager: React.FC = () => {
  const [referralCodes, setReferralCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCode, setNewCode] = useState({
    clientName: '',
    clientEmail: '',
    creditLimit: 10
  });

  const createReferralCode = async () => {
    if (!newCode.clientName || !newCode.clientEmail) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const referralCode = await referralService.createReferralCode(
        newCode.clientName,
        newCode.clientEmail,
        newCode.creditLimit
      );
      
      setReferralCodes(prev => [referralCode, ...prev]);
      setNewCode({ clientName: '', clientEmail: '', creditLimit: 10 });
      setShowCreateForm(false);
      alert('Referans kodu başarıyla oluşturuldu!');
    } catch (error) {
      console.error('Error creating referral code:', error);
      alert('Referans kodu oluşturulurken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('Kod kopyalandı!');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Referans Kodu Yönetimi
              </h1>
              <p className="text-gray-600">
                Müşteriler için referans kodları oluşturun ve kredi limitlerini yönetin
              </p>
            </div>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Yeni Kod Oluştur
            </button>
          </div>

          {/* Create Form Modal */}
          {showCreateForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-8 w-full max-w-md">
                <h2 className="text-2xl font-bold mb-6">Yeni Referans Kodu</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Müşteri Adı
                    </label>
                    <input
                      type="text"
                      value={newCode.clientName}
                      onChange={(e) => setNewCode(prev => ({ ...prev, clientName: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Müşteri adı girin"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Müşteri E-posta
                    </label>
                    <input
                      type="email"
                      value={newCode.clientEmail}
                      onChange={(e) => setNewCode(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="musteri@example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Kredi Limiti
                    </label>
                    <input
                      type="number"
                      value={newCode.creditLimit}
                      onChange={(e) => setNewCode(prev => ({ ...prev, creditLimit: parseInt(e.target.value) }))}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                      max="100"
                    />
                  </div>
                </div>
                
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={createReferralCode}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                  >
                    {loading ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                  <button
                    onClick={() => setShowCreateForm(false)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 py-2 px-4 rounded-lg"
                  >
                    İptal
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Referral Codes List */}
          <div className="space-y-4">
            {referralCodes.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Henüz referans kodu yok
                </h3>
                <p className="text-gray-500">
                  İlk referans kodunuzu oluşturmak için yukarıdaki butona tıklayın
                </p>
              </div>
            ) : (
              referralCodes.map((code) => (
                <div key={code.id} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        {code.clientName}
                      </h3>
                      <p className="text-gray-600">{code.clientEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-mono">
                        {code.code}
                      </span>
                      <button
                        onClick={() => copyToClipboard(code.code)}
                        className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                        title="Kodu kopyala"
                      >
                        <Copy className="w-4 h-4 text-gray-600" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm text-gray-600">Kalan Kredi</p>
                        <p className="font-semibold text-green-600">
                          {code.creditsRemaining} / {code.creditLimit}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Activity className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-gray-600">Kullanılan</p>
                        <p className="font-semibold text-blue-600">
                          {code.creditsUsed}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-purple-600" />
                      <div>
                        <p className="text-sm text-gray-600">Durum</p>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          code.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {code.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Oluşturulma: {code.createdAt.toLocaleDateString('tr-TR')}</span>
                      <span>Son Güncelleme: {code.updatedAt.toLocaleDateString('tr-TR')}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralCodeManager;
