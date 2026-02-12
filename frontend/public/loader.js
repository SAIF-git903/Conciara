/**
 * ConversaTree Widget Loader
 *
 * Validates that the website/skin/tree configuration exists and is allowed before
 * fetching the full widget. If validation fails, the chatbot code is never loaded.
 *
 * Usage (data attributes - recommended):
 * <script
 *   src="https://your-app.com/loader.js"
 *   data-api-url="https://api.your-app.com/api"
 *   data-website-id="1"
 *   data-domain="example.com"
 *   data-skin-id="2"
 *   data-tree-id="35"
 *   data-user-id="optional-user-id"
 *   data-use-memory="true"
 *   data-position="bottom-right">
 * </script>
 *
 * Usage (programmatic - set config before loader runs):
 * <script>
 *   window.ConversaTreeConfig = {
 *     apiUrl: 'https://api.your-app.com/api',
 *     websiteId: 1,
 *     domain: 'example.com',
 *     skinId: 2,
 *     treeId: 35
 *   };
 * </script>
 * <script src="https://your-app.com/loader.js"></script>
 */
(function () {
  'use strict';

  var scriptTag = document.currentScript;
  if (!scriptTag) return;

  function getConfig() {
    if (window.ConversaTreeConfig && typeof window.ConversaTreeConfig === 'object') {
      return window.ConversaTreeConfig;
    }
    var attr = function (name) {
      return scriptTag.getAttribute('data-' + name);
    };
    var config = {};
    var apiUrl = attr('api-url');
    if (apiUrl) config.apiUrl = apiUrl;
    var websiteId = attr('website-id');
    if (websiteId) config.websiteId = parseInt(websiteId, 10);
    var domain = attr('domain');
    if (domain) config.domain = domain;
    var skinId = attr('skin-id');
    if (skinId) config.skinId = parseInt(skinId, 10);
    var treeId = attr('tree-id');
    if (treeId) config.treeId = parseInt(treeId, 10);
    var userId = attr('user-id') || attr('user_id');
    if (userId) config.userId = userId;
    var useMemory = attr('use-memory');
    if (useMemory !== undefined) config.useMemory = useMemory !== 'false';
    var position = attr('position');
    if (position) config.position = position;
    var primaryColor = attr('primary-color');
    if (primaryColor) config.primaryColor = primaryColor;
    var backgroundColor = attr('background-color');
    if (backgroundColor) config.backgroundColor = backgroundColor;
    var textColor = attr('text-color');
    if (textColor) config.textColor = textColor;
    var title = attr('title');
    if (title) config.title = title;
    return config;
  }

  function buildValidateParams(config) {
    var params = new URLSearchParams();
    if (config.skinId != null && !isNaN(config.skinId)) {
      params.append('skinId', String(config.skinId));
      return params;
    }
    if (config.treeId != null && !isNaN(config.treeId)) {
      params.append('treeId', String(config.treeId));
      return params;
    }
    if (config.websiteId != null && !isNaN(config.websiteId)) {
      params.append('websiteId', String(config.websiteId));
      return params;
    }
    if (config.domain) {
      params.append('domain', config.domain);
      return params;
    }
    return null;
  }

  function getWidgetUrl() {
    var src = scriptTag.src;
    var base = src.replace(/\/loader\.js(\?.*)?$/i, '');
    return base + '/widget.js';
  }

  var config = getConfig();
  var apiUrl = (config.apiUrl || '').replace(/\/+$/, '');
  if (!apiUrl) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[ConversaTree] loader.js: apiUrl is required (data-api-url or ConversaTreeConfig.apiUrl). Widget not loaded.');
    }
    return;
  }

  var validateParams = buildValidateParams(config);
  if (!validateParams || validateParams.toString() === '') {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn('[ConversaTree] loader.js: At least one of websiteId, domain, skinId, or treeId is required. Widget not loaded.');
    }
    return;
  }

  var validateUrl = apiUrl + '/widget/validate?' + validateParams.toString();

  fetch(validateUrl, { method: 'GET', credentials: 'omit' })
    .then(function (response) {
      if (!response.ok) {
        return response.json().then(
          function (body) {
            throw new Error(body.error || 'Widget not allowed');
          },
          function () {
            throw new Error('Widget not allowed (' + response.status + ')');
          }
        );
      }
      return response.json();
    })
    .then(function (body) {
      if (!body || body.allowed !== true) {
        throw new Error('Widget not allowed');
      }
      var widgetUrl = getWidgetUrl();
      var script = document.createElement('script');
      script.src = widgetUrl;
      script.async = true;
      script.onload = function () {
        if (window.ConversaTree && typeof window.ConversaTree.init === 'function') {
          window.ConversaTree.init(config);
        }
      };
      script.onerror = function () {
        if (typeof console !== 'undefined' && console.error) {
          console.error('[ConversaTree] Failed to load widget script from ' + widgetUrl);
        }
      };
      document.head.appendChild(script);
    })
    .catch(function (err) {
      if (typeof console !== 'undefined' && console.warn) {
        console.warn('[ConversaTree] Widget not loaded:', err.message || err);
      }
    });
})();
