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

  function appendTextElement(parent, tagName, className, value) {
    if (!root || !root.document || !value) return null;
    var node = root.document.createElement(tagName);
    if (className) node.className = className;
    node.textContent = value;
    parent.appendChild(node);
    return node;
  }

  function createHomeNewsCard(item) {
    var article = root.document.createElement('article');
    article.className = 'news-card';
    article.dataset.newsId = item.id;

    var media = root.document.createElement('div');
    media.className = 'news-card__media';
    if (item.image) {
      var image = root.document.createElement('img');
      image.src = item.image;
      image.alt = 'Imagen de ' + item.title;
      image.loading = 'lazy';
      media.appendChild(image);
    } else {
      media.classList.add('news-card__media--placeholder');
      appendTextElement(media, 'span', '', 'E.E.S. Nº 18');
    }
    article.appendChild(media);

    var body = root.document.createElement('div');
    body.className = 'news-card__body';
    var metaParts = [];
    if (item.type) metaParts.push(item.type);
    if (item.dateDisplay || item.date) metaParts.push(item.dateDisplay || item.date);
    appendTextElement(body, 'span', 'news-card__meta', metaParts.join(' · '));
    appendTextElement(body, 'h3', '', item.title);
    appendTextElement(body, 'p', '', item.summary || item.body);

    if (item.buttonText && item.buttonUrl) {
      var link = root.document.createElement('a');
      link.className = 'simple-button news-card__cta';
      link.href = item.buttonUrl;
      link.textContent = item.buttonText;
      body.appendChild(link);
    }

    article.appendChild(body);
    return article;
  }

  function mountHomeCarousel(container, items) {
    if (!root || !root.document || !container) return false;

    var list = container.querySelector('[data-news-list]');
    var previousButton = container.querySelector('[data-news-prev]');
    var nextButton = container.querySelector('[data-news-next]');
    var dotsRoot = container.querySelector('[data-news-dots]');
    var normalizedItems = sortItems(Array.isArray(items) ? items : [])
      .map(normalizeItem)
      .filter(function (item) {
        return item.id && item.title && (item.date || item.dateDisplay);
      });

    if (!list || !previousButton || !nextButton || !dotsRoot || normalizedItems.length === 0) {
      return false;
    }

    list.textContent = '';
    dotsRoot.textContent = '';

    var cards = normalizedItems.map(function (item) {
      var card = createHomeNewsCard(item);
      list.appendChild(card);
      return card;
    });

    var dots = normalizedItems.map(function (item, index) {
      var dot = root.document.createElement('button');
      dot.type = 'button';
      dot.className = 'news-carousel__dot';
      dot.setAttribute('aria-label', 'Ver novedad ' + (index + 1) + ': ' + item.title);
      dot.addEventListener('click', function () {
        state.goTo(index);
        render();
      });
      dotsRoot.appendChild(dot);
      return dot;
    });

    var state = createCarouselState(cards.length);

    function render() {
      var current = state.current();
      cards.forEach(function (card, index) {
        card.hidden = index !== current;
      });
      dots.forEach(function (dot, index) {
        var active = index === current;
        dot.classList.toggle('is-active', active);
        dot.setAttribute('aria-current', active ? 'true' : 'false');
      });
      container.dataset.newsIndex = String(current);
    }

    function previous() {
      state.previous();
      render();
    }

    function next() {
      state.next();
      render();
    }

    previousButton.addEventListener('click', previous);
    nextButton.addEventListener('click', next);
    container.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        next();
      }
    });

    var touchStartX = null;
    list.addEventListener('touchstart', function (event) {
      if (event.touches && event.touches.length === 1) touchStartX = event.touches[0].clientX;
    }, { passive: true });
    list.addEventListener('touchend', function (event) {
      if (touchStartX == null || !event.changedTouches || event.changedTouches.length !== 1) return;
      var delta = event.changedTouches[0].clientX - touchStartX;
      touchStartX = null;
      if (Math.abs(delta) < 45) return;
      if (delta < 0) next();
      else previous();
    }, { passive: true });

    var showControls = cards.length > 1;
    var controls = container.querySelector('.news-carousel__controls');
    if (controls) controls.hidden = !showControls;
    previousButton.disabled = !showControls;
    nextButton.disabled = !showControls;
    render();
    return true;
  }

  function initHomeNews() {
    if (!root || !root.document) return;
    var container = root.document.querySelector('[data-news-section="inicio"]');
    if (!container) return;

    requestNews('inicio')
      .then(function (items) {
        mountHomeCarousel(container, items);
      })
      .catch(function () {
        // The static fallback remains visible when the service is unavailable.
      });
  }

  if (root && root.document) {
    if (root.document.readyState === 'loading') {
      root.document.addEventListener('DOMContentLoaded', initHomeNews, { once: true });
    } else {
      initHomeNews();
    }
  }

  return {
    normalizeItem: normalizeItem,
    safeUrl: safeUrl,
    sortItems: sortItems,
    createCarouselState: createCarouselState,
    requestNews: requestNews,
    mountHomeCarousel: mountHomeCarousel
  };
});
