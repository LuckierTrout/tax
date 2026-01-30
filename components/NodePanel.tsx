'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { TaxonomyNode, TaxonomySettings, LEVELS_WITH_OBJECTIVE } from '@/types/taxonomy';
import { LEVEL_COLORS, LEVEL_LABELS, getChildLevel } from '@/config/levels';
import { countDescendantsByLevel, getNodePath } from '@/lib/tree-utils';
import { X, Trash2, Plus, ChevronRight, Check, Loader2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface NodePanelProps {
  node: TaxonomyNode;
  allNodes: TaxonomyNode[];
  settings: TaxonomySettings | null;
  onClose: () => void;
  onDelete: () => void;
  onAddChild: () => void;
  onUpdate: (nodeId: string, data: Partial<TaxonomyNode>) => Promise<void>;
}

export function NodePanel({
  node,
  allNodes,
  settings,
  onClose,
  onDelete,
  onAddChild,
  onUpdate,
}: NodePanelProps) {
  const colors = LEVEL_COLORS[node.level];
  const childLevel = getChildLevel(node.level);
  const path = getNodePath(allNodes, node.id);
  const descendantCounts = countDescendantsByLevel(allNodes, node.id);
  const showObjective = LEVELS_WITH_OBJECTIVE.includes(node.level);

  const totalDescendants = Object.values(descendantCounts).reduce(
    (sum, count) => sum + count,
    0
  );

  // Local state for editing
  const [name, setName] = useState(node.name);
  const [objective, setObjective] = useState(node.objective || '');
  const [description, setDescription] = useState(node.description || '');
  const [notes, setNotes] = useState(node.notes || '');
  const [audiences, setAudiences] = useState<string[]>(node.audiences || []);
  const [geographies, setGeographies] = useState<string[]>(node.geographies || []);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showAudienceDropdown, setShowAudienceDropdown] = useState(false);
  const [showGeographyDropdown, setShowGeographyDropdown] = useState(false);
  const audienceDropdownRef = useRef<HTMLDivElement>(null);
  const geographyDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (audienceDropdownRef.current && !audienceDropdownRef.current.contains(event.target as Node)) {
        setShowAudienceDropdown(false);
      }
      if (geographyDropdownRef.current && !geographyDropdownRef.current.contains(event.target as Node)) {
        setShowGeographyDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset local state when node changes
  useEffect(() => {
    setName(node.name);
    setObjective(node.objective || '');
    setDescription(node.description || '');
    setNotes(node.notes || '');
    setAudiences(node.audiences || []);
    setGeographies(node.geographies || []);
    setHasChanges(false);
  }, [node.id, node.name, node.objective, node.description, node.notes, node.audiences, node.geographies]);

  // Check for changes
  useEffect(() => {
    const audiencesChanged = JSON.stringify(audiences) !== JSON.stringify(node.audiences || []);
    const geographiesChanged = JSON.stringify(geographies) !== JSON.stringify(node.geographies || []);
    const changed =
      name !== node.name ||
      objective !== (node.objective || '') ||
      description !== (node.description || '') ||
      notes !== (node.notes || '') ||
      audiencesChanged ||
      geographiesChanged;
    setHasChanges(changed);
  }, [name, objective, description, notes, audiences, geographies, node]);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!hasChanges || isSaving) return;

    setIsSaving(true);
    try {
      await onUpdate(node.id, {
        name,
        objective: objective || undefined,
        description: description || undefined,
        notes: notes || undefined,
        audiences: audiences.length > 0 ? audiences : undefined,
        geographies: geographies.length > 0 ? geographies : undefined,
      });
      setHasChanges(false);
    } catch (error) {
      console.error('Failed to save:', error);
    } finally {
      setIsSaving(false);
    }
  }, [hasChanges, isSaving, node.id, name, objective, description, notes, audiences, geographies, onUpdate]);

  // Toggle audience selection
  const toggleAudience = (audience: string) => {
    setAudiences((prev) =>
      prev.includes(audience)
        ? prev.filter((a) => a !== audience)
        : [...prev, audience]
    );
  };

  // Toggle geography selection
  const toggleGeography = (geography: string) => {
    setGeographies((prev) =>
      prev.includes(geography)
        ? prev.filter((g) => g !== geography)
        : [...prev, geography]
    );
  };

  // Auto-save on blur with debounce
  const handleBlur = useCallback(() => {
    if (hasChanges) {
      handleSave();
    }
  }, [hasChanges, handleSave]);

  return (
    <div className="w-96 bg-white border-l border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={clsx('w-3 h-3 rounded-full', colors.dot)} />
          <span
            className={clsx(
              'text-xs font-medium px-2 py-0.5 rounded',
              colors.bg,
              colors.text
            )}
          >
            {LEVEL_LABELS[node.level]}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 disabled:opacity-50"
            >
              {isSaving ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Check className="w-3 h-3" />
              )}
              Save
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Breadcrumb */}
        {path.length > 1 && (
          <div className="flex items-center gap-1 text-xs text-gray-500 flex-wrap">
            {path.slice(0, -1).map((p) => (
              <span key={p.id} className="flex items-center gap-1">
                <span className="hover:text-gray-700">{p.name}</span>
                <ChevronRight className="w-3 h-3" />
              </span>
            ))}
          </div>
        )}

        {/* Name - Editable */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={handleBlur}
            className="w-full px-3 py-2 text-lg font-bold text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Objective - only for pillar, narrative_theme, subject */}
        {showObjective && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
              Objective
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              onBlur={handleBlur}
              rows={4}
              className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-blue-50"
              placeholder="Define the goal or purpose..."
            />
          </div>
        )}

        {/* Description */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={handleBlur}
            rows={3}
            className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="Add a description..."
          />
        </div>

        {/* Notes - Internal only */}
        <div>
          <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
            Notes <span className="text-gray-400 normal-case">(internal, not shown in chart)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={handleBlur}
            rows={4}
            className="w-full px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none bg-yellow-50"
            placeholder="Add internal notes..."
          />
        </div>

        {/* Audiences */}
        {settings && (
          <div className="relative" ref={audienceDropdownRef}>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
              Audiences
            </label>
            <div
              onClick={() => setShowAudienceDropdown(!showAudienceDropdown)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 min-h-[42px] flex flex-wrap gap-1 items-center"
            >
              {audiences.length === 0 ? (
                <span className="text-gray-400 text-sm">Select audiences...</span>
              ) : (
                audiences.map((audience) => (
                  <span
                    key={audience}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs"
                  >
                    {audience}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAudience(audience);
                      }}
                      className="hover:bg-blue-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
            </div>
            {showAudienceDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {settings.availableAudiences.map((audience) => (
                  <div
                    key={audience}
                    onClick={() => toggleAudience(audience)}
                    className={clsx(
                      'px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between text-sm',
                      audiences.includes(audience) && 'bg-blue-50'
                    )}
                  >
                    <span>{audience}</span>
                    {audiences.includes(audience) && (
                      <Check className="w-4 h-4 text-blue-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Geographies */}
        {settings && (
          <div className="relative" ref={geographyDropdownRef}>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-1">
              Geographies
            </label>
            <div
              onClick={() => setShowGeographyDropdown(!showGeographyDropdown)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg cursor-pointer hover:border-gray-300 min-h-[42px] flex flex-wrap gap-1 items-center"
            >
              {geographies.length === 0 ? (
                <span className="text-gray-400 text-sm">Select geographies...</span>
              ) : (
                geographies.map((geography) => (
                  <span
                    key={geography}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs"
                  >
                    {geography}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGeography(geography);
                      }}
                      className="hover:bg-green-200 rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
              <ChevronDown className="w-4 h-4 text-gray-400 ml-auto flex-shrink-0" />
            </div>
            {showGeographyDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {settings.availableGeographies.map((geography) => (
                  <div
                    key={geography}
                    onClick={() => toggleGeography(geography)}
                    className={clsx(
                      'px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between text-sm',
                      geographies.includes(geography) && 'bg-green-50'
                    )}
                  >
                    <span>{geography}</span>
                    {geographies.includes(geography) && (
                      <Check className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Statistics */}
        {totalDescendants > 0 && (
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider block mb-2">
              Hierarchy
            </label>
            <div className="bg-gray-50 rounded-lg p-3 text-sm">
              {Object.entries(descendantCounts).map(([level, count]) => (
                <div key={level} className="flex justify-between mb-1">
                  <span className="text-gray-600">
                    {LEVEL_LABELS[level as keyof typeof LEVEL_LABELS]}s:
                  </span>
                  <span className="font-medium">{count}</span>
                </div>
              ))}
              <hr className="my-2" />
              <div className="flex justify-between font-medium">
                <span className="text-gray-700">Total Descendants:</span>
                <span>{totalDescendants}</span>
              </div>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-gray-400 pt-2 border-t border-gray-100">
          <p>Created: {new Date(node.createdAt).toLocaleDateString()}</p>
          <p>Updated: {new Date(node.updatedAt).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        {childLevel && (
          <button
            onClick={onAddChild}
            className={clsx(
              'w-full px-4 py-2 text-sm font-medium rounded-lg flex items-center justify-center gap-2',
              'text-blue-600 bg-blue-50 hover:bg-blue-100'
            )}
          >
            <Plus className="w-4 h-4" />
            Add {LEVEL_LABELS[childLevel]}
          </button>
        )}

        <button
          onClick={onDelete}
          className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </div>
  );
}
