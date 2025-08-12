'use client';

import React from 'react';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
  const exportToHtml = () => {
    if (!outline) return;

    const htmlContent = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>İçerik Stratejisi ve Planı</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #1e3a8a; margin-top: 25px; }
    h4 { color: #1e3a8a; margin-top: 20px; }
    ul { padding-left: 20px; }
    li { margin-bottom: 5px; }
    strong { color: #1f2937; }
    p { margin-bottom: 15px; }
  </style>
</head>
<body>
${outline}
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brief_${new Date().getTime()}.html`;
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
              onClick={exportToHtml}
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
        <div className="bg-gray-50 rounded-lg p-6 border">
          <div 
            className="prose prose-sm max-w-none text-gray-800 leading-relaxed"
            style={{
              fontSize: '14px',
              lineHeight: '1.6'
            }}
            dangerouslySetInnerHTML={{ __html: outline || '' }}
          />
        </div>
      </div>
    </div>
  );
}
