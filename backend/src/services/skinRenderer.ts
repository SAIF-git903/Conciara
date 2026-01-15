/**
 * Skin Renderer Utilities
 * 
 * Helper functions for rendering UI based on skin configuration.
 * This provides utilities that can be used by both React and vanilla JS widgets.
 */

import { MergedSkinConfig, DEFAULT_SKIN_CONFIG } from '../types/skinConfig.js';

/**
 * Get theme color with fallback
 */
export function getThemeColor(
  config: MergedSkinConfig,
  colorKey: 'primaryColor' | 'secondaryColor' | 'backgroundColor' | 'textColor' | 'borderColor' | 'accentColor'
): string {
  return config.theme?.[colorKey] || DEFAULT_SKIN_CONFIG.theme?.[colorKey] || '#6366f1';
}

/**
 * Get button configuration
 */
export function getButtonConfig(config: MergedSkinConfig) {
  return config.components?.button || DEFAULT_SKIN_CONFIG.components?.button || {};
}

/**
 * Get window configuration
 */
export function getWindowConfig(config: MergedSkinConfig) {
  return config.components?.window || DEFAULT_SKIN_CONFIG.components?.window || {};
}

/**
 * Get header configuration
 */
export function getHeaderConfig(config: MergedSkinConfig) {
  return config.components?.header || DEFAULT_SKIN_CONFIG.components?.header || {};
}

/**
 * Get messages configuration
 */
export function getMessagesConfig(config: MergedSkinConfig) {
  return config.components?.messages || DEFAULT_SKIN_CONFIG.components?.messages || {};
}

/**
 * Get input configuration
 */
export function getInputConfig(config: MergedSkinConfig) {
  return config.components?.input || DEFAULT_SKIN_CONFIG.components?.input || {};
}

/**
 * Get quick replies configuration
 */
export function getQuickRepliesConfig(config: MergedSkinConfig) {
  return config.components?.quickReplies || DEFAULT_SKIN_CONFIG.components?.quickReplies || {};
}

/**
 * Get loading state configuration
 */
export function getLoadingConfig(config: MergedSkinConfig) {
  return config.states?.loading || DEFAULT_SKIN_CONFIG.states?.loading || {};
}

/**
 * Get empty state configuration
 */
export function getEmptyConfig(config: MergedSkinConfig) {
  return config.states?.empty || DEFAULT_SKIN_CONFIG.states?.empty || {};
}

/**
 * Get error state configuration
 */
export function getErrorConfig(config: MergedSkinConfig) {
  return config.states?.error || DEFAULT_SKIN_CONFIG.states?.error || {};
}

/**
 * Get button size in pixels
 */
export function getButtonSize(size?: 'small' | 'medium' | 'large'): number {
  switch (size) {
    case 'small':
      return 48;
    case 'medium':
      return 56;
    case 'large':
      return 64;
    default:
      return 56;
  }
}

/**
 * Get shadow CSS value
 */
export function getShadowCSS(shadow?: 'none' | 'small' | 'medium' | 'large'): string {
  switch (shadow) {
    case 'none':
      return 'none';
    case 'small':
      return '0 2px 8px rgba(0, 0, 0, 0.1)';
    case 'medium':
      return '0 4px 16px rgba(0, 0, 0, 0.15)';
    case 'large':
      return '0 20px 60px rgba(0, 0, 0, 0.3)';
    default:
      return '0 20px 60px rgba(0, 0, 0, 0.3)';
  }
}

/**
 * Get position CSS
 */
export function getPositionCSS(position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'): string {
  switch (position) {
    case 'bottom-right':
      return 'bottom: 1rem; right: 1rem;';
    case 'bottom-left':
      return 'bottom: 1rem; left: 1rem;';
    case 'top-right':
      return 'top: 1rem; right: 1rem;';
    case 'top-left':
      return 'top: 1rem; left: 1rem;';
    default:
      return 'bottom: 1rem; right: 1rem;';
  }
}

/**
 * Validate skin config structure
 */
export function validateSkinConfig(config: any): boolean {
  if (!config || typeof config !== 'object') {
    return false;
  }

  // Basic validation - config should have theme or components
  return !!(config.theme || config.components || config.states);
}

