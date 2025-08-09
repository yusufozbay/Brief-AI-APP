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
  qc: {
    ozgunluk: boolean;
    baslik_giris: boolean;
    okunabilirlik: boolean;
    eeat: boolean;
    gorsel: boolean;
    linkleme: boolean;
    sss: boolean;
    dilbilgisi: boolean;
  };
}

interface EditorProps {
  outline: BriefOutline | null;
  validationErrors: ValidationError[];
  isLoading: boolean;
}

export default function Editor({ outline, validationErrors, isLoading }: EditorProps) {
  const exportToMarkdown = () => {
    if (!outline) return;

    let markdown = `# ${outline.outline.h1}\n\n`;
    markdown += `${outline.outline.giris}\n\n`;

    outline.outline.bolumler.forEach((section) => {
      markdown += `## ${section.h2}\n\n`;
      markdown += `${section.icerik_notu}\n\n`;
      
      if (section.media) {
        markdown += `**Media:** ${section.media}\n\n`;
      }
      
      if (section.kilit_bilgi) {
        markdown += `**Kilit Bilgi:** ${section.kilit_bilgi}\n\n`;
      }

      section.alt.forEach((subsection) => {
        markdown += `### ${subsection.h3}\n\n`;
        markdown += `${subsection.icerik_notu}\n\n`;
        
        if (subsection.hikaye_notu) {
          markdown += `*Hikaye Notu:* ${subsection.hikaye_notu}\n\n`;
        }
      });
    });

    // Add FAQ section
    if (outline.faq && outline.faq.length > 0) {
      markdown += `## Sık Sorulan Sorular\n\n`;
      outline.faq.forEach((faq) => {
        markdown += `**${faq.soru}**\n\n${faq.cevap}\n\n`;
      });
    }

    // Download as file
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outline.konu.replace(/\s+/g, '-').toLowerCase()}-outline.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = async () => {
    if (!outline) return;
    
    const json = JSON.stringify(outline, null, 2);
    await navigator.clipboard.writeText(json);
    alert('Outline JSON copied to clipboard!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Generating outline...</span>
      </div>
    );
  }

  if (!outline) {
    return (
      <div className="text-center text-gray-500 py-12">
        <p>No outline generated yet. Submit a topic to get started.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={exportToMarkdown}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Export Markdown
        </button>
        <button
          onClick={copyToClipboard}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
        >
          Copy JSON
        </button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-semibold mb-2">Validation Errors</h3>
          <ul className="space-y-1">
            {validationErrors.map((error, index) => (
              <li key={index} className="text-red-700 text-sm">
                <span className="font-medium">{error.type}:</span> {error.message}
                {error.location && <span className="text-red-500"> ({error.location})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strategy Overview */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-semibold mb-2">Strategy Overview</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Intent:</span> {outline.strateji.intent}
          </div>
          <div>
            <span className="font-medium">Tone:</span> {outline.strateji.tone}
          </div>
          <div className="md:col-span-2">
            <span className="font-medium">UVP:</span> {outline.strateji.uvp}
          </div>
          <div className="md:col-span-2">
            <span className="font-medium">Target Keyword:</span> {outline.strateji.hedef_anahtar}
          </div>
        </div>
      </div>

      {/* Title & Meta */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="text-green-800 font-semibold mb-2">Title & Meta</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium">Click Title:</span> {outline.title_meta.title_click}
          </div>
          <div>
            <span className="font-medium">SEO Title:</span> {outline.title_meta.title_seo}
          </div>
          <div>
            <span className="font-medium">Meta Description:</span> {outline.title_meta.meta}
          </div>
        </div>
      </div>

      {/* Main Outline */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-4">{outline.outline.h1}</h1>
        
        <div className="prose max-w-none">
          <p className="text-gray-700 mb-6">{outline.outline.giris}</p>

          {outline.outline.bolumler.map((section, index) => (
            <div key={index} className="mb-8">
              <h2 className="text-xl font-semibold mb-3">{section.h2}</h2>
              
              <p className="text-gray-700 mb-3">{section.icerik_notu}</p>
              
              {section.media && (
                <div className="bg-gray-50 p-3 rounded mb-3">
                  <span className="font-medium text-gray-600">Media:</span> {section.media}
                </div>
              )}
              
              {section.kilit_bilgi && (
                <div className="bg-yellow-50 p-3 rounded mb-4">
                  <span className="font-medium text-yellow-800">Key Info:</span> {section.kilit_bilgi}
                </div>
              )}

              {section.alt.map((subsection, subIndex) => (
                <div key={subIndex} className="ml-4 mb-4">
                  <h3 className="text-lg font-medium mb-2">{subsection.h3}</h3>
                  <p className="text-gray-700">{subsection.icerik_notu}</p>
                  {subsection.hikaye_notu && (
                    <p className="text-gray-600 italic mt-2">Story Note: {subsection.hikaye_notu}</p>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      {outline.faq && outline.faq.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {outline.faq.map((faq, index) => (
              <div key={index} className="border-b border-gray-100 pb-4 last:border-b-0">
                <h3 className="font-medium text-gray-900 mb-2">{faq.soru}</h3>
                <p className="text-gray-700">{faq.cevap}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Check */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-gray-800 font-semibold mb-2">Quality Check</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          {Object.entries(outline.qc).map(([key, value]) => (
            <div key={key} className="flex items-center">
              <span className={`w-3 h-3 rounded-full mr-2 ${value ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span className="capitalize">{key.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
