(function () {
  "use strict";

  var CATEGORY_LABELS = {
    cafe: "Café da manhã",
    almoco: "Almoço",
    jantar: "Jantar",
    extra: "Extraordinário"
  };

  var MOMENT_LABELS = {
    antes: "Antes da refeição",
    depois: "Depois da refeição"
  };

  var STATUS_LABELS = { low: "Baixa", high: "Alta", normal: "Na faixa" };

  function pad(n) {
    return n < 10 ? "0" + n : "" + n;
  }

  function todayDateStr() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function formatDateBR(dateStr) {
    var parts = dateStr.split("-");
    return parts[2] + "/" + parts[1] + "/" + parts[0];
  }

  function typeLabel(reading) {
    if (reading.category === "extra") return CATEGORY_LABELS.extra;
    return CATEGORY_LABELS[reading.category] + " — " + MOMENT_LABELS[reading.moment];
  }

  function classify(value, settings) {
    if (value < settings.low) return "low";
    if (value > settings.high) return "high";
    return "normal";
  }

  function sortedDesc(readings) {
    return readings.slice().sort(function (a, b) {
      return (b.date + b.time).localeCompare(a.date + a.time);
    });
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeCsvField(value) {
    var str = value == null ? "" : String(value);
    if (/[",\n;]/.test(str)) {
      str = '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ---------------------------------------------------------------
  // Format builders
  // ---------------------------------------------------------------

  function toJSON(readings, settings, profile) {
    var payload = {
      exportedAt: new Date().toISOString(),
      profile: profile ? { name: profile.name } : null,
      settings: settings,
      readings: readings
    };
    return JSON.stringify(payload, null, 2);
  }

  function toCSV(readings, settings) {
    var rows = [["Data", "Hora", "Tipo", "Momento", "Glicemia (mg/dL)", "Status", "Insulina (UI)", "Observações"]];
    sortedDesc(readings).forEach(function (r) {
      rows.push([
        formatDateBR(r.date),
        r.time,
        CATEGORY_LABELS[r.category] || r.category,
        r.category === "extra" ? "" : MOMENT_LABELS[r.moment] || "",
        r.value,
        STATUS_LABELS[classify(r.value, settings)],
        r.insulin != null ? r.insulin : "",
        r.notes || ""
      ]);
    });
    var csv = rows.map(function (row) {
      return row.map(escapeCsvField).join(";");
    }).join("\r\n");
    return "﻿" + csv;
  }

  function toTXT(readings, settings, profile) {
    var lines = [];
    lines.push("VITAGLICO — DIÁRIO DE GLICEMIA");
    if (profile && profile.name) lines.push("Perfil: " + profile.name);
    lines.push("Exportado em: " + new Date().toLocaleString("pt-BR"));
    lines.push("Faixa de referência: " + settings.low + " a " + settings.high + " mg/dL");
    lines.push("");

    if (readings.length === 0) {
      lines.push("Nenhum registro.");
    } else {
      sortedDesc(readings).forEach(function (r) {
        lines.push(formatDateBR(r.date) + " às " + r.time + " — " + typeLabel(r));
        var line = "  Glicemia: " + r.value + " mg/dL (" + STATUS_LABELS[classify(r.value, settings)] + ")";
        if (r.insulin != null) line += " · Insulina: " + r.insulin + " UI";
        lines.push(line);
        if (r.notes) lines.push("  Obs: " + r.notes);
        lines.push("");
      });
    }
    return lines.join("\n");
  }

  function toDoc(readings, settings, profile) {
    var rowsHtml = sortedDesc(readings)
      .map(function (r) {
        return (
          "<tr>" +
          "<td>" + escapeHtml(formatDateBR(r.date)) + "</td>" +
          "<td>" + escapeHtml(r.time) + "</td>" +
          "<td>" + escapeHtml(typeLabel(r)) + "</td>" +
          "<td>" + escapeHtml(String(r.value)) + "</td>" +
          "<td>" + escapeHtml(STATUS_LABELS[classify(r.value, settings)]) + "</td>" +
          "<td>" + escapeHtml(r.insulin != null ? String(r.insulin) : "—") + "</td>" +
          "<td>" + escapeHtml(r.notes || "") + "</td>" +
          "</tr>"
        );
      })
      .join("");

    var profileLine = profile && profile.name ? "<p>Perfil: <b>" + escapeHtml(profile.name) + "</b></p>" : "";

    return (
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
      "<head><meta charset='utf-8'><title>VitaGlico - Diário de Glicemia</title></head>" +
      "<body style='font-family:Calibri,Arial,sans-serif;'>" +
      "<h1>VitaGlico — Diário de Glicemia</h1>" +
      profileLine +
      "<p>Exportado em " + escapeHtml(new Date().toLocaleString("pt-BR")) + "</p>" +
      "<p>Faixa de referência: " + settings.low + " a " + settings.high + " mg/dL</p>" +
      "<table border='1' cellspacing='0' cellpadding='4' style='border-collapse:collapse;width:100%;'>" +
      "<tr style='background:#e4e9e3;font-weight:bold;'>" +
      "<td>Data</td><td>Hora</td><td>Registro</td><td>Glicemia</td><td>Status</td><td>Insulina</td><td>Observações</td>" +
      "</tr>" +
      rowsHtml +
      "</table>" +
      "</body></html>"
    );
  }

  // ---------------------------------------------------------------
  // Download — uses the artifact-preview downloads capability when
  // present, falling back to a plain anchor download otherwise.
  // ---------------------------------------------------------------

  function downloadViaAnchor(filename, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function download(filename, content, mime) {
    if (window.claude && typeof window.claude.use === "function") {
      window.claude
        .use("downloads")
        .catch(function () {
          return null;
        })
        .then(function (downloads) {
          if (!downloads) {
            downloadViaAnchor(filename, content, mime);
            return;
          }
          downloads.save({ filename: filename, data: content }).catch(function (err) {
            if (!err || err.code !== "declined") {
              alert("Não foi possível salvar o arquivo. Tente novamente.");
            }
          });
        });
      return;
    }
    downloadViaAnchor(filename, content, mime);
  }

  window.Export = {
    CATEGORY_LABELS: CATEGORY_LABELS,
    MOMENT_LABELS: MOMENT_LABELS,
    STATUS_LABELS: STATUS_LABELS,
    formatDateBR: formatDateBR,
    typeLabel: typeLabel,
    classify: classify,
    escapeHtml: escapeHtml,
    todayDateStr: todayDateStr,
    toJSON: toJSON,
    toCSV: toCSV,
    toTXT: toTXT,
    toDoc: toDoc,
    download: download
  };
})();
