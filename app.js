(function () {
  "use strict";
  var SC = window.SourceCapture;
  var store = SC.createStore(function () { return window.sessionStorage; });
  var state;

  function $(id) { return document.getElementById(id); }

  function render() {
    ["utm_source", "utm_medium", "utm_campaign", "referrer_host"].forEach(function (f) {
      $("v-" + f).textContent = state.source[f];
    });
    var log = $("event-log");
    while (log.firstChild) log.removeChild(log.firstChild);
    if (!state.events.length) {
      var empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No events yet.";
      log.appendChild(empty);
    }
    state.events.forEach(function (e) {
      var li = document.createElement("li");
      li.textContent = e;
      log.appendChild(li);
    });
    var c = SC.counts(state);
    $("count-email").textContent = String(c.email);
    $("count-crediclip").textContent = String(c.crediclip_case_study);
  }

  function record(type) {
    state = store.save(SC.addEvent(state, type));
    render();
  }

  // Capture this visit's source, then record exactly one page_view per page load.
  state = store.load();
  state = SC.mergeSource(state, SC.parseSource(window.location.search, document.referrer, window.location.hostname));
  state = store.save(SC.addEvent(state, "page_view"));
  render();

  // Record clicks without preventing default or delaying navigation.
  document.addEventListener("click", function (ev) {
    var el = ev.target && ev.target.closest ? ev.target.closest("a[data-event]") : null;
    if (!el) return;
    record(el.getAttribute("data-event") === "email" ? "click: email" : "click: crediclip_case_study");
  });

  $("reset-demo").addEventListener("click", function () {
    state = store.reset();
    render();
  });
})();
