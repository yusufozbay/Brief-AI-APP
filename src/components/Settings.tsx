'use client';

import React, { useState } from 'react';

interface ModelSettings {
  temperature: number;
  topP: number;
  topK: number;
  maxTokens: number;
  language: string;
}

interface SettingsProps {
  settings: ModelSettings;
  onSettingsChange: (settings: ModelSettings) => void;
  showSchema: boolean;
  onToggleSchema: () => void;
}

export default function Settings({ 
  settings, 
  onSettingsChange, 
  showSchema, 
  onToggleSchema 
}: SettingsProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSettingChange = (key: keyof ModelSettings, value: number | string) => {
    onSettingsChange({
      ...settings,
      [key]: value
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 p-4">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900">Model Parameters</h3>
            
            {/* Temperature */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Temperature: {settings.temperature}
              </label>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) => handleSettingChange('temperature', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Conservative</span>
                <span>Creative</span>
              </div>
            </div>

            {/* Top P */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top P: {settings.topP}
              </label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={settings.topP}
                onChange={(e) => handleSettingChange('topP', parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Top K */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Top K: {settings.topK}
              </label>
              <input
                type="range"
                min="1"
                max="100"
                step="1"
                value={settings.topK}
                onChange={(e) => handleSettingChange('topK', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Max Tokens: {settings.maxTokens}
              </label>
              <input
                type="range"
                min="1000"
                max="8000"
                step="500"
                value={settings.maxTokens}
                onChange={(e) => handleSettingChange('maxTokens', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            {/* Language */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => handleSettingChange('language', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="tr">Turkish</option>
                <option value="en">English</option>
                <option value="de">German</option>
                <option value="fr">French</option>
                <option value="es">Spanish</option>
              </select>
            </div>

            {/* Schema Toggle */}
            <div className="border-t pt-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={showSchema}
                  onChange={onToggleSchema}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">
                  Show JSON Schema
                </span>
              </label>
            </div>

            {/* Reset to Defaults */}
            <button
              onClick={() => onSettingsChange({
                temperature: 0.4,
                topP: 0.9,
                topK: 40,
                maxTokens: 6000,
                language: 'tr'
              })}
              className="w-full px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
