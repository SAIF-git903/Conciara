/**
 * ConversaTree Chatbot Widget
 * Standalone JavaScript widget - no iframe needed
 * 
 * Usage:
 * <script src="http://localhost:3000/widget.js"></script>
 * <script>
 *   ConversaTree.init({
 *     apiUrl: 'http://localhost:3001/api',
 *     treeId: 1
 *   });
 * </script>
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
    position: 'bottom-right',
    primaryColor: '#6366f1',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    buttonText: 'Chat',
    title: 'Chat Assistant'
  };

  // Widget class
  class ConversaTreeWidget {
    constructor(config) {
      // Store raw config (user-provided values only, not merged with defaults)
      this.rawConfig = { ...config };
      // Store defaults separately to detect if user explicitly provided values
      this.defaults = { ...defaults };
      this.config = { ...defaults };
      this.sessionId = null;
      this.isOpen = false;
      this.isMinimized = false;
      this.messages = [];
      this.quickReplies = [];
      this.isLoading = false;
      this.container = null;
      this.configLoaded = false;
      
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
      // If treeId is provided directly, use it (manual mode - bypasses all lookups)
      if (this.rawConfig.treeId) {
        this.config = { ...this.rawConfig };
        this.configLoaded = true;
        return;
      }

      // PRIORITY: skinId > websiteId > domain
      // If skinId is provided, use it directly (bypasses website/domain lookup)
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
            this.injectStyles();
            
            const color = this.config.primaryColor;
            
            // Update button
            const button = this.container.querySelector('.ct-button');
            if (button) {
              button.style.setProperty('background-color', color, 'important');
            }
            
            // Update header
            const header = this.container.querySelector('.ct-header');
            if (header) {
              header.style.setProperty('background-color', color, 'important');
            }
            
            // Update send button
            const sendButton = this.container.querySelector('.ct-send-button');
            if (sendButton) {
              sendButton.style.setProperty('background-color', color, 'important');
            }
            
            // Update quick reply buttons
            const quickReplies = this.container.querySelectorAll('.ct-quick-reply');
            quickReplies.forEach(btn => {
              btn.style.setProperty('border-color', color, 'important');
              btn.style.setProperty('color', color, 'important');
            });
            
            // Re-render if window is closed to apply all inline styles
            if (!this.isOpen) {
              this.container.innerHTML = this.renderButton();
              this.attachEventListeners();
            } else {
              // Re-render window to apply header and send button colors
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

      // DOMAIN-BASED LOOKUP (Fallback if no skinId)
      // Selection logic:
      // 1. Find website by domain
      // 2. Get active skin for website (is_active = true, or first created)
      // 3. Get active A/B variation for skin (is_active = true, or first created)
      // 4. Get dialog tree for variation (first created)
      // 5. Merge skin config with variation overrides
      
      if (this.rawConfig.domain) {
        try {
          const params = new URLSearchParams();
          params.append('domain', this.rawConfig.domain);

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
            this.injectStyles();
            // Update button directly
            const button = this.container.querySelector('.ct-button');
            if (button) {
              button.style.setProperty('background-color', this.config.primaryColor, 'important');
            }
            // Re-render button to apply inline style
            if (!this.isOpen) {
              this.container.innerHTML = this.renderButton();
              this.attachEventListeners();
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
              this.config = {
                ...defaults,
                ...this.rawConfig,
                treeId: widgetConfig.treeId,
                primaryColor: this.rawConfig.primaryColor || widgetConfig.theme?.primaryColor || defaults.primaryColor,
                backgroundColor: this.rawConfig.backgroundColor || widgetConfig.theme?.backgroundColor || defaults.backgroundColor,
                textColor: this.rawConfig.textColor || widgetConfig.theme?.textColor || defaults.textColor,
                position: this.rawConfig.position || widgetConfig.position || defaults.position,
                title: this.rawConfig.title || widgetConfig.title || defaults.title
              };
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

      // Create widget container
      this.container = document.createElement('div');
      this.container.id = 'conversatree-widget';
      this.container.innerHTML = this.renderButton();
      document.body.appendChild(this.container);

      // Add styles
      this.injectStyles();

      // Add event listeners
      this.attachEventListeners();
    }

    injectStyles() {
      // Remove old styles if they exist (for config updates)
      const oldStyle = document.getElementById('conversatree-styles');
      if (oldStyle) {
        oldStyle.remove();
      }

      // Ensure we have a color (use config or default)
      const primaryColor = this.config.primaryColor || defaults.primaryColor;
      
      // Update config if it was using default
      if (!this.config.primaryColor || this.config.primaryColor === defaults.primaryColor) {
        this.config.primaryColor = primaryColor;
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
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background-color: ${primaryColor} !important;
          color: white !important;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s, box-shadow 0.2s, background-color 0.3s;
        }

        .ct-button:hover {
          transform: scale(1.1);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .ct-window {
          width: 384px;
          height: 600px;
          background: ${this.config.backgroundColor};
          border-radius: 8px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .ct-window.minimized {
          height: 48px;
        }

        .ct-header {
          background-color: ${primaryColor} !important;
          color: white;
          padding: 12px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-shrink: 0;
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
          gap: 12px;
          background: ${this.config.backgroundColor};
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
          background-color: ${this.config.primaryColor};
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
          background-color: #f3f4f6;
          color: #111827;
        }

        .ct-message.bot .ct-message-content {
          background-color: ${this.config.primaryColor};
          color: white;
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

        .ct-quick-replies {
          padding: 8px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          border-top: 1px solid #e5e7eb;
          background: ${this.config.backgroundColor};
        }

        .ct-quick-reply {
          padding: 6px 12px;
          border: 1px solid ${primaryColor} !important;
          border-radius: 16px;
          background: transparent;
          color: ${primaryColor} !important;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .ct-quick-reply:hover {
          background-color: ${this.config.primaryColor};
          color: white;
        }

        .ct-input-container {
          padding: 16px;
          border-top: 1px solid #e5e7eb;
          background: ${this.config.backgroundColor};
        }

        .ct-input-form {
          display: flex;
          gap: 8px;
        }

        .ct-input {
          flex: 1;
          padding: 10px 14px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          outline: none;
          transition: border-color 0.2s;
        }

        .ct-input:focus {
          border-color: ${primaryColor};
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
      return positions[this.config.position] || positions['bottom-right'];
    }

    renderButton() {
      // Use inline style to ensure color is always applied
      const color = this.config.primaryColor || '#6366f1';
      return `
        <button class="ct-button" aria-label="Open chat" style="background-color: ${color} !important;">
          <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      `;
    }

    renderWindow() {
      // Use inline styles to ensure colors are always applied
      const primaryColor = this.config.primaryColor || '#6366f1';
      
      return `
        <div class="ct-window ${this.isMinimized ? 'minimized' : ''}">
          <div class="ct-header" style="background-color: ${primaryColor} !important;">
            <div class="ct-header-title">
              <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>${this.config.title}</span>
            </div>
            <div class="ct-header-actions">
              <button class="ct-header-button ct-minimize" aria-label="Minimize">
                <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
                </svg>
              </button>
              <button class="ct-header-button ct-close" aria-label="Close">
                <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          ${!this.isMinimized ? `
            <div class="ct-messages" id="ct-messages">
              ${this.messages.length === 0 && !this.isLoading ? `
                <div style="text-align: center; color: #6b7280; padding: 20px; font-size: 14px;">
                  Starting conversation...
                </div>
              ` : ''}
              ${this.messages.map(msg => this.renderMessage(msg)).join('')}
              ${this.isLoading ? this.renderLoading() : ''}
            </div>
            ${this.quickReplies.length > 0 ? this.renderQuickReplies() : ''}
            <div class="ct-input-container">
              <form class="ct-input-form" id="ct-form">
                <input 
                  type="text" 
                  class="ct-input" 
                  id="ct-input" 
                  placeholder="Type your message..."
                  autocomplete="off"
                />
                <button type="submit" class="ct-send-button" id="ct-send" style="background-color: ${primaryColor} !important;" ${this.isLoading ? 'disabled' : ''}>
                  <svg class="ct-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </form>
            </div>
          ` : ''}
        </div>
      `;
    }

    renderMessage(message) {
      const isUser = message.type === 'user';
      return `
        <div class="ct-message ${message.type}">
          <div class="ct-message-avatar">
            ${isUser ? '👤' : '🤖'}
          </div>
          <div class="ct-message-content">
            ${this.escapeHtml(message.content)}
          </div>
        </div>
      `;
    }

    renderLoading() {
      return `
        <div class="ct-message bot">
          <div class="ct-message-avatar">🤖</div>
          <div class="ct-loading">
            <div class="ct-loading-dot"></div>
            <div class="ct-loading-dot"></div>
            <div class="ct-loading-dot"></div>
          </div>
        </div>
      `;
    }

    renderQuickReplies() {
      if (this.quickReplies.length === 0) return '';
      
      const primaryColor = this.config.primaryColor || '#6366f1';
      
      return `
        <div class="ct-quick-replies">
          ${this.quickReplies.map(reply => `
            <button class="ct-quick-reply" data-reply="${this.escapeHtml(reply)}" style="border-color: ${primaryColor} !important; color: ${primaryColor} !important;">
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
      // Use event delegation since content changes
      this.container.addEventListener('click', (e) => {
        if (e.target.closest('.ct-button')) {
          this.toggleChat();
        } else if (e.target.closest('.ct-close')) {
          this.closeChat();
        } else if (e.target.closest('.ct-minimize')) {
          this.toggleMinimize();
        } else if (e.target.closest('.ct-quick-reply')) {
          const reply = e.target.closest('.ct-quick-reply').dataset.reply;
          this.sendMessage(reply);
        }
      });

      this.container.addEventListener('submit', (e) => {
        if (e.target.id === 'ct-form') {
          e.preventDefault();
          const input = this.container.querySelector('#ct-input');
          if (input && input.value.trim()) {
            this.sendMessage(input.value.trim());
            input.value = '';
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
        this.scrollToBottom();
        const input = this.container.querySelector('#ct-input');
        if (input && !this.isMinimized) {
          setTimeout(() => input.focus(), 100);
        }
      } else {
        this.container.innerHTML = this.renderButton();
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
        const response = await fetch(`${this.config.apiUrl}/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tree_id: this.config.treeId,
            user_message: '__START__',
            session_id: null
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        this.sessionId = data.session_id;

        if (data.bot_response) {
          this.addMessage('bot', data.bot_response);
          if (data.options && data.options.length > 0) {
            this.quickReplies = data.options;
            this.updateView();
          }
        } else {
          this.addMessage('bot', "Sorry, I received an empty response. Please try again.");
        }
      } catch (error) {
        console.error('Error initializing conversation:', error);
        this.addMessage('bot', "Sorry, I'm having trouble connecting. Please try again.");
      } finally {
        this.isLoading = false;
        this.updateView();
      }
    }

    async sendMessage(message) {
      this.addMessage('user', message);
      this.quickReplies = [];
      this.isLoading = true;
      this.updateView();

      try {
        const response = await fetch(`${this.config.apiUrl}/chat/message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tree_id: this.config.treeId,
            user_message: message,
            session_id: this.sessionId
          })
        });

        const data = await response.json();

        if (!this.sessionId) {
          this.sessionId = data.session_id;
        }

        if (data.bot_response) {
          this.addMessage('bot', data.bot_response);
          if (data.options && data.options.length > 0) {
            this.quickReplies = data.options;
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
        this.addMessage('bot', "Sorry, I'm having trouble. Please try again.");
      } finally {
        this.isLoading = false;
        this.updateView();
      }
    }

    addMessage(type, content) {
      this.messages.push({
        type,
        content,
        id: Date.now() + Math.random()
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
    instance: null
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

