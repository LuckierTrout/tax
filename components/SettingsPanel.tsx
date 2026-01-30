'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Settings, Save } from 'lucide-react';
import { TaxonomySettings } from '@/types/taxonomy';

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
            </div>
          ) : (
            <div className="text-red-500">Failed to load settings</div>
          )}
        </div>
      </div>
    </div>
  );
}
