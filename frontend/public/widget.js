/**
 * ConversaTree Chatbot Widget
 * Standalone JavaScript widget - no iframe needed
 * 
 * Usage (Data Attributes - Recommended):
 * <script 
 *   src="http://localhost:3000/widget.js" 
 *   data-conversatree 
 *   data-api-url="http://localhost:3001/api"
 *   data-tree-id="35"
 *   data-user-id="user123"
 *   data-primary-color="#6366f1"
 *   data-position="bottom-right">
 * </script>
 * 
 * Usage (Programmatic):
 * <script src="http://localhost:3000/widget.js"></script>
 * <script>
 *   ConversaTree.init({
 *     apiUrl: 'http://localhost:3001/api',
 *     treeId: 35,
 *     userId: 'user123',
 *     primaryColor: '#6366f1',
 *     position: 'bottom-right'
 *   });
 * </script>
 * 
 * Available Data Attributes:
 * - data-api-url: Backend API URL
 * - data-tree-id: Dialog tree ID (direct selection)
 * - data-skin-id: Skin ID (direct selection)
 * - data-website-id: Website ID (auto-config)
 * - data-domain: Domain name (auto-config, e.g., "example.com")
 * - data-user-id: User ID for memory system
 * - data-use-memory: Enable memory (true/false, default: true)
 * - data-primary-color: Primary color (e.g., "#6366f1")
 * - data-background-color: Background color (e.g., "#ffffff")
 * - data-text-color: Text color (e.g., "#1f2937")
 * - data-position: Widget position (bottom-right, bottom-left, top-right, top-left)
 * - data-title: Widget title (e.g., "Chat Assistant")
 */

