'use client';

import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '@/lib/api';
import { MergedSkinConfig } from '../types/skinConfig';
import SkinRenderer from './SkinRenderer';

interface ChatbotWidgetProps {
  apiUrl?: string;
  treeId?: number;
  websiteId?: number;
  domain?: string;
  skinId?: number; // New: Direct skin selection
  userId?: string; // New: User ID for memory system
  useMemory?: boolean; // New: Enable memory (default: true)
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  theme?: {
    primaryColor?: string;
    backgroundColor?: string;
    textColor?: string;
  };
  // New: Allow passing skin config directly
  skinConfig?: MergedSkinConfig;
}

export default function ChatbotWidget({
  apiUrl: propApiUrl,
  treeId,
  websiteId,
  domain,
  skinId,
  userId,
  useMemory = true,
  position = 'bottom-right',
  theme = {},
  skinConfig: propSkinConfig,
}: ChatbotWidgetProps) {
  const apiUrl = propApiUrl ?? getApiBaseUrl();

  const [resolvedTreeId, setResolvedTreeId] = useState<number | null>(treeId || null);
  const [skinConfig, setSkinConfig] = useState<MergedSkinConfig | null>(propSkinConfig || null);
  const [configLoaded, setConfigLoaded] = useState(!!treeId || !!propSkinConfig);

  // Load widget config if websiteId or domain is provided
  useEffect(() => {
    const loadConfig = async () => {
      // If skin config is provided directly, use it
      if (propSkinConfig) {
        setSkinConfig(propSkinConfig);
        setConfigLoaded(true);
        return;
      }

      if (treeId) {
        // Manual treeId provided, create basic config from theme
        const basicConfig: MergedSkinConfig = {
          theme: {
            primaryColor: theme.primaryColor || '#6366f1',
            backgroundColor: theme.backgroundColor || '#ffffff',
            textColor: theme.textColor || '#1f2937',
          },
          components: {
            button: {
              position: position,
            },
          },
        };
        setSkinConfig(basicConfig);
        setConfigLoaded(true);
        return;
      }

      // Priority: skinId > websiteId > domain
      if (skinId || websiteId || domain) {
        try {
          const params = new URLSearchParams();
          if (skinId) {
            params.append('skinId', skinId.toString());
          } else if (websiteId) {
            params.append('websiteId', websiteId.toString());
          } else if (domain) {
            params.append('domain', domain);
          }

          const url = `${apiUrl}/widget/config?${params.toString()}`;

          const response = await fetch(url);

          if (response.ok) {
            const widgetConfig = await response.json();

            setResolvedTreeId(widgetConfig.treeId);

            // Use full skin config if available, otherwise create from legacy theme
            if (widgetConfig.skin?.config) {
              console.log('[ChatbotWidget] ✅ Using full skin config:', {
                theme: widgetConfig.skin.config.theme,
                primaryColor: widgetConfig.skin.config.theme?.primaryColor,
                backgroundColor: widgetConfig.skin.config.theme?.backgroundColor,
                textColor: widgetConfig.skin.config.theme?.textColor,
                meta: widgetConfig.skin.config._meta,
              });
              setSkinConfig(widgetConfig.skin.config);
            } else if (widgetConfig.theme) {
              // Legacy: create config from theme
              const legacyConfig: MergedSkinConfig = {
                theme: {
                  primaryColor: theme.primaryColor || widgetConfig.theme?.primaryColor || '#6366f1',
                  backgroundColor: theme.backgroundColor || widgetConfig.theme?.backgroundColor || '#ffffff',
                  textColor: theme.textColor || widgetConfig.theme?.textColor || '#1f2937',
                },
                components: {
                  button: {
                    position: position || widgetConfig.position || 'bottom-right',
                  },
                },
              };
              setSkinConfig(legacyConfig);
            } else {
              // Fallback to defaults
              const defaultConfig: MergedSkinConfig = {
                theme: {
                  primaryColor: theme.primaryColor || '#6366f1',
                  backgroundColor: theme.backgroundColor || '#ffffff',
                  textColor: theme.textColor || '#1f2937',
                },
                components: {
                  button: {
                    position: position || 'bottom-right',
                  },
                },
              };
              setSkinConfig(defaultConfig);
            }
            setConfigLoaded(true);
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to load widget config:', errorData);
            // Still create a basic config so widget can show error
            const errorConfig: MergedSkinConfig = {
              theme: {
                primaryColor: theme.primaryColor || '#6366f1',
                backgroundColor: theme.backgroundColor || '#ffffff',
                textColor: theme.textColor || '#1f2937',
              },
              components: {
                button: {
                  position: position || 'bottom-right',
                },
              },
            };
            setSkinConfig(errorConfig);
            setConfigLoaded(true);
          }
        } catch (error: any) {
          console.error('[ChatbotWidget] ❌ Error loading widget config:', {
            error,
            message: error?.message,
            stack: error?.stack,
            skinId,
            websiteId,
            domain,
            apiUrl,
          });
          // Still create a basic config so widget can show error
          const errorConfig: MergedSkinConfig = {
            theme: {
              primaryColor: theme.primaryColor || '#6366f1',
              backgroundColor: theme.backgroundColor || '#ffffff',
              textColor: theme.textColor || '#1f2937',
            },
            components: {
              button: {
                position: position || 'bottom-right',
              },
            },
          };
          setSkinConfig(errorConfig);
          setConfigLoaded(true);
        }
      } else {
        // Try auto-detect from domain
        const currentDomain = typeof window !== 'undefined' ? window.location.hostname : null;
        if (currentDomain && currentDomain !== 'localhost' && currentDomain !== '127.0.0.1') {
          try {
            const response = await fetch(`${apiUrl}/widget/config?domain=${encodeURIComponent(currentDomain)}`);
            if (response.ok) {
              const widgetConfig = await response.json();
              setResolvedTreeId(widgetConfig.treeId);

              if (widgetConfig.skin?.config) {
                setSkinConfig(widgetConfig.skin.config);
              } else {
                const legacyConfig: MergedSkinConfig = {
                  theme: {
                    primaryColor: theme.primaryColor || widgetConfig.theme?.primaryColor || '#6366f1',
                    backgroundColor: theme.backgroundColor || widgetConfig.theme?.backgroundColor || '#ffffff',
                    textColor: theme.textColor || widgetConfig.theme?.textColor || '#1f2937',
                  },
                  components: {
                    button: {
                      position: position || widgetConfig.position || 'bottom-right',
                    },
                  },
                };
                setSkinConfig(legacyConfig);
              }
            }
          } catch (error) {}
        }
        setConfigLoaded(true);
      }
    };

    loadConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skinId, websiteId, domain, apiUrl, propSkinConfig]);

  // Don't render if config not loaded or no skin config
  if (!configLoaded || !skinConfig) {
    return null;
  }

  // Use SkinRenderer for data-driven UI
  // Note: treeId can be null - SkinRenderer will handle it gracefully
  // Key forces re-render when config changes - includes skinId and theme colors to detect changes
  const renderKey = `skin-${skinId || skinConfig._meta?.skinId || 'default'}-${skinConfig.theme?.primaryColor || 'no-color'}-${skinConfig.theme?.backgroundColor || 'no-bg'}`;

  return (
    <>
      <SkinRenderer key={renderKey} config={skinConfig} apiUrl={apiUrl} treeId={resolvedTreeId} userId={userId} useMemory={useMemory} />
    </>
  );
}
