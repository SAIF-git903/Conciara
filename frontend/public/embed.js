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
 */
(function () {
  'use strict';

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
  launcher.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  launcher.onmouseover = function () { launcher.style.transform = 'scale(1.05)'; launcher.style.boxShadow = '0 6px 24px rgba(0,0,0,0.25)'; };
  launcher.onmouseout = function () { launcher.style.transform = 'scale(1)'; launcher.style.boxShadow = '0 4px 20px rgba(0,0,0,0.2)'; };

  var panel = document.createElement('div');
  panel.style.cssText = 'display:none;position:absolute;width:' + width + 'px;height:' + height + 'px;'
    + 'border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,0.15);overflow:hidden;background:#fff;';
  if (position === 'bottom-left' || position === 'top-left') {
    panel.style.left = '0';
  } else {
    panel.style.right = '0';
  }
  if (position === 'top-left' || position === 'top-right') {
    panel.style.top = (launcherSize + 8) + 'px';
  } else {
    panel.style.bottom = (launcherSize + 8) + 'px';
  }

  var iframe = document.createElement('iframe');
  iframe.src = iframeSrc;
  iframe.title = 'Chat';
  iframe.style.cssText = 'width:100%;height:100%;border:none;display:block;';
  panel.appendChild(iframe);

  launcher.onclick = function () {
    launcher.style.display = 'none';
    panel.style.display = 'block';
  };

  window.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'conciara-embed-close') {
      panel.style.display = 'none';
      launcher.style.display = 'flex';
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
})();