(function() {
  'use strict';

  // Default configuration
  const defaults = {
    apiUrl: 'http://localhost:3001/api',
    treeId: null,
    websiteId: null,
    domain: null,
    skinId: null,  // New: Direct skin selection
    userId: null,  // New: User ID for memory system
    useMemory: true,  // New: Enable memory (default: true)
    position: 'bottom-right',
    primaryColor: '#6366f1',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    buttonText: 'Chat',
    title: 'Chat Assistant'
  };
  console.log('defaults', defaults);

  // Widget class
  class ConversaTreeWidget {
    constructor(config) {
      // Store raw config (user-provided values only, not merged with defaults)
      this.rawConfig = { ...config };
      // Store defaults separately to detect if user explicitly provided values
      this.defaults = { ...defaults };
      this.config = { ...defaults };
      this.skinConfig = null; // Full skin config from API (includes components, states, etc.)
      this.sessionId = null;
      this.isOpen = false;
      this.isMinimized = false;
      this.messages = [];
      this.quickReplies = [];
      this.isLoading = false;
      this.container = null;
      this.configLoaded = false;
      this.isSendingMessage = false;
      this.eventListenersAttached = false;
      
      // Load config asynchronously if websiteId or domain is provided
      this.loadConfig().then(() => {
        this.init();
      }).catch((error) => {
        console.error('Error loading widget config:', error);
        // Still initialize with defaults
        this.configLoaded = true;
        this.init();
      });
    }

    async loadConfig() {
      // PRIORITY: skinId > treeId > websiteId > domain
      // If skinId is provided, use it directly (bypasses all other lookups including treeId)
      if (this.rawConfig.skinId) {
        try {
          const params = new URLSearchParams();
          params.append('skinId', this.rawConfig.skinId.toString());

          const response = await fetch(`${this.rawConfig.apiUrl}/widget/config?${params.toString()}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load widget config: ${response.statusText}`);
          }

          const widgetConfig = await response.json();

          // Extract colors from full skin config or legacy theme
          let primaryColor = defaults.primaryColor;
          let backgroundColor = defaults.backgroundColor;
          let textColor = defaults.textColor;
          let position = defaults.position;
          let title = defaults.title;

          if (widgetConfig.skin?.config) {
            // Use full skin config (data-driven from database)
            const skinConfig = widgetConfig.skin.config;
            
            // Store full skin config for use in rendering
            this.skinConfig = skinConfig;
            
            // Extract theme values - ensure we're reading from the correct path
            if (skinConfig.theme) {
              primaryColor = skinConfig.theme.primaryColor || defaults.primaryColor;
              backgroundColor = skinConfig.theme.backgroundColor || defaults.backgroundColor;
              textColor = skinConfig.theme.textColor || defaults.textColor;
            }
            
            // Extract component configs
            position = skinConfig.components?.button?.position || defaults.position;
            title = skinConfig.components?.header?.title || defaults.title;
          } else if (widgetConfig.theme) {
            // Use legacy theme (backward compatibility)
            primaryColor = widgetConfig.theme.primaryColor || defaults.primaryColor;
            backgroundColor = widgetConfig.theme.backgroundColor || defaults.backgroundColor;
            textColor = widgetConfig.theme.textColor || defaults.textColor;
          }

          // Merge API config with manual overrides
          // Only use rawConfig values if they were explicitly provided by user
          const wasPrimaryColorProvided = this.rawConfig.hasOwnProperty('primaryColor');
          const wasPositionProvided = this.rawConfig.hasOwnProperty('position');
          const wasTitleProvided = this.rawConfig.hasOwnProperty('title');
          const wasBackgroundColorProvided = this.rawConfig.hasOwnProperty('backgroundColor');
          const wasTextColorProvided = this.rawConfig.hasOwnProperty('textColor');
          
          this.config = {
            ...defaults,
            apiUrl: this.rawConfig.apiUrl || defaults.apiUrl,
            treeId: widgetConfig.treeId || this.rawConfig.treeId || null,
            // Preserve userId and useMemory from rawConfig
            userId: this.rawConfig.userId || defaults.userId,
            useMemory: this.rawConfig.hasOwnProperty('useMemory') ? this.rawConfig.useMemory : defaults.useMemory,
            // Use API colors unless user explicitly provided them
            primaryColor: wasPrimaryColorProvided ? this.rawConfig.primaryColor : primaryColor,
            backgroundColor: wasBackgroundColorProvided ? this.rawConfig.backgroundColor : backgroundColor,
            textColor: wasTextColorProvided ? this.rawConfig.textColor : textColor,
            position: wasPositionProvided ? this.rawConfig.position : position,
            title: wasTitleProvided ? this.rawConfig.title : title
          };

          this.configLoaded = true;
          
          // Force style update after config loads (if widget already initialized)
          if (this.container) {
            // Re-inject styles with new colors - this is critical for dark themes
            this.injectStyles();
            
            const primaryColor = this.config.primaryColor;
            const backgroundColor = this.config.backgroundColor;
            const textColor = this.config.textColor;
            const borderColor = this.config.borderColor || '#e5e7eb';
            const secondaryColor = this.config.secondaryColor || '#f3f4f6';
            
            // Update button
            const button = this.container.querySelector('.ct-button');
            if (button) {
              button.style.setProperty('background-color', primaryColor, 'important');
            }
            
            // Update window background (critical for dark themes)
            const window = this.container.querySelector('.ct-window');
            if (window) {
              window.style.setProperty('background-color', backgroundColor, 'important');
            }
            
            // Update header
            const header = this.container.querySelector('.ct-header');
            if (header) {
              header.style.setProperty('background-color', primaryColor, 'important');
            }
            
            // Update messages container (critical for dark themes)
            const messages = this.container.querySelector('.ct-messages');
            if (messages) {
              messages.style.setProperty('background-color', backgroundColor, 'important');
              messages.style.setProperty('color', textColor, 'important');
            }
            
            // Update input container
            const inputContainer = this.container.querySelector('.ct-input-container');
            if (inputContainer) {
              inputContainer.style.setProperty('background-color', backgroundColor, 'important');
              inputContainer.style.setProperty('border-top-color', borderColor, 'important');
            }
            
            // Update input field - use adaptive text color based on background
            const input = this.container.querySelector('.ct-input');
            if (input) {
              const inputBg = backgroundColor === '#ffffff' || !backgroundColor ? 'white' : backgroundColor;
              input.style.setProperty('background-color', inputBg, 'important');
              // Use adaptive text color - light on dark backgrounds, dark on light backgrounds
              const inputTextColor = this.getContrastTextColor(inputBg);
              const placeholderColor = this.isLightColor(inputBg) ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.6)';
              input.style.setProperty('color', inputTextColor, 'important');
              input.style.setProperty('font-weight', '500', 'important');
              input.style.setProperty('border-color', borderColor, 'important');
              // Also update textarea if it exists
              const textarea = this.container.querySelector('.ct-textarea');
              if (textarea) {
                textarea.style.setProperty('color', inputTextColor, 'important');
                textarea.style.setProperty('font-weight', '500', 'important');
              }
            }
            
            // Update send button
            const sendButton = this.container.querySelector('.ct-send-button');
            if (sendButton) {
              sendButton.style.setProperty('background-color', primaryColor, 'important');
            }
            
            // Update bot message bubbles
            const botMessages = this.container.querySelectorAll('.ct-message.bot .ct-message-content');
            botMessages.forEach(msg => {
              msg.style.setProperty('background-color', primaryColor, 'important');
            });
            
            // Update user message bubbles (critical for dark themes)
            const userMessages = this.container.querySelectorAll('.ct-message.user .ct-message-content');
            userMessages.forEach(msg => {
              msg.style.setProperty('background-color', secondaryColor, 'important');
              msg.style.setProperty('color', textColor, 'important');
            });
            
            // Update quick reply buttons
            const quickReplies = this.container.querySelectorAll('.ct-quick-reply');
            quickReplies.forEach(btn => {
              btn.style.setProperty('border-color', primaryColor, 'important');
              btn.style.setProperty('color', primaryColor, 'important');
            });
            
            // Update quick replies container
            const quickRepliesContainer = this.container.querySelector('.ct-quick-replies');
            if (quickRepliesContainer) {
              quickRepliesContainer.style.setProperty('background-color', backgroundColor, 'important');
              quickRepliesContainer.style.setProperty('border-top-color', borderColor, 'important');
            }
            
            // Re-render if window is closed to apply all inline styles
            if (!this.isOpen) {
              this.container.innerHTML = this.renderButton();
              this.attachEventListeners();
            } else {
              // Re-render window to apply all theme changes
              this.updateView();
            }
          }
          
          return; // Exit early, don't process domain
        } catch (error) {
          console.error('Error loading widget config:', error);
          // Fallback to defaults but still render widget
          this.config = { ...defaults, ...this.rawConfig };
          this.configLoaded = true;
          return;
        }
      }

      // If treeId is provided directly (without skinId), use it (manual mode - bypasses lookups)
      if (this.rawConfig.treeId) {
        // Merge with defaults to ensure all required properties are set
        this.config = {
          ...defaults,
          ...this.rawConfig
        };
        this.configLoaded = true;
        
        // Return resolved promise to ensure init() is called
        return Promise.resolve();
      }

      // WEBSITE-ID OR DOMAIN-BASED LOOKUP (Fallback if no skinId or treeId)
      // Selection logic:
      // 1. Find website by websiteId or domain
      // 2. Get active skin for website (is_active = true, or first created)
      // 3. Get active A/B variation for skin (is_active = true, or first created)
      // 4. Get dialog tree for variation (first created)
      // 5. Merge skin config with variation overrides
      
      if (this.rawConfig.websiteId || this.rawConfig.domain) {
        try {
          const params = new URLSearchParams();
          if (this.rawConfig.websiteId) {
            params.append('websiteId', this.rawConfig.websiteId.toString());
          } else {
            params.append('domain', this.rawConfig.domain);
          }

          const response = await fetch(`${this.rawConfig.apiUrl}/widget/config?${params.toString()}`);
          
          if (!response.ok) {
            throw new Error(`Failed to load widget config: ${response.statusText}`);
          }

          const widgetConfig = await response.json();

          // Extract colors from full skin config or legacy theme
          let primaryColor = defaults.primaryColor;
          let backgroundColor = defaults.backgroundColor;
          let textColor = defaults.textColor;
          let position = defaults.position;
          let title = defaults.title;

          if (widgetConfig.skin?.config) {
            // Use full skin config (data-driven from database)
            const skinConfig = widgetConfig.skin.config;
            
            // Store full skin config for use in rendering
            this.skinConfig = skinConfig;
            
            primaryColor = skinConfig.theme?.primaryColor || defaults.primaryColor;
            backgroundColor = skinConfig.theme?.backgroundColor || defaults.backgroundColor;
            textColor = skinConfig.theme?.textColor || defaults.textColor;
            position = skinConfig.components?.button?.position || defaults.position;
            title = skinConfig.components?.header?.title || defaults.title;
          } else if (widgetConfig.theme) {
            // Use legacy theme (backward compatibility)
            primaryColor = widgetConfig.theme.primaryColor || defaults.primaryColor;
            backgroundColor = widgetConfig.theme.backgroundColor || defaults.backgroundColor;
            textColor = widgetConfig.theme.textColor || defaults.textColor;
          }

          // Merge API config with manual overrides
          // Only use rawConfig values if they were explicitly provided by user
          const wasPrimaryColorProvided = this.rawConfig.hasOwnProperty('primaryColor');
          const wasPositionProvided = this.rawConfig.hasOwnProperty('position');
          const wasTitleProvided = this.rawConfig.hasOwnProperty('title');
          const wasBackgroundColorProvided = this.rawConfig.hasOwnProperty('backgroundColor');
          const wasTextColorProvided = this.rawConfig.hasOwnProperty('textColor');
          
          this.config = {
            ...defaults,
            apiUrl: this.rawConfig.apiUrl || defaults.apiUrl,
            treeId: widgetConfig.treeId || this.rawConfig.treeId || null,
            // Preserve userId and useMemory from rawConfig
            userId: this.rawConfig.userId || defaults.userId,
            useMemory: this.rawConfig.hasOwnProperty('useMemory') ? this.rawConfig.useMemory : defaults.useMemory,
            // Use API colors unless user explicitly provided them
            primaryColor: wasPrimaryColorProvided ? this.rawConfig.primaryColor : primaryColor,
            backgroundColor: wasBackgroundColorProvided ? this.rawConfig.backgroundColor : backgroundColor,
            textColor: wasTextColorProvided ? this.rawConfig.textColor : textColor,
            position: wasPositionProvided ? this.rawConfig.position : position,
            title: wasTitleProvided ? this.rawConfig.title : title
          };

          this.configLoaded = true;
          
          // Force style update after config loads (if widget already initialized)
          if (this.container) {
            // Re-inject styles with new colors - this is critical for dark themes
            this.injectStyles();
            
            const primaryColor = this.config.primaryColor;
            const backgroundColor = this.config.backgroundColor;
            const textColor = this.config.textColor;
            const borderColor = this.config.borderColor || '#e5e7eb';
            const secondaryColor = this.config.secondaryColor || '#f3f4f6';
            
            // Update button
            const button = this.container.querySelector('.ct-button');
            if (button) {
              button.style.setProperty('background-color', primaryColor, 'important');
            }
            
            // Update window background (critical for dark themes)
            const window = this.container.querySelector('.ct-window');
            if (window) {
              window.style.setProperty('background-color', backgroundColor, 'important');
            }
            
            // Update header
            const header = this.container.querySelector('.ct-header');
            if (header) {
              header.style.setProperty('background-color', primaryColor, 'important');
            }
            
            // Update messages container (critical for dark themes)
            const messages = this.container.querySelector('.ct-messages');
            if (messages) {
              messages.style.setProperty('background-color', backgroundColor, 'important');
              messages.style.setProperty('color', textColor, 'important');
            }
            
            // Update input container
            const inputContainer = this.container.querySelector('.ct-input-container');
            if (inputContainer) {
              inputContainer.style.setProperty('background-color', backgroundColor, 'important');
              inputContainer.style.setProperty('border-top-color', borderColor, 'important');
            }
            
            // Update input field - use adaptive text color based on background
            const input = this.container.querySelector('.ct-input');
            if (input) {
              const inputBg = backgroundColor === '#ffffff' || !backgroundColor ? 'white' : backgroundColor;
              input.style.setProperty('background-color', inputBg, 'important');
              // Use adaptive text color - light on dark backgrounds, dark on light backgrounds
              const inputTextColor = this.getContrastTextColor(inputBg);
              const placeholderColor = this.isLightColor(inputBg) ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.6)';
              input.style.setProperty('color', inputTextColor, 'important');
              input.style.setProperty('font-weight', '500', 'important');
              input.style.setProperty('border-color', borderColor, 'important');
              // Also update textarea if it exists
              const textarea = this.container.querySelector('.ct-textarea');
              if (textarea) {
                textarea.style.setProperty('color', inputTextColor, 'important');
                textarea.style.setProperty('font-weight', '500', 'important');
              }
            }
            
            // Update send button
            const sendButton = this.container.querySelector('.ct-send-button');
            if (sendButton) {
              sendButton.style.setProperty('background-color', primaryColor, 'important');
            }
            
            // Update bot message bubbles
            const botMessages = this.container.querySelectorAll('.ct-message.bot .ct-message-content');
            botMessages.forEach(msg => {
              msg.style.setProperty('background-color', primaryColor, 'important');
            });
            
            // Update user message bubbles (critical for dark themes)
            const userMessages = this.container.querySelectorAll('.ct-message.user .ct-message-content');
            userMessages.forEach(msg => {
              msg.style.setProperty('background-color', secondaryColor, 'important');
              msg.style.setProperty('color', textColor, 'important');
            });
            
            // Update quick reply buttons
            const quickReplies = this.container.querySelectorAll('.ct-quick-reply');
            quickReplies.forEach(btn => {
              btn.style.setProperty('border-color', primaryColor, 'important');
              btn.style.setProperty('color', primaryColor, 'important');
            });
            
            // Update quick replies container
            const quickRepliesContainer = this.container.querySelector('.ct-quick-replies');
            if (quickRepliesContainer) {
              quickRepliesContainer.style.setProperty('background-color', backgroundColor, 'important');
              quickRepliesContainer.style.setProperty('border-top-color', borderColor, 'important');
            }
            
            // Re-render if window is closed to apply all inline styles
            if (!this.isOpen) {
              this.container.innerHTML = this.renderButton();
              this.attachEventListeners();
            } else {
              // Re-render window to apply all theme changes
              this.updateView();
            }
          }
        } catch (error) {
          console.error('Error loading widget config:', error);
          // Fallback to defaults but still render widget
          this.config = { ...defaults, ...this.rawConfig };
          this.configLoaded = true;
        }
      } else {
        // Auto-detect domain if neither treeId, websiteId, nor domain is provided
        const currentDomain = window.location.hostname;
        if (currentDomain && currentDomain !== 'localhost' && currentDomain !== '127.0.0.1') {
          try {
            const response = await fetch(`${this.rawConfig.apiUrl}/widget/config?domain=${encodeURIComponent(currentDomain)}`);
            
            if (response.ok) {
              const widgetConfig = await response.json();
              
              // Extract colors from full skin config or legacy theme
              let primaryColor = defaults.primaryColor;
              let backgroundColor = defaults.backgroundColor;
              let textColor = defaults.textColor;
              let position = defaults.position;
              let title = defaults.title;

              if (widgetConfig.skin?.config) {
                // Use full skin config (data-driven from database)
                const skinConfig = widgetConfig.skin.config;
                
                // Store full skin config for use in rendering
                this.skinConfig = skinConfig;
                
                primaryColor = skinConfig.theme?.primaryColor || defaults.primaryColor;
                backgroundColor = skinConfig.theme?.backgroundColor || defaults.backgroundColor;
                textColor = skinConfig.theme?.textColor || defaults.textColor;
                position = skinConfig.components?.button?.position || defaults.position;
                title = skinConfig.components?.header?.title || defaults.title;
              } else if (widgetConfig.theme) {
                // Use legacy theme (backward compatibility)
                primaryColor = widgetConfig.theme.primaryColor || defaults.primaryColor;
                backgroundColor = widgetConfig.theme.backgroundColor || defaults.backgroundColor;
                textColor = widgetConfig.theme.textColor || defaults.textColor;
              }
              
              // Merge API config with manual overrides
              const wasPrimaryColorProvided = this.rawConfig.hasOwnProperty('primaryColor');
              const wasPositionProvided = this.rawConfig.hasOwnProperty('position');
              const wasTitleProvided = this.rawConfig.hasOwnProperty('title');
              const wasBackgroundColorProvided = this.rawConfig.hasOwnProperty('backgroundColor');
              const wasTextColorProvided = this.rawConfig.hasOwnProperty('textColor');
              
              this.config = {
                ...defaults,
                apiUrl: this.rawConfig.apiUrl || defaults.apiUrl,
                treeId: widgetConfig.treeId || this.rawConfig.treeId || null,
                // Preserve userId and useMemory from rawConfig
                userId: this.rawConfig.userId || defaults.userId,
                useMemory: this.rawConfig.hasOwnProperty('useMemory') ? this.rawConfig.useMemory : defaults.useMemory,
                // Use API colors unless user explicitly provided them
                primaryColor: wasPrimaryColorProvided ? this.rawConfig.primaryColor : primaryColor,
                backgroundColor: wasBackgroundColorProvided ? this.rawConfig.backgroundColor : backgroundColor,
                textColor: wasTextColorProvided ? this.rawConfig.textColor : textColor,
                position: wasPositionProvided ? this.rawConfig.position : position,
                title: wasTitleProvided ? this.rawConfig.title : title
              };
              
              // Force style update after config loads (if widget already initialized)
              if (this.container) {
                // Re-inject styles with new colors - this is critical for dark themes
                this.injectStyles();
                
                const primaryColor = this.config.primaryColor;
                const backgroundColor = this.config.backgroundColor;
                const textColor = this.config.textColor;
                const borderColor = this.config.borderColor || '#e5e7eb';
                const secondaryColor = this.config.secondaryColor || '#f3f4f6';
                
                // Update button
                const button = this.container.querySelector('.ct-button');
                if (button) {
                  button.style.setProperty('background-color', primaryColor, 'important');
                }
                
                // Update window background (critical for dark themes)
                const window = this.container.querySelector('.ct-window');
                if (window) {
                  window.style.setProperty('background-color', backgroundColor, 'important');
                }
                
                // Update header
                const header = this.container.querySelector('.ct-header');
                if (header) {
                  header.style.setProperty('background-color', primaryColor, 'important');
                }
                
                // Update messages container (critical for dark themes)
                const messages = this.container.querySelector('.ct-messages');
                if (messages) {
                  messages.style.setProperty('background-color', backgroundColor, 'important');
                  messages.style.setProperty('color', textColor, 'important');
                }
                
                // Update input container
                const inputContainer = this.container.querySelector('.ct-input-container');
                if (inputContainer) {
                  inputContainer.style.setProperty('background-color', backgroundColor, 'important');
                  inputContainer.style.setProperty('border-top-color', borderColor, 'important');
                }
                
                // Update input field
                const input = this.container.querySelector('.ct-input');
                if (input) {
                  const inputBg = backgroundColor === '#ffffff' || !backgroundColor ? 'white' : backgroundColor;
                  input.style.setProperty('background-color', inputBg, 'important');
                  // Ensure text color has good contrast - use darker color if textColor is too light
              const inputTextColor = textColor || '#1f2937';
              input.style.setProperty('color', inputTextColor, 'important');
              // Ensure placeholder has good contrast
              input.style.setProperty('--placeholder-color', inputTextColor + '80', 'important');
                  input.style.setProperty('border-color', borderColor, 'important');
                }
                
                // Update send button
                const sendButton = this.container.querySelector('.ct-send-button');
                if (sendButton) {
                  sendButton.style.setProperty('background-color', primaryColor, 'important');
                }
                
                // Update bot message bubbles
                const botMessages = this.container.querySelectorAll('.ct-message.bot .ct-message-content');
                botMessages.forEach(msg => {
                  msg.style.setProperty('background-color', primaryColor, 'important');
                });
                
                // Update user message bubbles (critical for dark themes)
                const userMessages = this.container.querySelectorAll('.ct-message.user .ct-message-content, .ct-message-content-list, .ct-message-content-card');
                userMessages.forEach(msg => {
                  const bgColor = msg.style.backgroundColor || secondaryColor;
                  msg.style.setProperty('background-color', secondaryColor, 'important');
                  msg.style.setProperty('color', this.isLightColor(secondaryColor) ? '#1f2937' : '#ffffff', 'important');
                  msg.style.setProperty('font-weight', '500', 'important');
                });
                
                // Update quick reply buttons
                const quickReplies = this.container.querySelectorAll('.ct-quick-reply');
                quickReplies.forEach(btn => {
                  btn.style.setProperty('border-color', primaryColor, 'important');
                  btn.style.setProperty('color', primaryColor, 'important');
                });
                
                // Update quick replies container
                const quickRepliesContainer = this.container.querySelector('.ct-quick-replies');
                if (quickRepliesContainer) {
                  quickRepliesContainer.style.setProperty('background-color', backgroundColor, 'important');
                  quickRepliesContainer.style.setProperty('border-top-color', borderColor, 'important');
                }
                
                // Re-render if window is closed to apply all inline styles
                if (!this.isOpen) {
                  this.container.innerHTML = this.renderButton();
                  this.attachEventListeners();
                } else {
                  // Re-render window to apply all theme changes
                  this.updateView();
                }
              }
            } else {
              // Domain not found, use defaults
              this.config = { ...defaults, ...this.rawConfig };
            }
          } catch (error) {
            console.error('Auto-detection failed:', error);
            this.config = { ...defaults, ...this.rawConfig };
          }
        } else {
          // No domain to detect, use defaults
          this.config = { ...defaults, ...this.rawConfig };
        }
        this.configLoaded = true;
      }
    }

    init() {
      if (!this.configLoaded) {
        // Wait for config to load
        setTimeout(() => this.init(), 100);
        return;
      }

      try {
        // Check if container already exists
        const existingContainer = document.getElementById('conversatree-widget');
        if (existingContainer) {
          existingContainer.remove();
        }

        // Ensure document.body exists
        if (!document.body) {
          setTimeout(() => this.init(), 100);
          return;
        }

        // Create widget container
        this.container = document.createElement('div');
        this.container.id = 'conversatree-widget';
        this.container.innerHTML = this.renderButton();
        
        // Apply position styles
        const positionStyles = this.getPositionStyles();
        this.container.setAttribute('style', `position: fixed; z-index: 9999; ${positionStyles}`);
        
        document.body.appendChild(this.container);

        // Add styles
        this.injectStyles();

        // Add event listeners
        this.attachEventListeners();
      } catch (error) {
        console.error('[ConversaTree] Error initializing widget:', error);
        // Still try to create a basic container
        try {
          this.container = document.createElement('div');
          this.container.id = 'conversatree-widget';
          this.container.innerHTML = '<button style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 50%; cursor: pointer;">Chat</button>';
          document.body.appendChild(this.container);
        } catch (fallbackError) {
          console.error('[ConversaTree] Failed to create fallback widget:', fallbackError);
        }
      }
    }

    injectStyles() {
      // Remove old styles if they exist (for config updates)
      const oldStyle = document.getElementById('conversatree-styles');
      if (oldStyle) {
        oldStyle.remove();
      }

      // Ensure we have colors (use config or default)
      const primaryColor = this.config.primaryColor || defaults.primaryColor;
      const backgroundColor = this.config.backgroundColor || defaults.backgroundColor;
      const textColor = this.config.textColor || defaults.textColor;
      const secondaryColor = this.config.secondaryColor || '#f3f4f6';
      const borderColor = this.config.borderColor || '#e5e7eb';
      
      // Update config if it was using default
      if (!this.config.primaryColor || this.config.primaryColor === defaults.primaryColor) {
        this.config.primaryColor = primaryColor;
      }
      if (!this.config.backgroundColor || this.config.backgroundColor === defaults.backgroundColor) {
        this.config.backgroundColor = backgroundColor;
      }
      if (!this.config.textColor || this.config.textColor === defaults.textColor) {
        this.config.textColor = textColor;
      }

      const style = document.createElement('style');
      style.id = 'conversatree-styles';
      style.textContent = `
        #conversatree-widget {
          position: fixed;
          ${this.getPositionStyles()}
          z-index: 9999;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        }

        .ct-button {
          /* Width, height, and border-radius are set inline from config */
          background-color: ${primaryColor} !important;
          color: white !important;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s;
          padding: 0;
        }

        .ct-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .ct-window {
          /* Dimensions, border-radius, and shadow are set inline from config */
          background: ${backgroundColor} !important;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          transition: height 0.3s ease;
          box-sizing: border-box;
        }

        .ct-window.minimized {
          /* Height is set inline from config */
        }


        .ct-header {
          background-color: ${primaryColor} !important;
          color: white;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
          /* Height is set inline from config */
        }

        .ct-header-title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          font-size: 14px;
        }

        .ct-header-actions {
          display: flex;
          gap: 8px;
        }

        .ct-header-button {
          background: transparent;
          border: none;
          color: white;
          cursor: pointer;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: background-color 0.2s;
        }

        .ct-header-button:hover {
          background-color: rgba(255, 255, 255, 0.2);
        }

        .ct-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          background: ${backgroundColor} !important;
          color: ${textColor} !important;
        }

        .ct-messages[data-layout="bubbles"] {
          gap: 12px;
        }

        .ct-messages[data-layout="list"] {
          gap: 8px;
        }

        .ct-messages[data-layout="cards"] {
          gap: 16px;
        }

        .ct-message {
          display: flex;
          gap: 8px;
          max-width: 80%;
        }

        .ct-message.user {
          align-self: flex-end;
          flex-direction: row-reverse;
        }

        .ct-message.bot {
          align-self: flex-start;
        }

        .ct-message-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-size: 16px;
        }

        .ct-message.user .ct-message-avatar {
          background-color: #e5e7eb;
          color: #374151;
        }

        .ct-message.bot .ct-message-avatar {
          background-color: ${primaryColor};
          color: white;
        }

        .ct-message-content {
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 14px;
          line-height: 1.5;
          word-wrap: break-word;
        }

        .ct-message.user .ct-message-content {
          background-color: ${secondaryColor} !important;
          color: ${this.isLightColor(secondaryColor) ? '#1f2937' : '#ffffff'} !important;
          font-weight: 500;
        }

        .ct-message.bot .ct-message-content {
          background-color: ${primaryColor};
          color: white;
        }

        .ct-message-timestamp {
          font-size: 10px;
          color: #9ca3af;
          margin-top: 4px;
          opacity: 0.7;
        }

        .ct-loading {
          display: flex;
          gap: 4px;
          padding: 10px 14px;
        }

        .ct-loading-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #9ca3af;
          animation: ct-bounce 1.4s infinite ease-in-out;
        }

        .ct-loading-dot:nth-child(1) {
          animation-delay: -0.32s;
        }

        .ct-loading-dot:nth-child(2) {
          animation-delay: -0.16s;
        }

        @keyframes ct-bounce {
          0%, 80%, 100% {
            transform: scale(0);
          }
          40% {
            transform: scale(1);
          }
        }

        .ct-loading-spinner-container {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .ct-loading-spinner {
          width: 24px;
          height: 24px;
          border: 3px solid;
          border-radius: 50%;
          animation: ct-spin 1s linear infinite;
        }

        @keyframes ct-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .ct-loading-skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 6px;
          width: 200px;
        }

        .ct-loading-skeleton-line {
          height: 12px;
          border-radius: 4px;
          background-size: 200% 100%;
          animation: ct-skeleton-loading 1.5s ease-in-out infinite;
        }

        @keyframes ct-skeleton-loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .ct-loading-pulse-container {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }

        .ct-loading-pulse {
          width: 40px;
          height: 20px;
          border-radius: 10px;
          animation: ct-pulse 1.5s ease-in-out infinite;
        }

        @keyframes ct-pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(0.95);
          }
        }

        .ct-quick-replies {
          padding: 8px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid ${borderColor} !important;
          background: ${backgroundColor} !important;
        }

        .ct-quick-reply {
          padding: 6px 12px;
          border: 1px solid ${primaryColor} !important;
          border-radius: 16px;
          background: transparent;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
          font-weight: 500;
        }

        .ct-quick-reply:hover {
          opacity: 1 !important;
          transform: translateY(-1px);
        }

        .ct-quick-reply-chips {
          background-color: ${primaryColor}20 !important;
          border: 1px solid ${primaryColor} !important;
          color: ${primaryColor} !important;
        }

        .ct-quick-reply-chips:hover {
          background-color: ${primaryColor} !important;
          color: white !important;
          border-color: ${primaryColor} !important;
        }

        .ct-quick-reply-links {
          background: transparent !important;
          border: none !important;
          color: ${primaryColor} !important;
          text-decoration: underline !important;
        }

        .ct-quick-reply-links:hover {
          background: ${primaryColor}15 !important;
          color: ${primaryColor} !important;
          text-decoration: underline !important;
        }

        .ct-quick-reply:not(.ct-quick-reply-chips):not(.ct-quick-reply-links):hover {
          background-color: ${primaryColor} !important;
          color: white !important;
          border-color: ${primaryColor} !important;
        }

        .ct-input-container {
          padding: 16px;
          border-top: 1px solid ${borderColor} !important;
          background: ${backgroundColor} !important;
        }

        .ct-input-form {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ct-input-form-row {
          display: flex;
          gap: 8px;
          align-items: flex-end;
        }

        .ct-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid ${borderColor} !important;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
          background: ${backgroundColor === '#ffffff' || !backgroundColor ? 'white' : backgroundColor} !important;
          font-weight: 500;
        }

        .ct-input::placeholder {
          opacity: 0.7;
          font-weight: 400;
        }

        .ct-textarea {
          font-weight: 500;
        }

        .ct-textarea::placeholder {
          opacity: 0.7;
          font-weight: 400;
        }

        .ct-textarea {
          resize: vertical;
          min-height: 60px;
          max-height: 200px;
          font-family: inherit;
        }

        .ct-input:focus, .ct-textarea:focus {
          border-color: ${primaryColor} !important;
        }

        .ct-character-count {
          font-size: 11px;
          color: #9ca3af;
          text-align: right;
          padding: 4px 8px 0 0;
        }

        .ct-send-button {
          padding: 10px 16px;
          background-color: ${primaryColor} !important;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          display: flex;
          align-items: center;
          transition: opacity 0.2s;
        }

        .ct-send-button:hover:not(:disabled) {
          opacity: 0.9;
        }

        .ct-send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .ct-icon {
          width: 20px;
          height: 20px;
        }
      `;
      document.head.appendChild(style);
    }

    getPositionStyles() {
      const positions = {
        'bottom-right': 'bottom: 20px; right: 20px;',
        'bottom-left': 'bottom: 20px; left: 20px;',
        'top-right': 'top: 20px; right: 20px;',
        'top-left': 'top: 20px; left: 20px;'
      };
      const position = this.skinConfig?.components?.button?.position || this.config.position;
      return positions[position] || positions['bottom-right'];
    }

    // Helper to get config values with defaults
    getConfigValue(path, defaultValue) {
      if (!this.skinConfig) return defaultValue;
      const keys = path.split('.');
      let value = this.skinConfig;
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          return defaultValue;
        }
      }
      return value !== undefined && value !== null ? value : defaultValue;
    }

    // Helper to determine if a color is light or dark
    isLightColor(color) {
      if (!color) return true; // Default to light
      // Remove # if present
      const hex = color.replace('#', '');
      // Convert to RGB
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      // Calculate luminance (perceived brightness)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.5;
    }

    // Get appropriate text color based on background
    getContrastTextColor(backgroundColor) {
      return this.isLightColor(backgroundColor) ? '#1f2937' : '#ffffff';
    }

    renderButton() {
      const buttonConfig = this.skinConfig?.components?.button || {};
      const color = this.config.primaryColor || '#6366f1';
      const buttonType = buttonConfig.type || 'circular';
      const buttonSize = buttonConfig.size || 'large';
      const buttonIcon = buttonConfig.icon || 'bot';
      const showLabel = buttonConfig.showLabel || false;
      const label = buttonConfig.label || 'Chat';
      
      // Size mapping
      const sizes = {
        small: '40px',
        medium: '48px',
        large: '56px'
      };
      const size = sizes[buttonSize] || sizes.large;
      
      // Border radius based on type
      const borderRadius = {
        circular: '50%',
        rounded: '12px',
        square: '8px'
      }[buttonType] || '50%';
      
      // Icon SVG paths
      const iconPaths = {
        bot: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />',
        chat: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />',
        message: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />',
        custom: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />'
      };
      const iconPath = iconPaths[buttonIcon] || iconPaths.bot;
      
      const buttonStyle = `background-color: ${color} !important; width: ${size}; height: ${size}; border-radius: ${borderRadius};`;
      
      return `
        <button class="ct-button" aria-label="Open chat" style="${buttonStyle}">
          ${buttonIcon !== null ? `
          <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            ${iconPath}
          </svg>
          ` : ''}
          ${showLabel ? `<span style="margin-left: 8px; font-size: 14px;">${label}</span>` : ''}
        </button>
      `;
    }

    renderWindow() {
      const windowConfig = this.skinConfig?.components?.window || {};
      const headerConfig = this.skinConfig?.components?.header || {};
      const primaryColor = this.config.primaryColor || '#6366f1';
      const backgroundColor = this.config.backgroundColor || '#ffffff';
      
      // Window dimensions with min constraints
      const minWidth = windowConfig.minWidth || 320;
      const minHeight = windowConfig.minHeight || 400;
      const maxWidth = windowConfig.maxWidth || null;
      const maxHeight = windowConfig.maxHeight || null;
      
      let width = windowConfig.width || 384;
      let height = windowConfig.height || 600;
      
      // Enforce minimum constraints
      width = Math.max(width, minWidth);
      height = Math.max(height, minHeight);
      
      // Enforce maximum constraints if set
      if (maxWidth) width = Math.min(width, maxWidth);
      if (maxHeight) height = Math.min(height, maxHeight);
      
      const borderRadius = windowConfig.borderRadius || 8;
      const shadow = windowConfig.shadow || 'large';
      
      // Shadow mapping
      const shadows = {
        none: 'none',
        small: '0 2px 8px rgba(0, 0, 0, 0.1)',
        medium: '0 4px 16px rgba(0, 0, 0, 0.15)',
        large: '0 20px 60px rgba(0, 0, 0, 0.3)'
      };
      const boxShadow = shadows[shadow] || shadows.large;
      
      // Header config
      const showHeader = headerConfig.show !== false;
      const headerHeight = headerConfig.height || 48;
      const showTitle = headerConfig.showTitle !== false;
      const showMinimize = headerConfig.showMinimize !== false;
      const showClose = headerConfig.showClose !== false;
      const title = headerConfig.title || this.config.title || 'Chat Assistant';
      
      const windowStyle = `width: ${width}px; min-width: ${minWidth}px; max-width: ${maxWidth ? maxWidth + 'px' : 'none'}; height: ${this.isMinimized ? headerHeight : height}px; min-height: ${this.isMinimized ? headerHeight : minHeight}px; max-height: ${maxHeight && !this.isMinimized ? maxHeight + 'px' : 'none'}; border-radius: ${borderRadius}px; box-shadow: ${boxShadow}; background: ${backgroundColor} !important;`;
      
      return `
        <div class="ct-window ${this.isMinimized ? 'minimized' : ''}" style="${windowStyle}">
          ${showHeader ? `
          <div class="ct-header" style="background-color: ${primaryColor} !important; height: ${headerHeight}px;">
            <div class="ct-header-title">
              ${showTitle ? `
                <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>${title}</span>
              ` : ''}
            </div>
            <div class="ct-header-actions">
              ${showMinimize ? `
              <button class="ct-header-button ct-minimize" aria-label="Minimize">
                <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
              ` : ''}
              ${showClose ? `
              <button class="ct-header-button ct-close" aria-label="Close">
                <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              ` : ''}
            </div>
          </div>
          ` : ''}
          ${!this.isMinimized ? `
            <div class="ct-messages" id="ct-messages" data-layout="${this.getConfigValue('components.messages.layout', 'bubbles')}">
              ${this.messages.length === 0 && !this.isLoading ? `
                <div style="text-align: center; color: #6b7280; padding: 20px; font-size: 14px;">
                  ${this.getConfigValue('states.empty.message', 'Starting conversation...')}
                </div>
              ` : ''}
              ${this.messages.map(msg => this.renderMessage(msg)).join('')}
              ${this.isLoading ? this.renderLoading() : ''}
            </div>
            ${this.quickReplies.length > 0 && this.getConfigValue('components.quickReplies.show', true) ? this.renderQuickReplies() : ''}
            <div class="ct-input-container">
              <form class="ct-input-form" id="ct-form">
                <div class="ct-input-form-row">
                  ${this.getConfigValue('components.input.allowMultiline', false) ? `
                  <textarea 
                    class="ct-input ct-textarea" 
                    id="ct-input" 
                    placeholder="${this.getConfigValue('components.input.placeholder', 'Type your message...')}"
                    autocomplete="off"
                    rows="3"
                    ${this.getConfigValue('components.input.autoFocus', true) ? 'autofocus' : ''}
                    ${this.getConfigValue('components.input.maxLength', null) ? `maxlength="${this.getConfigValue('components.input.maxLength', null)}"` : ''}
                  ></textarea>
                  ` : `
                  <input 
                    type="text" 
                    class="ct-input" 
                    id="ct-input" 
                    placeholder="${this.getConfigValue('components.input.placeholder', 'Type your message...')}"
                    autocomplete="off"
                    ${this.getConfigValue('components.input.autoFocus', true) ? 'autofocus' : ''}
                    ${this.getConfigValue('components.input.maxLength', null) ? `maxlength="${this.getConfigValue('components.input.maxLength', null)}"` : ''}
                    value=""
                  />
                  `}
                  ${this.getConfigValue('components.input.showSendButton', true) ? `
                  <button type="submit" class="ct-send-button" id="ct-send" style="background-color: ${primaryColor} !important;" ${this.isLoading ? 'disabled' : ''}>
                    <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                  ` : ''}
                </div>
                ${this.getConfigValue('components.input.showCharacterCount', false) && this.getConfigValue('components.input.maxLength', null) ? `
                <div class="ct-character-count">
                  <span id="ct-char-count">0</span> / ${this.getConfigValue('components.input.maxLength', null)}
                </div>
                ` : ''}
              </form>
            </div>
          ` : ''}
        </div>
      `;
    }

    renderMessage(message) {
      const messagesConfig = this.skinConfig?.components?.messages || {};
      const layout = messagesConfig.layout || 'bubbles';
      const isUser = message.type === 'user';
      const showAvatars = messagesConfig.showAvatars !== false;
      const bubbleStyle = messagesConfig.bubbleStyle || 'rounded';
      const userAlignment = messagesConfig.userAlignment || 'right';
      const botAlignment = messagesConfig.botAlignment || 'left';
      const showTimestamps = messagesConfig.showTimestamps || false;
      const timestampFormat = messagesConfig.timestampFormat || 'relative';
      const primaryColor = this.config.primaryColor || '#6366f1';
      const secondaryColor = this.config.secondaryColor || '#f3f4f6';
      const textColor = this.config.textColor || '#1f2937';
      const borderColor = this.config.borderColor || '#e5e7eb';
      
      // Bubble border radius
      const borderRadius = {
        rounded: '12px',
        square: '4px',
        minimal: '2px'
      }[bubbleStyle] || '12px';
      
      // Timestamp formatting with proper contrast
      let timestampHtml = '';
      if (showTimestamps && message.timestamp) {
        const date = new Date(message.timestamp);
        let formattedTime = '';
        if (timestampFormat === 'relative') {
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          if (diffMins < 1) formattedTime = 'Just now';
          else if (diffMins < 60) formattedTime = `${diffMins}m ago`;
          else if (diffMins < 1440) formattedTime = `${Math.floor(diffMins / 60)}h ago`;
          else formattedTime = date.toLocaleDateString();
        } else {
          formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        // Use adaptive color for timestamps based on message background
        let timestampColor;
        if (isUser) {
          // User messages - use dark text on light backgrounds, light text on dark backgrounds
          timestampColor = this.isLightColor(secondaryColor) ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.8)';
        } else {
          // Bot messages - always white/light on colored background
          timestampColor = 'rgba(255, 255, 255, 0.9)';
        }
        timestampHtml = `<div class="ct-message-timestamp" style="font-size: 10px; color: ${timestampColor}; margin-top: 4px; font-weight: 500;">${formattedTime}</div>`;
      }
      
      // Render based on layout type
      if (layout === 'list') {
        // List layout: compact, minimal spacing, left-aligned
        const alignment = isUser ? userAlignment : botAlignment;
        const alignStyle = alignment === 'right' ? 'justify-content: flex-end;' : 'justify-content: flex-start;';
        
        return `
          <div class="ct-message ct-message-list ${message.type}" style="display: flex; gap: 8px; margin-bottom: 8px; ${alignStyle}">
            ${showAvatars && alignment === 'left' ? `
            <div class="ct-message-avatar" style="width: 24px; height: 24px; font-size: 12px;">
              ${isUser ? '👤' : '🤖'}
            </div>
            ` : ''}
            <div class="ct-message-content-list" style="
              padding: 8px 12px;
              border-radius: ${borderRadius};
              background-color: ${isUser ? secondaryColor : primaryColor};
              color: ${isUser ? textColor : 'white'};
              max-width: 85%;
              font-size: 14px;
            ">
              ${this.escapeHtml(message.content)}
              ${timestampHtml}
            </div>
            ${showAvatars && alignment === 'right' ? `
            <div class="ct-message-avatar" style="width: 24px; height: 24px; font-size: 12px;">
              ${isUser ? '👤' : '🤖'}
            </div>
            ` : ''}
          </div>
        `;
      } else if (layout === 'cards') {
        // Cards layout: card-like appearance with borders and shadows
        const alignment = isUser ? userAlignment : botAlignment;
        const alignStyle = alignment === 'right' ? 'justify-content: flex-end;' : 'justify-content: flex-start;';
        
        return `
          <div class="ct-message ct-message-card ${message.type}" style="display: flex; gap: 12px; margin-bottom: 16px; ${alignStyle}">
            ${showAvatars && alignment === 'left' ? `
            <div class="ct-message-avatar" style="width: 36px; height: 36px; font-size: 16px;">
              ${isUser ? '👤' : '🤖'}
            </div>
            ` : ''}
            <div class="ct-message-content-card" style="
              padding: 12px 16px;
              border-radius: ${borderRadius};
              background-color: ${isUser ? secondaryColor : primaryColor};
              color: ${isUser ? (this.isLightColor(secondaryColor) ? '#1f2937' : '#ffffff') : 'white'};
              border: 1px solid ${isUser ? borderColor : 'transparent'};
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              max-width: 80%;
              font-size: 14px;
              font-weight: 500;
            ">
              ${this.escapeHtml(message.content)}
              ${timestampHtml}
            </div>
            ${showAvatars && alignment === 'right' ? `
            <div class="ct-message-avatar" style="width: 36px; height: 36px; font-size: 16px;">
              ${isUser ? '👤' : '🤖'}
            </div>
            ` : ''}
          </div>
        `;
      } else {
        // Bubbles layout (default): current implementation
        const alignment = isUser ? userAlignment : botAlignment;
        const alignClass = alignment === 'right' ? 'align-self: flex-end; flex-direction: row-reverse;' : 'align-self: flex-start;';
        
        return `
          <div class="ct-message ${message.type}" style="${alignClass}">
            ${showAvatars ? `
            <div class="ct-message-avatar">
              ${isUser ? '👤' : '🤖'}
            </div>
            ` : ''}
            <div class="ct-message-content" style="border-radius: ${borderRadius};">
              ${this.escapeHtml(message.content)}
              ${timestampHtml}
            </div>
          </div>
        `;
      }
    }

    renderLoading() {
      const loadingConfig = this.skinConfig?.states?.loading || {};
      const loadingType = loadingConfig.type || 'dots';
      const loadingColor = loadingConfig.color || 'primary';
      const customColor = loadingConfig.customColor || null;
      const loadingMessage = loadingConfig.message || '';
      const messagesConfig = this.skinConfig?.components?.messages || {};
      const showAvatars = messagesConfig.showAvatars !== false;
      const primaryColor = this.config.primaryColor || '#6366f1';
      const secondaryColor = this.config.secondaryColor || '#f3f4f6';
      
      // Determine color
      let color = primaryColor;
      if (loadingColor === 'secondary') {
        color = secondaryColor;
      } else if (loadingColor === 'custom' && customColor) {
        color = customColor;
      }
      
      const avatarHtml = showAvatars ? '<div class="ct-message-avatar">🤖</div>' : '';
      
      if (loadingType === 'spinner') {
        return `
          <div class="ct-message bot">
            ${avatarHtml}
            <div class="ct-loading-spinner-container">
              <div class="ct-loading-spinner" style="border-color: ${color}20; border-top-color: ${color};"></div>
              ${loadingMessage ? `<div style="margin-top: 8px; font-size: 12px; color: #6b7280;">${this.escapeHtml(loadingMessage)}</div>` : ''}
            </div>
          </div>
        `;
      } else if (loadingType === 'skeleton') {
        return `
          <div class="ct-message bot">
            ${avatarHtml}
            <div class="ct-loading-skeleton-container">
              <div class="ct-loading-skeleton-line" style="background: linear-gradient(90deg, ${color}20 25%, ${color}40 50%, ${color}20 75%);"></div>
              <div class="ct-loading-skeleton-line" style="background: linear-gradient(90deg, ${color}20 25%, ${color}40 50%, ${color}20 75%); width: 70%;"></div>
              ${loadingMessage ? `<div style="margin-top: 8px; font-size: 12px; color: #6b7280;">${this.escapeHtml(loadingMessage)}</div>` : ''}
            </div>
          </div>
        `;
      } else if (loadingType === 'pulse') {
        return `
          <div class="ct-message bot">
            ${avatarHtml}
            <div class="ct-loading-pulse-container">
              <div class="ct-loading-pulse" style="background-color: ${color};"></div>
              ${loadingMessage ? `<div style="margin-top: 8px; font-size: 12px; color: #6b7280;">${this.escapeHtml(loadingMessage)}</div>` : ''}
            </div>
          </div>
        `;
      } else {
        // Dots (default)
        return `
          <div class="ct-message bot">
            ${avatarHtml}
            <div class="ct-loading">
              <div class="ct-loading-dot" style="background-color: ${color};"></div>
              <div class="ct-loading-dot" style="background-color: ${color};"></div>
              <div class="ct-loading-dot" style="background-color: ${color};"></div>
            </div>
            ${loadingMessage ? `<div style="margin-left: 8px; font-size: 12px; color: #6b7280;">${this.escapeHtml(loadingMessage)}</div>` : ''}
          </div>
        `;
      }
    }

    renderQuickReplies() {
      if (this.quickReplies.length === 0) return '';
      
      const quickRepliesConfig = this.skinConfig?.components?.quickReplies || {};
      const primaryColor = this.config.primaryColor || '#6366f1';
      const backgroundColor = this.config.backgroundColor || '#ffffff';
      const layout = quickRepliesConfig.layout || 'horizontal';
      const style = quickRepliesConfig.style || 'buttons';
      const maxVisible = quickRepliesConfig.maxVisible || null;
      
      const replies = maxVisible ? this.quickReplies.slice(0, maxVisible) : this.quickReplies;
      
      // Layout styles
      const layoutStyles = {
        horizontal: 'flex-direction: row; flex-wrap: wrap;',
        vertical: 'flex-direction: column;',
        grid: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));'
      };
      const containerStyle = layoutStyles[layout] || layoutStyles.horizontal;
      
      // Determine text color based on background - ensure visibility
      const isDarkBg = !this.isLightColor(backgroundColor);
      const replyTextColor = isDarkBg ? '#ffffff' : primaryColor;
      
      // Style-specific styling - classes handle hover, inline styles handle base
      let replyStyle = '';
      let replyClass = 'ct-quick-reply';
      if (style === 'chips') {
        replyClass = 'ct-quick-reply ct-quick-reply-chips';
        replyStyle = `border-radius: 20px; padding: 6px 14px; color: ${replyTextColor} !important;`;
      } else if (style === 'links') {
        replyClass = 'ct-quick-reply ct-quick-reply-links';
        replyStyle = `padding: 4px 8px; color: ${replyTextColor} !important;`;
      } else {
        replyClass = 'ct-quick-reply';
        replyStyle = `border-radius: 16px; padding: 6px 12px; color: ${replyTextColor} !important;`;
      }
      
      return `
        <div class="ct-quick-replies" style="${containerStyle}">
          ${replies.map(reply => `
            <button class="${replyClass}" data-reply="${this.escapeHtml(reply)}" style="${replyStyle}">
              ${this.escapeHtml(reply)}
            </button>
          `).join('')}
        </div>
      `;
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    attachEventListeners() {
      // Prevent duplicate event listeners
      if (this.eventListenersAttached) {
        return;
      }
      this.eventListenersAttached = true;

      // Use event delegation since content changes
      this.container.addEventListener('click', (e) => {
        if (e.target.closest('.ct-button')) {
          this.toggleChat();
        } else if (e.target.closest('.ct-close')) {
          this.closeChat();
        } else if (e.target.closest('.ct-minimize')) {
          this.toggleMinimize();
        } else if (e.target.closest('.ct-quick-reply')) {
          e.preventDefault();
          e.stopPropagation();
          
          // Prevent multiple clicks
          if (this.isSendingMessage || this.isLoading) {
            return;
          }
          
          const replyButton = e.target.closest('.ct-quick-reply');
          const reply = replyButton.dataset.reply;
          
          if (!reply) {
            return;
          }
          
          // Disable all quick reply buttons immediately
          const allQuickReplies = this.container.querySelectorAll('.ct-quick-reply');
          allQuickReplies.forEach(btn => {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
          });
          
          // Clear quick replies and send message
          this.quickReplies = [];
          this.sendMessage(reply);
        }
      });


      this.container.addEventListener('submit', (e) => {
        if (e.target.id === 'ct-form' || e.target.closest('#ct-form')) {
          e.preventDefault();
          e.stopPropagation();
          const input = this.container.querySelector('#ct-input');
          if (input) {
            const message = input.value.trim();
            // Always clear the input completely - allow full deletion
            input.value = '';
            input.setAttribute('value', '');
            input.removeAttribute('value');
            // Trigger input event to ensure UI updates
            input.dispatchEvent(new Event('input', { bubbles: true }));
            if (message) {
              this.sendMessage(message);
            }
          }
        }
      });
      
      // Handle input events to enforce maxLength but allow deletion
      this.container.addEventListener('input', (e) => {
        if (e.target.id === 'ct-input') {
          const input = e.target;
          const maxLength = this.getConfigValue('components.input.maxLength', null);
          
          // Only enforce maxLength when typing (not when deleting)
          // maxLength attribute handles this, but we ensure deletion always works
          if (maxLength && input.value.length > maxLength) {
            // User typed too much, truncate to maxLength
            input.value = input.value.substring(0, maxLength);
          }
          
          // Update character count if enabled
          if (this.getConfigValue('components.input.showCharacterCount', false) && maxLength) {
            const charCountEl = this.container.querySelector('#ct-char-count');
            if (charCountEl) {
              charCountEl.textContent = input.value.length;
            }
          }
          
          // Allow deletion of any length - no restrictions on clearing
        }
      });
      
      // Also handle Enter key directly on input
      this.container.addEventListener('keydown', (e) => {
        if (e.target.id === 'ct-input') {
          const allowMultiline = this.getConfigValue('components.input.allowMultiline', false);
          
          // For textarea: Shift+Enter = new line, Enter = send
          // For input: Enter = send
          if (e.key === 'Enter' && (!allowMultiline || !e.shiftKey)) {
            e.preventDefault();
            const input = e.target;
            const message = input.value.trim();
            // Always clear the input completely
            input.value = '';
            // Force clear by resetting the input
            input.setAttribute('value', '');
            input.removeAttribute('value');
            // Trigger input event to ensure UI updates (including character count)
            input.dispatchEvent(new Event('input', { bubbles: true }));
            if (message) {
              this.sendMessage(message);
            }
          }
        }
      });
    }

    toggleChat() {
      this.isOpen = !this.isOpen;
      this.isMinimized = false;
      this.updateView();
      
      if (this.isOpen && this.messages.length === 0) {
        this.initializeConversation();
      }
    }

    closeChat() {
      this.isOpen = false;
      this.isMinimized = false;
      this.updateView();
    }

    toggleMinimize() {
      this.isMinimized = !this.isMinimized;
      this.updateView();
    }

    updateView() {
      // Re-inject styles in case config changed
      this.injectStyles();
      
      if (this.isOpen) {
        this.container.innerHTML = this.renderWindow();
        // Reset event listeners flag when re-rendering
        this.eventListenersAttached = false;
        this.attachEventListeners();
        this.scrollToBottom();
        
        // Initialize character count if enabled and update input text color
        const input = this.container.querySelector('#ct-input');
        if (input) {
          // Set adaptive text color based on background
          const backgroundColor = this.config.backgroundColor || '#ffffff';
          const inputBg = backgroundColor === '#ffffff' || !backgroundColor ? 'white' : backgroundColor;
          const inputTextColor = this.getContrastTextColor(inputBg);
          const placeholderColor = this.isLightColor(inputBg) ? 'rgba(31, 41, 55, 0.6)' : 'rgba(255, 255, 255, 0.6)';
          input.style.setProperty('color', inputTextColor, 'important');
          input.style.setProperty('font-weight', '500', 'important');
          
          if (this.getConfigValue('components.input.showCharacterCount', false)) {
            const maxLength = this.getConfigValue('components.input.maxLength', null);
            const charCountEl = this.container.querySelector('#ct-char-count');
            if (charCountEl && maxLength) {
              charCountEl.textContent = input.value.length;
            }
          }
          
          if (!this.isMinimized) {
            setTimeout(() => input.focus(), 100);
          }
        }
      } else {
        this.container.innerHTML = this.renderButton();
        this.attachEventListeners();
      }
    }

    scrollToBottom() {
      const messagesContainer = this.container.querySelector('#ct-messages');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }

    async initializeConversation() {
      if (!this.config.treeId) {
        this.addMessage('bot', "Sorry, no chatbot is configured. Please contact support.");
        return;
      }

      this.isLoading = true;
      this.updateView();

      try {
        const requestBody = {
          tree_id: this.config.treeId,
          user_message: '__START__',
          session_id: null,
          user_id: this.config.userId || null,
          use_memory: this.config.useMemory !== false
        };
        
        const response = await fetch(`${this.config.apiUrl}/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        this.sessionId = data.session_id;

        if (data.bot_response) {
          // Set options BEFORE adding message (so they're included when updateView is called)
          if (data.options && data.options.length > 0) {
            this.quickReplies = data.options;
          } else {
            this.quickReplies = [];
          }
          
          // Add message (this will call updateView which will include the quick replies)
          this.addMessage('bot', data.bot_response);
        } else {
          this.addMessage('bot', "Sorry, I received an empty response. Please try again.");
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        this.addMessage('bot', "Sorry, I'm having trouble connecting. Please try again.");
      } finally {
        this.isLoading = false;
        this.isSendingMessage = false;
        this.updateView();
      }
    }

    async sendMessage(message) {
      // Prevent multiple simultaneous sends
      if (this.isSendingMessage) {
        return;
      }
      
      // Don't send if treeId is not set
      if (!this.config.treeId) {
        this.addMessage('bot', "Sorry, the chatbot is not properly configured. Please contact support.");
        return;
      }
      
      this.isSendingMessage = true;
      this.addMessage('user', message);
      this.quickReplies = [];
      this.isLoading = true;
      this.updateView();

      try {
        const requestBody = {
          tree_id: this.config.treeId,
          user_message: message,
          session_id: this.sessionId,
          user_id: this.config.userId || null,
          use_memory: this.config.useMemory !== false
        };
        
        const response = await fetch(`${this.config.apiUrl}/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        const data = await response.json();

        if (!this.sessionId) {
          this.sessionId = data.session_id;
        }

        if (data.bot_response) {
          // Set options BEFORE adding message (so they're included when updateView is called)
          if (data.options && data.options.length > 0) {
            this.quickReplies = data.options;
          } else {
            this.quickReplies = [];
          }
          
          // Add message (this will call updateView which will include the quick replies)
          this.addMessage('bot', data.bot_response);
        }
      } catch (error) {
        console.error('Error sending message:', error);
        this.addMessage('bot', "Sorry, I'm having trouble. Please try again.");
      } finally {
        this.isLoading = false;
        this.isSendingMessage = false;
        this.updateView();
      }
    }

    addMessage(type, content) {
      const showTimestamps = this.getConfigValue('components.messages.showTimestamps', false);
      this.messages.push({
        type,
        content,
        id: Date.now() + Math.random(),
        timestamp: showTimestamps ? new Date().toISOString() : undefined
      });
      this.updateView();
    }
  }

  // Global API
  window.ConversaTree = {
    init: function(config) {
      if (window.ConversaTree.instance) {
        return window.ConversaTree.instance;
      }
      window.ConversaTree.instance = new ConversaTreeWidget(config);
      return window.ConversaTree.instance;
    },
    instance: null,
    
  };

  // Auto-initialize if data attributes are present
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  function autoInit() {
    const script = document.querySelector('script[data-conversatree]');
    if (script) {
      const config = {
        apiUrl: script.getAttribute('data-api-url') || defaults.apiUrl,
        treeId: script.getAttribute('data-tree-id') ? parseInt(script.getAttribute('data-tree-id')) : null,
        websiteId: script.getAttribute('data-website-id') ? parseInt(script.getAttribute('data-website-id')) : null,
        domain: script.getAttribute('data-domain') || null,
        skinId: script.getAttribute('data-skin-id') ? parseInt(script.getAttribute('data-skin-id')) : null,
        userId: script.getAttribute('data-user-id') || script.getAttribute('data-user_id') || null,
        useMemory: script.getAttribute('data-use-memory') !== 'false',
        position: script.getAttribute('data-position') || defaults.position,
        primaryColor: script.getAttribute('data-primary-color') || null,
        backgroundColor: script.getAttribute('data-background-color') || null,
        textColor: script.getAttribute('data-text-color') || null,
        title: script.getAttribute('data-title') || defaults.title
      };
      window.ConversaTree.init(config);
    }
  }
})();
