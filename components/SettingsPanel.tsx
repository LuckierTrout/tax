'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Save, RotateCcw } from 'lucide-react';
import { TaxonomySettings, TaxonomyLevel, LevelColorConfig, PillColorConfig } from '@/types/taxonomy';
import { LEVEL_ORDER, LEVEL_LABELS, DEFAULT_LEVEL_COLORS_HEX, getDefaultAudienceColor, getDefaultGeographyColor } from '@/config/levels';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange: (settings: TaxonomySettings) => void;
}

export function SettingsPanel({ isOpen, onClose, onSettingsChange }: SettingsPanelProps) {
  const [settings, setSettings] = useState<TaxonomySettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newAudience, setNewAudience] = useState('');
  const [newGeography, setNewGeography] = useState('');

  // Fetch settings on mount
  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      const data = await res.json();
      setSettings(data.settings);
    } catch (err) {
      console.error('Error fetching settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async (updatedSettings: TaxonomySettings) => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedSettings),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      const data = await res.json();
      setSettings(data.settings);
      onSettingsChange(data.settings);
    } catch (err) {
      console.error('Error saving settings:', err);
      alert('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const addAudience = () => {
    if (!settings || !newAudience.trim()) return;
    if (settings.availableAudiences.includes(newAudience.trim())) {
      alert('This audience already exists');
      return;
    }
    const updated = {
      ...settings,
      availableAudiences: [...settings.availableAudiences, newAudience.trim()],
    };
    setSettings(updated);
    saveSettings(updated);
    setNewAudience('');
  };

  const removeAudience = (audience: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      availableAudiences: settings.availableAudiences.filter((a) => a !== audience),
    };
    setSettings(updated);
    saveSettings(updated);
  };

  const addGeography = () => {
    if (!settings || !newGeography.trim()) return;
    if (settings.availableGeographies.includes(newGeography.trim())) {
      alert('This geography already exists');
      return;
    }
    const updated = {
      ...settings,
      availableGeographies: [...settings.availableGeographies, newGeography.trim()],
    };
    setSettings(updated);
    saveSettings(updated);
    setNewGeography('');
  };

  const removeGeography = (geography: string) => {
    if (!settings) return;
    const updated = {
      ...settings,
      availableGeographies: settings.availableGeographies.filter((g) => g !== geography),
    };
    setSettings(updated);
    saveSettings(updated);
  };

  // Color settings helpers
  const isValidHex = (hex: string): boolean => {
    return /^#[0-9A-Fa-f]{6}$/.test(hex);
  };

  const getLevelColor = (level: TaxonomyLevel, property: keyof LevelColorConfig): string => {
    if (settings?.levelColors?.[level]?.[property]) {
      return settings.levelColors[level][property];
    }
    return DEFAULT_LEVEL_COLORS_HEX[level][property];
  };

  const updateLevelColor = (level: TaxonomyLevel, property: keyof LevelColorConfig, value: string) => {
    if (!settings) return;

    const currentColors = settings.levelColors || { ...DEFAULT_LEVEL_COLORS_HEX };
    const updated = {
      ...settings,
      levelColors: {
        ...currentColors,
        [level]: {
          ...currentColors[level],
          [property]: value,
        },
      },
    };
    setSettings(updated);

    // Only save if valid hex
    if (isValidHex(value)) {
      saveSettings(updated);
    }
  };

  const resetLevelColors = () => {
    if (!settings) return;
    const updated = {
      ...settings,
      levelColors: { ...DEFAULT_LEVEL_COLORS_HEX },
    };
    setSettings(updated);
    saveSettings(updated);
  };

  // Audience color helpers
  const getAudienceColor = (audience: string, property: keyof PillColorConfig): string => {
    if (settings?.audienceColors?.[audience]?.[property]) {
      return settings.audienceColors[audience][property];
    }
    const index = settings?.availableAudiences.indexOf(audience) ?? 0;
    return getDefaultAudienceColor(index)[property];
  };

  const updateAudienceColor = (audience: string, property: keyof PillColorConfig, value: string) => {
    if (!settings) return;

    const index = settings.availableAudiences.indexOf(audience);
    const defaultColor = getDefaultAudienceColor(index);
    const currentColors = settings.audienceColors || {};
    const updated = {
      ...settings,
      audienceColors: {
        ...currentColors,
        [audience]: {
          bg: currentColors[audience]?.bg || defaultColor.bg,
          text: currentColors[audience]?.text || defaultColor.text,
          [property]: value,
        },
      },
    };
    setSettings(updated);

    if (isValidHex(value)) {
      saveSettings(updated);
    }
  };

  const resetAudienceColors = () => {
    if (!settings) return;
    const updated = {
      ...settings,
      audienceColors: undefined,
    };
    setSettings(updated);
    saveSettings(updated);
  };

  // Geography color helpers
  const getGeographyColor = (geography: string, property: keyof PillColorConfig): string => {
    if (settings?.geographyColors?.[geography]?.[property]) {
      return settings.geographyColors[geography][property];
    }
    const index = settings?.availableGeographies.indexOf(geography) ?? 0;
    return getDefaultGeographyColor(index)[property];
  };

  const updateGeographyColor = (geography: string, property: keyof PillColorConfig, value: string) => {
    if (!settings) return;

    const index = settings.availableGeographies.indexOf(geography);
    const defaultColor = getDefaultGeographyColor(index);
    const currentColors = settings.geographyColors || {};
    const updated = {
      ...settings,
      geographyColors: {
        ...currentColors,
        [geography]: {
          bg: currentColors[geography]?.bg || defaultColor.bg,
          text: currentColors[geography]?.text || defaultColor.text,
          [property]: value,
        },
      },
    };
    setSettings(updated);

    if (isValidHex(value)) {
      saveSettings(updated);
    }
  };

  const resetGeographyColors = () => {
    if (!settings) return;
    const updated = {
      ...settings,
      geographyColors: undefined,
    };
    setSettings(updated);
    saveSettings(updated);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">Loading settings...</div>
            </div>
          ) : settings ? (
            <div className="space-y-8">
              {/* Audiences Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Audiences</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Manage the list of audiences that can be assigned to taxonomy items.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {settings.availableAudiences.map((audience) => (
                    <span
                      key={audience}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm"
                    >
                      {audience}
                      <button
                        onClick={() => removeAudience(audience)}
                        className="p-0.5 hover:bg-blue-100 rounded-full"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newAudience}
                    onChange={(e) => setNewAudience(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAudience()}
                    placeholder="Add new audience..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    onClick={addAudience}
                    disabled={!newAudience.trim() || isSaving}
                    className="flex items-center gap-1 px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Geographies Section */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Available Geographies</h3>
                <p className="text-xs text-gray-500 mb-3">
                  Manage the list of geographic regions that can be assigned to taxonomy items.
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {settings.availableGeographies.map((geography) => (
                    <span
                      key={geography}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-full text-sm"
                    >
                      {geography}
                      <button
                        onClick={() => removeGeography(geography)}
                        className="p-0.5 hover:bg-green-100 rounded-full"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newGeography}
                    onChange={(e) => setNewGeography(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGeography()}
                    placeholder="Add new geography..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <button
                    onClick={addGeography}
                    disabled={!newGeography.trim() || isSaving}
                    className="flex items-center gap-1 px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
              </div>

              {/* Tier Colors Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700">Tier Colors</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Customize the colors for each taxonomy level using hex codes.
                    </p>
                  </div>
                  <button
                    onClick={resetLevelColors}
                    disabled={isSaving}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                    title="Reset to default colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>
                <div className="space-y-4">
                  {LEVEL_ORDER.map((level) => (
                    <div key={level} className="border border-gray-200 rounded-lg p-3">
                      <div className="font-medium text-sm text-gray-800 mb-2">
                        {LEVEL_LABELS[level]}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {/* Background Color */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Background</label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded border border-gray-300 flex-shrink-0"
                              style={{ backgroundColor: getLevelColor(level, 'bg') }}
                            />
                            <input
                              type="text"
                              value={getLevelColor(level, 'bg')}
                              onChange={(e) => updateLevelColor(level, 'bg', e.target.value)}
                              placeholder="#FFFFFF"
                              className={`w-full px-2 py-1 border rounded text-xs font-mono ${
                                isValidHex(getLevelColor(level, 'bg'))
                                  ? 'border-gray-300'
                                  : 'border-red-400 bg-red-50'
                              }`}
                            />
                          </div>
                        </div>
                        {/* Border Color */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Border</label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded border-2 flex-shrink-0"
                              style={{ borderColor: getLevelColor(level, 'border'), backgroundColor: '#fff' }}
                            />
                            <input
                              type="text"
                              value={getLevelColor(level, 'border')}
                              onChange={(e) => updateLevelColor(level, 'border', e.target.value)}
                              placeholder="#000000"
                              className={`w-full px-2 py-1 border rounded text-xs font-mono ${
                                isValidHex(getLevelColor(level, 'border'))
                                  ? 'border-gray-300'
                                  : 'border-red-400 bg-red-50'
                              }`}
                            />
                          </div>
                        </div>
                        {/* Dot/Text Color */}
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Dot/Text</label>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded border border-gray-300 flex-shrink-0 flex items-center justify-center"
                              style={{ backgroundColor: '#fff' }}
                            >
                              <div
                                className="w-4 h-4 rounded-full"
                                style={{ backgroundColor: getLevelColor(level, 'dot') }}
                              />
                            </div>
                            <input
                              type="text"
                              value={getLevelColor(level, 'dot')}
                              onChange={(e) => updateLevelColor(level, 'dot', e.target.value)}
                              placeholder="#000000"
                              className={`w-full px-2 py-1 border rounded text-xs font-mono ${
                                isValidHex(getLevelColor(level, 'dot'))
                                  ? 'border-gray-300'
                                  : 'border-red-400 bg-red-50'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Audience Colors Section */}
              {settings.availableAudiences.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">Audience Pill Colors</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Customize colors for each audience pill.
                      </p>
                    </div>
                    <button
                      onClick={resetAudienceColors}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                      title="Reset to default colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  <div className="space-y-3">
                    {settings.availableAudiences.map((audience) => (
                      <div key={audience} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: getAudienceColor(audience, 'bg'),
                              color: getAudienceColor(audience, 'text'),
                            }}
                          >
                            {audience}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Background</label>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: getAudienceColor(audience, 'bg') }}
                              />
                              <input
                                type="text"
                                value={getAudienceColor(audience, 'bg')}
                                onChange={(e) => updateAudienceColor(audience, 'bg', e.target.value)}
                                placeholder="#DBEAFE"
                                className={`w-full px-2 py-1 border rounded text-xs font-mono ${
                                  isValidHex(getAudienceColor(audience, 'bg'))
                                    ? 'border-gray-300'
                                    : 'border-red-400 bg-red-50'
                                }`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Text</label>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0 flex items-center justify-center text-xs font-bold"
                                style={{ color: getAudienceColor(audience, 'text') }}
                              >
                                Aa
                              </div>
                              <input
                                type="text"
                                value={getAudienceColor(audience, 'text')}
                                onChange={(e) => updateAudienceColor(audience, 'text', e.target.value)}
                                placeholder="#1E40AF"
                                className={`w-full px-2 py-1 border rounded text-xs font-mono ${
                                  isValidHex(getAudienceColor(audience, 'text'))
                                    ? 'border-gray-300'
                                    : 'border-red-400 bg-red-50'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Geography Colors Section */}
              {settings.availableGeographies.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-700">Geography Pill Colors</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Customize colors for each geography pill.
                      </p>
                    </div>
                    <button
                      onClick={resetGeographyColors}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded"
                      title="Reset to default colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Reset
                    </button>
                  </div>
                  <div className="space-y-3">
                    {settings.availableGeographies.map((geography) => (
                      <div key={geography} className="border border-gray-200 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span
                            className="px-2 py-1 rounded text-xs font-medium"
                            style={{
                              backgroundColor: getGeographyColor(geography, 'bg'),
                              color: getGeographyColor(geography, 'text'),
                            }}
                          >
                            {geography}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Background</label>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0"
                                style={{ backgroundColor: getGeographyColor(geography, 'bg') }}
                              />
                              <input
                                type="text"
                                value={getGeographyColor(geography, 'bg')}
                                onChange={(e) => updateGeographyColor(geography, 'bg', e.target.value)}
                                placeholder="#D1FAE5"
                                className={`w-full px-2 py-1 border rounded text-xs font-mono ${
                                  isValidHex(getGeographyColor(geography, 'bg'))
                                    ? 'border-gray-300'
                                    : 'border-red-400 bg-red-50'
                                }`}
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Text</label>
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded border border-gray-300 flex-shrink-0 flex items-center justify-center text-xs font-bold"
                                style={{ color: getGeographyColor(geography, 'text') }}
                              >
                                Aa
                              </div>
                              <input
                                type="text"
                                value={getGeographyColor(geography, 'text')}
                                onChange={(e) => updateGeographyColor(geography, 'text', e.target.value)}
                                placeholder="#065F46"
                                className={`w-full px-2 py-1 border rounded text-xs font-mono ${
                                  isValidHex(getGeographyColor(geography, 'text'))
                                    ? 'border-gray-300'
                                    : 'border-red-400 bg-red-50'
                                }`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-red-500">Failed to load settings</div>
          )}
        </div>
      </div>
    </div>
  );
}
