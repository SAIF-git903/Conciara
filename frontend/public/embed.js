/**
 * Conciara embed loader
 *
 * Loads the chat widget in an iframe. Add to your site:
 * <script
 *   src="https://YOUR_APP_ORIGIN/embed.js"
 *   data-api-url="https://YOUR_API_ORIGIN/api"
 *   data-workspace-id="1"
 *   data-agent-id="2"
 *   data-position="bottom-right">
 * </script>
 *
 * Optional session init params:
 *   <script>ChatbotWidget.init({ sessionData: { customer_id: 'cust_4821' } });</script>
 * Values are forwarded to every chat request for server-side action injection.
 */
(function () {
  'use strict';

  if (!window.ChatbotWidget) {
    var _iframes = [];
    var _sessionData = {};

    function _relayTo(iframe) {
      if (!iframe || !iframe.contentWindow) return;
      try {
        iframe.contentWindow.postMessage(
          { type: 'conciara-session-data', sessionData: _sessionData },
          '*'
        );
      } catch (err) { /* no-op */ }
    }

    function _relayAll() {
      for (var i = 0; i < _iframes.length; i += 1) _relayTo(_iframes[i]);
    }

    function _normalizeSessionData(raw) {
      if (!raw || typeof raw !== 'object') return {};
      var out = {};
      for (var k in raw) {
        if (!Object.prototype.hasOwnProperty.call(raw, k)) continue;
        var v = raw[k];
        if (typeof v === 'string') out[k] = v;
        else if (typeof v === 'number' || typeof v === 'boolean') out[k] = String(v);
      }
      return out;
    }

    window.ChatbotWidget = {
      init: function (config) {
        if (!config || typeof config !== 'object') return;
        if (config.sessionData) {
          _sessionData = _normalizeSessionData(config.sessionData);
          _relayAll();
        }
      },
      /** Internal: embed.js IIFE registers its iframe so init() relays find it. */
      _registerIframe: function (iframe) {
        if (!iframe) return;
        _iframes.push(iframe);
        if (iframe.addEventListener) {
          iframe.addEventListener('load', function () { _relayTo(iframe); });
        }
        _relayTo(iframe);
      }
    };

    // Iframe announces readiness on mount → re-send the stored sessionData to that frame.
    window.addEventListener('message', function (event) {
      if (!event || !event.data || event.data.type !== 'conciara-embed-ready') return;
      for (var i = 0; i < _iframes.length; i += 1) {
        if (_iframes[i].contentWindow === event.source) _relayTo(_iframes[i]);
      }
    });
  }

  if (!window.ChatbotActions) {
    var registry = {};
    var pendingResults = {};
    window.ChatbotActions = {
      register: function (functionName, handler) {
        if (!functionName || typeof handler !== 'function') return;
        registry[String(functionName)] = handler;
      },
      invoke: async function (functionName, inputs) {
        var fn = registry[String(functionName)];
        if (!fn) throw new Error('No client-side action registered: ' + functionName);
        var result = await fn(inputs || {});
        return result;
      },
      respond: function (functionName, result) {
        pendingResults[String(functionName)] = result;
        window.dispatchEvent(new CustomEvent('chatbot:action:result', {
          detail: { functionName: String(functionName), result: result }
        }));
      },
      getLastResult: function (functionName) {
        return pendingResults[String(functionName)];
      }
    };
  }

  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  function getOrigin() {
    var src = scriptTag.src || '';
    var match = src.match(/^(https?:)\/\/([^/#?]+)(:\d+)?/);
    if (match) return match[1] + '//' + match[2] + (match[3] || '');
    return window.location.origin;
  }

  function attr(name) {
    return scriptTag.getAttribute('data-' + name);
  }

  var origin = getOrigin();
  var apiUrl = (attr('api-url') || '').replace(/\/+$/, '');
  var workspaceId = attr('workspace-id');
  var agentId = attr('agent-id');
  var position = attr('position') || 'bottom-right';

  if (!apiUrl || !workspaceId || !agentId) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[Conciara] embed.js: data-api-url, data-workspace-id, and data-agent-id are required.');
    }
    return;
  }

  var iframeSrc = origin + '/embed/chat?workspaceId=' + encodeURIComponent(workspaceId)
    + '&agentId=' + encodeURIComponent(agentId)
    + '&apiUrl=' + encodeURIComponent(apiUrl);

  var width = 384;
  var height = 600;
  var gap = 24;
  var launcherSize = 56;
  var zIndex = 2147483647;

  var positionStyles = {};
  if (position === 'bottom-left') {
    positionStyles.left = gap + 'px';
    positionStyles.bottom = gap + 'px';
  } else if (position === 'top-right') {
    positionStyles.right = gap + 'px';
    positionStyles.top = gap + 'px';
  } else if (position === 'top-left') {
    positionStyles.left = gap + 'px';
    positionStyles.top = gap + 'px';
  } else {
    positionStyles.right = gap + 'px';
    positionStyles.bottom = gap + 'px';
  }

  function toCss(obj) {
    var s = '';
    for (var k in obj) if (obj.hasOwnProperty(k)) s += k.replace(/([A-Z])/g, '-$1').toLowerCase() + ':' + obj[k] + ';';
    return s;
  }

  var container = document.createElement('div');
  container.id = 'conciara-embed';
  container.style.cssText = 'position:fixed;z-index:' + zIndex + ';' + toCss(positionStyles);

  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.setAttribute('aria-label', 'Open chat');
  launcher.style.cssText = 'width:' + launcherSize + 'px;height:' + launcherSize + 'px;border:none;border-radius:50%;'
    + 'background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#fff;cursor:pointer;box-shadow:0 4px 20px rgba(0,0,0,0.2);'
    + 'display:flex;align-items:center;justify-content:center;transition:transform 0.2s,box-shadow 0.2s;';
  var LAUNCHER_GAP = 12;

  function panelTransformOrigin(pos) {
    if (pos === 'top-left') return 'top left';
    if (pos === 'top-right') return 'top right';
    if (pos === 'bottom-left') return 'bottom left';
    return 'bottom right';
  }

  function panelEdgeOffset() {
    return (launcherSize + LAUNCHER_GAP) + 'px';
  }
  var chatIconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  var botIconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
  var closeIconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
  var isPanelOpen = false;
  var launcherChatIcon = chatIconSvg;

  function sizePx(size) {
    if (size === 'small') return 48;
    if (size === 'medium') return 56;
    return 64;
  }

  function borderRadiusFor(type) {
    if (type === 'square') return '0';
    if (type === 'rounded') return '12px';
    return '50%';
  }

  function applyPosition(pos) {
    position = pos;
    container.style.top = '';
    container.style.bottom = '';
    container.style.left = '';
    container.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
    if (pos === 'bottom-left') {
      container.style.left = gap + 'px';
      container.style.bottom = gap + 'px';
    } else if (pos === 'top-right') {
      container.style.right = gap + 'px';
      container.style.top = gap + 'px';
    } else if (pos === 'top-left') {
      container.style.left = gap + 'px';
      container.style.top = gap + 'px';
    } else {
      container.style.right = gap + 'px';
      container.style.bottom = gap + 'px';
    }
    if (pos === 'top-left' || pos === 'top-right') {
      panel.style.top = panelEdgeOffset();
    } else {
      panel.style.bottom = panelEdgeOffset();
    }
    panel.style.transformOrigin = panelTransformOrigin(pos);
  }

  function applyLauncherStyle(btn, theme) {
    if (!btn && !theme) return;
    var px = sizePx(btn && btn.size);
    launcherSize = px;
    launcher.style.width = px + 'px';
    launcher.style.height = px + 'px';
    launcher.style.borderRadius = borderRadiusFor(btn && btn.type);
    var primary = (theme && theme.primaryColor) || '#0f172a';
    launcher.style.background = primary;
    if (btn && btn.icon === 'custom' && btn.customIconUrl) {
      launcherChatIcon = '<img src="' + btn.customIconUrl.replace(/"/g, '&quot;') + '" alt="" style="width:28px;height:28px;object-fit:contain" />';
    } else if (btn && btn.icon === 'bot') {
      launcherChatIcon = botIconSvg;
    } else {
      launcherChatIcon = chatIconSvg;
    }
    if (!isPanelOpen) launcher.innerHTML = launcherChatIcon;
  }

  function setPanelOpen(open) {
    isPanelOpen = open;
    launcher.innerHTML = open ? closeIconSvg : launcherChatIcon;
    launcher.setAttribute('aria-label', open ? 'Close chat' : 'Open chat');
    if (open) {
      panel.style.transition = panelOpenTransition;
      panel.style.display = 'block';
      panel.style.opacity = '0';
      panel.style.transform = 'scale(0)';
      void panel.offsetWidth;
      panel.style.opacity = '1';
      panel.style.transform = 'scale(1)';
    } else {
      panel.style.transition = panelCloseTransition;
      panel.style.opacity = '0';
      panel.style.transform = 'scale(0)';
      setTimeout(function () {
        if (!isPanelOpen) panel.style.display = 'none';
      }, 320);
    }
  }

  launcher.innerHTML = chatIconSvg;
  launcher.onmouseover = function () { launcher.style.transform = 'scale(1.05)'; launcher.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)'; };
  launcher.onmouseout = function () { launcher.style.transform = 'scale(1)'; launcher.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; };

  var panel = document.createElement('div');
  panel.style.cssText = 'display:none;position:absolute;width:' + width + 'px;height:' + height + 'px;'
    + 'border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.15);overflow:hidden;background:#fff;'
    +     'opacity:0;transform:scale(0);transform-origin:' + panelTransformOrigin(position) + ';'
    + 'transition:transform 0.34s cubic-bezier(0.16,1,0.3,1),opacity 0.34s cubic-bezier(0.16,1,0.3,1);';
  var panelOpenTransition = 'transform 0.34s cubic-bezier(0.16,1,0.3,1),opacity 0.22s cubic-bezier(0.16,1,0.3,1) 0.14s';
  var panelCloseTransition = 'transform 0.34s cubic-bezier(0.16,1,0.3,1),opacity 0.34s cubic-bezier(0.16,1,0.3,1)';
  if (position === 'bottom-left' || position === 'top-left') {
    panel.style.left = '0';
  } else {
    panel.style.right = '0';
  }
  applyPosition(position);

  var iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.title = 'Chat';
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  panel.appendChild(iframe);

  if (window.ChatbotWidget && typeof window.ChatbotWidget._registerIframe === 'function') {
    window.ChatbotWidget._registerIframe(iframe);
  }

  launcher.onclick = function () {
    setPanelOpen(!isPanelOpen);
  };

  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'conciara-embed-close') {
      setPanelOpen(false);
    }
  });

  container.appendChild(launcher);
  container.appendChild(panel);

  function appendContainer() {
    var target = document.body || document.documentElement;
    if (target) target.appendChild(container);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', appendContainer);
  } else {
    appendContainer();
  }

  fetch(apiUrl + '/public/widget-config?workspaceId=' + encodeURIComponent(workspaceId) + '&agentId=' + encodeURIComponent(agentId))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      var cfg = data && data.config;
      if (!cfg) return;
      var btn = cfg.components && cfg.components.button;
      var theme = cfg.theme;
      if (btn && btn.position) {
        applyPosition(btn.position);
      }
      if (cfg.components && cfg.components.window) {
        if (cfg.components.window.width) width = cfg.components.window.width;
        if (cfg.components.window.height) height = cfg.components.window.height;
        panel.style.width = width + 'px';
        panel.style.height = height + 'px';
        if (cfg.components.window.borderRadius != null) {
          panel.style.borderRadius = cfg.components.window.borderRadius + 'px';
        }
      }
      applyLauncherStyle(btn, theme);
    })
    .catch(function () { /* use defaults */ });
})();
