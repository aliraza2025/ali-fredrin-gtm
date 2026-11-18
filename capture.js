/* Source capture for the local attribution demo. UMD: works in browsers and node. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.SourceCapture = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var MAX_LEN = 80;
  var MAX_EVENTS = 50;
  var KEY = "fredrin_demo_session_v1";
  var UTM_FIELDS = ["utm_source", "utm_medium", "utm_campaign"];
  var EVENT_TYPES = ["page_view", "click: email", "click: crediclip_case_study"];
  var NONE = "(none)";
  var DIRECT = "direct";

  // Strip control characters, trim, and cap length (by code point).
  function sanitize(value) {
    if (typeof value !== "string") return "";
    var cleaned = value.replace(/[\u0000-\u001F\u007F-\u009F\u2028\u2029]/g, "").trim();
    var chars = Array.from(cleaned);
    if (chars.length > MAX_LEN) cleaned = chars.slice(0, MAX_LEN).join("").trim();
    return cleaned;
  }

  // Hostname only. Anything unparseable or non-http(s) becomes "direct".
  function referrerHost(referrer, ownHost) {
    if (typeof referrer !== "string" || !referrer.trim()) return DIRECT;
    try {
      var u = new URL(referrer.trim());
      if (u.protocol !== "http:" && u.protocol !== "https:") return DIRECT;
      // A referrer from this same site is internal navigation, not a source.
      if (ownHost && u.hostname === ownHost) return DIRECT;
      return sanitize(u.hostname) || DIRECT;
    } catch (e) {
      return DIRECT;
    }
  }

  // Read the first value of a param. Malformed %-escapes never throw.
  function firstParam(search, name) {
    var params;
    try {
      params = new URLSearchParams(typeof search === "string" ? search : "");
    } catch (e) {
      return "";
    }
    var v = params.get(name); // first occurrence only
    return sanitize(v === null ? "" : v);
  }

  function parseSource(search, referrer, ownHost) {
    var out = {};
    UTM_FIELDS.forEach(function (f) {
      out[f] = firstParam(search, f) || NONE;
    });
    out.referrer_host = referrerHost(referrer, ownHost);
    return out;
  }

  function emptyState() {
    return {
      source: { utm_source: NONE, utm_medium: NONE, utm_campaign: NONE, referrer_host: DIRECT },
      events: [],
    };
  }

  // Validate anything read from storage; it is untrusted too.
  function normalizeState(raw) {
    var s = emptyState();
    if (!raw || typeof raw !== "object") return s;
    var src = raw.source && typeof raw.source === "object" ? raw.source : {};
    UTM_FIELDS.forEach(function (f) {
      s.source[f] = sanitize(src[f]) || NONE;
    });
    s.source.referrer_host = sanitize(src.referrer_host) || DIRECT;
    if (Array.isArray(raw.events)) {
      raw.events.forEach(function (e) {
        if (typeof e === "string" && EVENT_TYPES.indexOf(e) !== -1 && s.events.length < MAX_EVENTS) {
          s.events.push(e);
        }
      });
    }
    return s;
  }

  function isEmptySource(src) {
    return (
      UTM_FIELDS.every(function (f) { return src[f] === NONE; }) && src.referrer_host === DIRECT
    );
  }

  // Store backed by sessionStorage with an in-memory fallback. Touches only KEY.
  function createStore(getStorage) {
    var memory = null;
    function storage() {
      try {
        return typeof getStorage === "function" ? getStorage() : getStorage;
      } catch (e) {
        return null;
      }
    }
    function load() {
      var st = storage();
      if (st) {
        try {
          var text = st.getItem(KEY);
          if (text) return normalizeState(JSON.parse(text));
        } catch (e) { /* fall through to memory */ }
      }
      return memory ? normalizeState(memory) : emptyState();
    }
    function save(state) {
      var clean = normalizeState(state);
      memory = clean;
      var st = storage();
      if (st) {
        try { st.setItem(KEY, JSON.stringify(clean)); } catch (e) { /* memory only */ }
      }
      return clean;
    }
    function reset() {
      memory = null;
      var st = storage();
      if (st) {
        try { st.removeItem(KEY); } catch (e) { /* ignore */ }
      }
      return emptyState();
    }
    return { load: load, save: save, reset: reset };
  }

  // Merge a fresh capture into stored state: new non-empty values win, otherwise keep.
  function mergeSource(state, fresh) {
    var next = normalizeState(state);
    if (isEmptySource(fresh)) return next;
    UTM_FIELDS.forEach(function (f) {
      if (fresh[f] !== NONE) next.source[f] = fresh[f];
    });
    if (fresh.referrer_host !== DIRECT) next.source.referrer_host = fresh.referrer_host;
    return next;
  }

  function addEvent(state, type) {
    var next = normalizeState(state);
    if (EVENT_TYPES.indexOf(type) !== -1 && next.events.length < MAX_EVENTS) next.events.push(type);
    return next;
  }

  function counts(state) {
    var c = { email: 0, crediclip_case_study: 0 };
    normalizeState(state).events.forEach(function (e) {
      if (e === "click: email") c.email++;
      if (e === "click: crediclip_case_study") c.crediclip_case_study++;
    });
    return c;
  }

  return {
    MAX_LEN: MAX_LEN, KEY: KEY, NONE: NONE, DIRECT: DIRECT, EVENT_TYPES: EVENT_TYPES,
    sanitize: sanitize, referrerHost: referrerHost, parseSource: parseSource,
    emptyState: emptyState, normalizeState: normalizeState, createStore: createStore,
    mergeSource: mergeSource, addEvent: addEvent, counts: counts,
  };
});
