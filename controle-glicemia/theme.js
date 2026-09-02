(function () {
  "use strict";

  var THEME_KEY = "glicemia_theme_v1";
  var MODES = ["system", "light", "dark"];
  var LABELS = { system: "Sistema", light: "Claro", dark: "Escuro" };

  function loadMode() {
    var stored = localStorage.getItem(THEME_KEY);
    return MODES.indexOf(stored) !== -1 ? stored : "system";
  }

  function apply(mode) {
    if (mode === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", mode);
    }
  }

  var currentMode = loadMode();
  apply(currentMode);

  function updateToggleUI() {
    var label = document.getElementById("theme-toggle-label");
    var btn = document.getElementById("theme-toggle");
    if (label) label.textContent = LABELS[currentMode];
    if (btn) btn.setAttribute("aria-label", "Tema: " + LABELS[currentMode] + ". Toque para alternar.");

    ["light", "dark", "system"].forEach(function (name) {
      var icon = document.getElementById("theme-icon-" + name);
      if (icon) icon.classList.toggle("hidden", name !== currentMode);
    });
  }

  function cycle() {
    var idx = MODES.indexOf(currentMode);
    currentMode = MODES[(idx + 1) % MODES.length];
    localStorage.setItem(THEME_KEY, currentMode);
    apply(currentMode);
    updateToggleUI();
  }

  document.addEventListener("DOMContentLoaded", function () {
    updateToggleUI();
    var btn = document.getElementById("theme-toggle");
    if (btn) btn.addEventListener("click", cycle);
  });

  window.Theme = { cycle: cycle, getMode: function () { return currentMode; } };
})();
