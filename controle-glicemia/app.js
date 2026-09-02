(function () {
  "use strict";

  var STATUS_PILL_LABELS = { low: "BAIXA", high: "ALTA", normal: "NA FAIXA" };

  var lcdContext = document.getElementById("lcd-context");
  var lcdStatus = document.getElementById("lcd-status");
  var lcdValue = document.getElementById("lcd-value");
  var lcdMeta = document.getElementById("lcd-meta");

  var form = document.getElementById("reading-form");
  var readingIdInput = document.getElementById("reading-id");
  var dateInput = document.getElementById("date");
  var timeInput = document.getElementById("time");
  var categorySelect = document.getElementById("category");
  var momentField = document.getElementById("moment-field");
  var valueInput = document.getElementById("value");
  var insulinInput = document.getElementById("insulin");
  var notesInput = document.getElementById("notes");
  var submitBtn = document.getElementById("submit-btn");
  var cancelEditBtn = document.getElementById("cancel-edit-btn");
  var formTitle = document.getElementById("form-title");

  var lowThresholdInput = document.getElementById("low-threshold");
  var highThresholdInput = document.getElementById("high-threshold");
  var saveThresholdsBtn = document.getElementById("save-thresholds-btn");

  var statsEl = document.getElementById("stats");
  var historyList = document.getElementById("history-list");
  var filterCategory = document.getElementById("filter-category");

  var exportJsonBtn = document.getElementById("export-json-btn");
  var exportCsvBtn = document.getElementById("export-csv-btn");
  var exportTxtBtn = document.getElementById("export-txt-btn");
  var exportDocBtn = document.getElementById("export-doc-btn");
  var importInput = document.getElementById("import-input");

  var readings = [];
  var settings = { low: 70, high: 180 };
  var editingId = null;

  function currentUserId() {
    return Storage.activeUserId();
  }

  function currentProfile() {
    var id = currentUserId();
    return id ? Storage.getProfile(id) : null;
  }

  function persistReadings() {
    Storage.saveReadings(currentUserId(), readings);
  }

  function persistSettings() {
    Storage.saveSettings(currentUserId(), settings);
  }

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function todayDateStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function nowTimeStr() {
    var d = new Date();
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  function makeId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function setDefaultFormDateTime() {
    dateInput.value = todayDateStr();
    timeInput.value = nowTimeStr();
  }

  function updateMomentVisibility() {
    if (categorySelect.value === "extra") {
      momentField.classList.add("hidden");
    } else {
      momentField.classList.remove("hidden");
    }
  }

  categorySelect.addEventListener("change", updateMomentVisibility);

  function resetForm() {
    form.reset();
    readingIdInput.value = "";
    editingId = null;
    setDefaultFormDateTime();
    updateMomentVisibility();
    submitBtn.textContent = "Salvar registro";
    formTitle.textContent = "Novo registro";
    cancelEditBtn.classList.add("hidden");
  }

  function getSelectedMoment() {
    var radios = document.getElementsByName("moment");
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].checked) return radios[i].value;
    }
    return "antes";
  }

  function setSelectedMoment(value) {
    var radios = document.getElementsByName("moment");
    for (var i = 0; i < radios.length; i++) {
      radios[i].checked = radios[i].value === value;
    }
  }

  function statBox(label, value) {
    return (
      '<div class="stat-box"><div class="stat-label">' +
      Export.escapeHtml(label) +
      '</div><div class="stat-value">' +
      Export.escapeHtml(String(value)) +
      "</div></div>"
    );
  }

  function mostRecentReading() {
    if (readings.length === 0) return null;
    return readings.slice().sort(function (a, b) {
      return (b.date + b.time).localeCompare(a.date + a.time);
    })[0];
  }

  function renderLcd() {
    var last = mostRecentReading();

    if (!last) {
      lcdContext.textContent = "Nenhum registro ainda";
      lcdStatus.textContent = "SEM DADOS";
      lcdStatus.className = "lcd-status-pill status-neutral";
      lcdValue.textContent = "- - -";
      lcdMeta.textContent = "Registre sua primeira medição abaixo";
      return;
    }

    var cls = Export.classify(last.value, settings);
    lcdContext.textContent = Export.typeLabel(last);
    lcdStatus.textContent = STATUS_PILL_LABELS[cls];
    lcdStatus.className = "lcd-status-pill status-" + cls;
    lcdValue.textContent = last.value;
    lcdMeta.textContent = Export.formatDateBR(last.date) + " às " + last.time;
  }

  function renderStats() {
    if (readings.length === 0) {
      statsEl.innerHTML = '<p class="empty-state">Nenhum registro ainda.</p>';
      return;
    }

    var total = readings.length;
    var sum = 0;
    var lowCount = 0;
    var highCount = 0;
    readings.forEach(function (r) {
      sum += r.value;
      var c = Export.classify(r.value, settings);
      if (c === "low") lowCount++;
      if (c === "high") highCount++;
    });
    var avg = Math.round((sum / total) * 10) / 10;
    var last = mostRecentReading();

    var html = "";
    html += statBox("Total de registros", total);
    html += statBox("Média geral", avg + " mg/dL");
    html += statBox("Abaixo da faixa", lowCount);
    html += statBox("Acima da faixa", highCount);
    html += statBox("Última medição", last.value + " mg/dL (" + Export.formatDateBR(last.date) + " " + last.time + ")");

    statsEl.innerHTML = html;
  }

  function renderHistory() {
    var filter = filterCategory.value;
    var list = readings.slice();
    if (filter !== "all") {
      list = list.filter(function (r) {
        return r.category === filter;
      });
    }
    list.sort(function (a, b) {
      return (b.date + b.time).localeCompare(a.date + a.time);
    });

    if (list.length === 0) {
      historyList.innerHTML = '<p class="empty-state">Nenhum registro encontrado.</p>';
      return;
    }

    var html = list
      .map(function (r) {
        var cls = Export.classify(r.value, settings);
        var extras = [];
        if (r.insulin) extras.push("Insulina: " + r.insulin + " UI");
        var extrasHtml = extras.length
          ? '<div class="reading-extra">' + Export.escapeHtml(extras.join(" · ")) + "</div>"
          : "";
        var notesHtml = r.notes
          ? '<div class="reading-notes">' + Export.escapeHtml(r.notes) + "</div>"
          : "";

        return (
          '<div class="reading-item" data-id="' +
          r.id +
          '">' +
          '<div class="reading-main">' +
          '<div class="reading-datetime">' +
          Export.formatDateBR(r.date) +
          " às " +
          r.time +
          "</div>" +
          '<div class="reading-type">' +
          Export.escapeHtml(Export.typeLabel(r)) +
          "</div>" +
          '<span class="reading-value status-' +
          cls +
          '">' +
          r.value +
          " mg/dL</span>" +
          extrasHtml +
          notesHtml +
          "</div>" +
          '<div class="reading-actions">' +
          '<button type="button" class="icon-btn edit-btn" data-id="' +
          r.id +
          '">Editar</button>' +
          '<button type="button" class="icon-btn danger delete-btn" data-id="' +
          r.id +
          '">Excluir</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");

    historyList.innerHTML = html;
  }

  function renderAll() {
    renderLcd();
    renderStats();
    renderHistory();
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    var date = dateInput.value;
    var time = timeInput.value;
    var category = categorySelect.value;
    var value = parseFloat(valueInput.value);
    var insulin = insulinInput.value ? parseFloat(insulinInput.value) : null;
    var notes = notesInput.value.trim();

    if (!date || !time || !category || isNaN(value)) {
      alert("Preencha data, horário, tipo de registro e o valor da glicemia.");
      return;
    }

    var moment = category === "extra" ? null : getSelectedMoment();

    if (editingId) {
      var idx = readings.findIndex(function (r) {
        return r.id === editingId;
      });
      if (idx !== -1) {
        readings[idx] = Object.assign({}, readings[idx], {
          date: date,
          time: time,
          category: category,
          moment: moment,
          value: value,
          insulin: insulin,
          notes: notes
        });
      }
    } else {
      readings.push({
        id: makeId(),
        date: date,
        time: time,
        category: category,
        moment: moment,
        value: value,
        insulin: insulin,
        notes: notes,
        createdAt: Date.now()
      });
    }

    persistReadings();
    renderAll();
    resetForm();
  });

  cancelEditBtn.addEventListener("click", function () {
    resetForm();
  });

  historyList.addEventListener("click", function (e) {
    var editBtn = e.target.closest(".edit-btn");
    var deleteBtn = e.target.closest(".delete-btn");

    if (editBtn) {
      var id = editBtn.getAttribute("data-id");
      var reading = readings.find(function (r) {
        return r.id === id;
      });
      if (!reading) return;

      editingId = id;
      readingIdInput.value = id;
      dateInput.value = reading.date;
      timeInput.value = reading.time;
      categorySelect.value = reading.category;
      updateMomentVisibility();
      if (reading.moment) setSelectedMoment(reading.moment);
      valueInput.value = reading.value;
      insulinInput.value = reading.insulin != null ? reading.insulin : "";
      notesInput.value = reading.notes || "";

      submitBtn.textContent = "Salvar alterações";
      formTitle.textContent = "Editar registro";
      cancelEditBtn.classList.remove("hidden");
      form.scrollIntoView({ behavior: "smooth" });
      return;
    }

    if (deleteBtn) {
      var delId = deleteBtn.getAttribute("data-id");
      if (confirm("Excluir este registro?")) {
        readings = readings.filter(function (r) {
          return r.id !== delId;
        });
        persistReadings();
        if (editingId === delId) resetForm();
        renderAll();
      }
    }
  });

  filterCategory.addEventListener("change", renderHistory);

  function loadThresholdInputs() {
    lowThresholdInput.value = settings.low;
    highThresholdInput.value = settings.high;
  }

  saveThresholdsBtn.addEventListener("click", function () {
    var low = parseFloat(lowThresholdInput.value);
    var high = parseFloat(highThresholdInput.value);
    if (isNaN(low) || isNaN(high) || low >= high) {
      alert("Informe uma faixa válida (o valor baixo deve ser menor que o alto).");
      return;
    }
    settings = { low: low, high: high };
    persistSettings();
    renderAll();
  });

  exportJsonBtn.addEventListener("click", function () {
    Export.download(
      "glicemia-" + Export.todayDateStr() + ".json",
      Export.toJSON(readings, settings, currentProfile()),
      "application/json"
    );
  });

  exportCsvBtn.addEventListener("click", function () {
    Export.download(
      "glicemia-" + Export.todayDateStr() + ".csv",
      Export.toCSV(readings, settings),
      "text/csv;charset=utf-8"
    );
  });

  exportTxtBtn.addEventListener("click", function () {
    Export.download(
      "glicemia-" + Export.todayDateStr() + ".txt",
      Export.toTXT(readings, settings, currentProfile()),
      "text/plain;charset=utf-8"
    );
  });

  exportDocBtn.addEventListener("click", function () {
    Export.download(
      "glicemia-" + Export.todayDateStr() + ".doc",
      Export.toDoc(readings, settings, currentProfile()),
      "application/msword;charset=utf-8"
    );
  });

  importInput.addEventListener("change", function () {
    var file = importInput.files[0];
    if (!file) return;

    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var incoming = Array.isArray(data) ? data : data.readings;
        if (!Array.isArray(incoming)) throw new Error("formato inválido");

        var existingIds = {};
        readings.forEach(function (r) {
          existingIds[r.id] = true;
        });

        var added = 0;
        incoming.forEach(function (r) {
          if (
            r &&
            typeof r.date === "string" &&
            typeof r.time === "string" &&
            typeof r.category === "string" &&
            typeof r.value === "number"
          ) {
            var id = typeof r.id === "string" && !existingIds[r.id] ? r.id : makeId();
            existingIds[id] = true;
            readings.push({
              id: id,
              date: r.date,
              time: r.time,
              category: r.category,
              moment: r.moment || null,
              value: r.value,
              insulin: typeof r.insulin === "number" ? r.insulin : null,
              notes: r.notes || "",
              createdAt: r.createdAt || Date.now()
            });
            added++;
          }
        });

        if (data && data.settings && typeof data.settings.low === "number" && typeof data.settings.high === "number") {
          settings = data.settings;
          persistSettings();
          loadThresholdInputs();
        }

        persistReadings();
        renderAll();
        alert(added + " registro(s) importado(s) com sucesso.");
      } catch (err) {
        alert("Não foi possível importar o arquivo. Verifique se é um backup válido.");
      }
      importInput.value = "";
    };
    reader.readAsText(file);
  });

  window.GlicemiaApp = {
    init: function () {
      var userId = currentUserId();
      readings = Storage.loadReadings(userId);
      settings = Storage.loadSettings(userId);
      resetForm();
      loadThresholdInputs();
      renderAll();
    }
  };
})();
