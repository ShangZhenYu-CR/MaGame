/* Versioned, validated browser-local progress. This module does not start or
 * alter a game: the caller decides when to save and how to restore a stage. */
(function(root, factory) {
  const api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.AntiqueSave = api;
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  const KEY = 'magame08-progress-v1';
  const VERSION = 1;
  const STAGES = new Set(['shop', 'world', 'return', 'repair', 'win']);
  function valid(value) {
    return !!value && typeof value === 'object' && !Array.isArray(value) &&
      value.version === VERSION && STAGES.has(value.stage) &&
      Array.isArray(value.shards) && value.shards.length === 3 &&
      value.shards.every(v => typeof v === 'boolean') &&
      (value.checkpoint === 0 || value.checkpoint === 1) &&
      Number.isInteger(value.repairStep) && value.repairStep >= 0 && value.repairStep <= 2 &&
      (value.dialogue === 0 || value.dialogue === 1) && (value.bridge === undefined || typeof value.bridge === 'boolean');
  }
  function copy(v) {const out={version: VERSION, stage: v.stage, shards: v.shards.slice(), checkpoint: v.checkpoint, repairStep: v.repairStep, dialogue: v.dialogue}; if(v.bridge!==undefined)out.bridge=v.bridge; return out;}
  function storage(explicit) {
    if (explicit !== undefined) return explicit;
    try {return typeof window !== 'undefined' ? window.localStorage : null;} catch (_) {return null;}
  }
  // null means no valid stored progress. Never throw when storage is blocked.
  function load(store) {
    try {const s = storage(store); if (!s) return null; const raw = s.getItem(KEY); if (raw == null) return null; const value = JSON.parse(raw); return valid(value) ? copy(value) : null;} catch (_) {return null;}
  }
  // false means no durable write was made, including invalid input or quota denial.
  function save(progress, store) {
    try {const data = {...progress, version: VERSION}; if (!valid(data)) return false; const s = storage(store); if (!s) return false; s.setItem(KEY, JSON.stringify(copy(data))); return true;} catch (_) {return false;}
  }
  function clear(store) {
    try {const s = storage(store); if (!s) return false; s.removeItem(KEY); return true;} catch (_) {return false;}
  }
  return Object.freeze({KEY, VERSION, load, save, clear});
});
