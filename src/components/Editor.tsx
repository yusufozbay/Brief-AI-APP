'use client';

import React from 'react';

interface ValidationError {
  type: string;
  message: string;
  location?: string;
}

interface OutlineSection {
  h2: string;
  icerik_notu: string;
  media: string;
  kilit_bilgi: string;
  alt: Array<{
    h3: string;
    icerik_notu: string;
    hikaye_notu?: string;
  }>;
}

interface BriefOutline {
  konu: string;
  strateji: {
    intent: string;
    tone: string;
    uvp: string;
    rekabet_ozeti: string;
    hedef_anahtar: string;
    ikincil_anahtarlar: string[];
  };
  title_meta: {
    title_click: string;
    title_seo: string;
    meta: string;
  };
  outline: {
    h1: string;
    giris: string;
    bolumler: OutlineSection[];
  };
  eeat: {
    yazar_onerisi: string;
    veri_kaynak_onerileri: string[];
    entity_entegrasyonu: string[];
    guncellik_plani: {
      yillik_kontrol: string;
      veri_tazeleme: string;
    };
  };
  schema_org: {
    ana: string;
    destekleyici: string[];
    gerekce: string;
  };
  faq: Array<{
    soru: string;
    cevap: string;
  }>;
}

interface EditorProps {
  outline: string | null;
  isLoading: boolean;
}

export default function Editor({ outline, isLoading }: EditorProps) {
  const exportToMarkdown = () => {
    if (!outline) return;

    const blob = new Blob([outline], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brief_${new Date().getTime()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!outline) return;
    
    try {
      await navigator.clipboard.writeText(outline);
      alert('İçerik panoya kopyalandı!');
    } catch (err) {
      console.error('Panoya kopyalama hatası:', err);
      alert('Panoya kopyalama başarısız oldu.');
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="text-lg text-gray-600">Brief oluşturuluyor...</span>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          Bu işlem 30-60 saniye sürebilir
        </div>
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <div className="text-gray-500 text-lg">
          Henüz outline oluşturulmadı. Bir konu girerek başlayın.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">İçerik Stratejisi ve Planı</h2>
          <div className="flex space-x-2">
            <button
              onClick={copyToClipboard}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <span>📋</span>
              <span>Kopyala</span>
            </button>
            <button
              onClick={exportToMarkdown}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition-colors duration-200 flex items-center space-x-2"
            >
              <span>📄</span>
              <span>İndir</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="bg-gray-50 rounded-lg p-4 border">
          <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono leading-relaxed overflow-x-auto">
            {outline}
          </pre>
        </div>
      </div>
    </div>
  );
}
