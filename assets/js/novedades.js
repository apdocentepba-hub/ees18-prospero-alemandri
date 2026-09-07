(function (root, factory) {
  'use strict';

  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.EES18Novedades = api;
})(typeof window !== 'undefined' ? window : null, function (root) {
  'use strict';

  var REQUEST_TIMEOUT_MS = 12000;
  var requestCounter = 0;

  function text(value, maxLength) {
    var result = String(value == null ? '' : value).trim();
    return maxLength && result.length > maxLength ? result.slice(0, maxLength) : result;
  }

  function safeUrl(value) {
    var result = text(value);
    if (!result) return '';
    if (/^https:\/\//i.test(result)) return result;
    if (/^[A-Za-z][A-Za-z0-9+.-]*:/.test(result)) return '';
    if (/^\/\//.test(result) || /^\//.test(result)) return '';
    if (/(^|\/)\.\.(\/|$)/.test(result)) return '';
    if (/^[A-Za-z0-9._~!$&'()*+,;=:@/?#%\-]+$/.test(result)) return result;
    return '';
  }

  function normalizeDate(value) {
    var result = text(value, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(result) ? result : '';
  }

  function normalizeItem(raw) {
    var input = raw && typeof raw === 'object' ? raw : {};
    var priority = Number(input.priority);
    if (!Number.isFinite(priority)) priority = 0;

    return {
      id: text(input.id, 120),
      date: normalizeDate(input.date),
      dateDisplay: text(input.dateDisplay, 80),
      priority: priority,
      type: text(input.type, 80),
      title: text(input.title, 180),
      summary: text(input.summary, 400),
      body: text(input.body, 2400),
      image: safeUrl(input.image),
      buttonText: text(input.buttonText, 100),
      buttonUrl: safeUrl(input.buttonUrl)
    };
  }

  function sortItems(items) {
    return (Array.isArray(items) ? items : [])
      .map(function (item, index) {
        var priority = Number(item && item.priority);
        if (!Number.isFinite(priority)) priority = 0;
        return {
          index: index,
          item: item,
          priority: priority,
          date: normalizeDate(item && item.date)
        };
      })
      .sort(function (a, b) {
        if (a.priority !== b.priority) return b.priority - a.priority;
        if (a.date !== b.date) return a.date < b.date ? 1 : -1;
        return a.index - b.index;
      })
      .map(function (entry) { return entry.item; });
  }

  function createCarouselState(count) {
    var size = Math.max(0, Math.floor(Number(count) || 0));
    var index = 0;

    return {
      current: function () { return index; },
      next: function () {
        if (size > 0) index = (index + 1) % size;
        return index;
      },
      previous: function () {
        if (size > 0) index = (index - 1 + size) % size;
        return index;
      },
      goTo: function (nextIndex) {
        var candidate = Number(nextIndex);
        if (Number.isInteger(candidate) && candidate >= 0 && candidate < size) index = candidate;
        return index;
      }
    };
  }

  function cleanupJsonp(script, callbackName, timer) {
    if (!root) return;
    if (timer) root.clearTimeout(timer);
    if (script && script.parentNode) script.parentNode.removeChild(script);
    try {
      delete root[callbackName];
    } catch (error) {
      root[callbackName] = undefined;
    }
  }

  function requestNews(section) {
    return new Promise(function (resolve, reject) {
      if (!root || !root.document) {
        reject(new Error('BROWSER_REQUIRED'));
        return;
      }

      var apiUrl = text(root.EES18_NOVEDADES_API_URL);
      if (!apiUrl) {
        reject(new Error('SERVICE_NOT_CONFIGURED'));
        return;
      }

      var allowedSections = ['inicio', 'comunicados', 'vida-escolar'];
      var normalizedSection = text(section).toLowerCase();
      if (allowedSections.indexOf(normalizedSection) === -1) {
        reject(new Error('INVALID_SECTION'));
        return;
      }

      requestCounter += 1;
      var callbackName = 'ees18NewsCallback_' + Date.now() + '_' + requestCounter;
      var script = root.document.createElement('script');
      var query = new URLSearchParams({
        section: normalizedSection,
        callback: callbackName
      });
      var timer = null;

      root[callbackName] = function (payload) {
        cleanupJsonp(script, callbackName, timer);
        if (!payload || payload.ok !== true || !Array.isArray(payload.items)) {
          reject(new Error('INVALID_RESPONSE'));
          return;
        }

        var items = payload.items
          .map(normalizeItem)
          .filter(function (item) {
            return item.id && item.title && (item.date || item.dateDisplay);
          });
        resolve(sortItems(items));
      };

      script.src = apiUrl + (apiUrl.indexOf('?') >= 0 ? '&' : '?') + query.toString();
      script.async = true;
      script.onerror = function () {
        cleanupJsonp(script, callbackName, timer);
        reject(new Error('NETWORK_ERROR'));
      };
      timer = root.setTimeout(function () {
        cleanupJsonp(script, callbackName, timer);
        reject(new Error('TIMEOUT'));
      }, REQUEST_TIMEOUT_MS);
      root.document.head.appendChild(script);
    });
  }

  return {
    normalizeItem: normalizeItem,
    safeUrl: safeUrl,
    sortItems: sortItems,
    createCarouselState: createCarouselState,
    requestNews: requestNews
  };
});
