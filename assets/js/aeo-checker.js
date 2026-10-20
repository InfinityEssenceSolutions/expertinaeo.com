/* ==========================================================================
   ExpertinAEO — AEO Checker tool frontend
   Renders analysis results from /api/analyze.php
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const form = $("#aeoCheckerForm");
  if (!form) return;
  const urlInput = $("#urlInput");
  const analyzeBtn = $("#analyzeBtn");
  const resultBox = $("#toolResult");

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const escapeAttr = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const ICONS = {
    pass: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 10l3 3 7-7"/></svg>',
    warn: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10 2L2 17h16L10 2z"/><path d="M10 8v4M10 14h.01"/></svg>',
    fail: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 5l10 10M15 5L5 15"/></svg>'
  };

  const STAGE_LABELS = [
    "Validating URL…",
    "Resolving DNS…",
    "Fetching page server-side…",
    "Parsing HTML…",
    "Detecting structured data…",
    "Scoring answer readiness…",
    "Compiling report…"
  ];

  function showLoading() {
    let stage = 0;
    const html = '<div class="tool-result-loading"><div class="spinner"></div><div class="stage" id="loadingStage">' + STAGE_LABELS[0] + '</div></div>';
    resultBox.innerHTML = html;
    const interval = setInterval(() => {
      stage++;
      const el = $("#loadingStage");
      if (!el) { clearInterval(interval); return; }
      if (stage >= STAGE_LABELS.length) stage = STAGE_LABELS.length - 1;
      el.textContent = STAGE_LABELS[stage];
    }, 900);
    return function () { clearInterval(interval); };
  }

  function gaugeGradient(score) {
    const deg = Math.round((score / 100) * 360);
    let color;
    if (score >= 85) color = "#14B8A6";
    else if (score >= 70) color = "#2563EB";
    else if (score >= 50) color = "#D97706";
    else color = "#DC2626";
    return `conic-gradient(${color} 0deg, ${color} ${deg}deg, #E2E8F0 ${deg}deg)`;
  }

  function gradeLabel(score) {
    if (score >= 85) return ["excellent", "Excellent readiness", "Strong candidate for AI citation. Iterate on remaining warnings."];
    if (score >= 70) return ["good", "Good readiness", "Solid foundations. Focus on top-priority fixes to move from good to excellent."];
    if (score >= 50) return ["fair", "Fair readiness", "Multiple structural gaps. A focused AEO engagement will deliver measurable lift."];
    return ["poor", "Poor readiness", "Significant work needed across content, schema and entity signals. Start with the high-priority items."];
  }

  function renderResults(data) {
    const score = data.score;
    const [gradeClass, gradeTitle, gradeDesc] = gradeLabel(score);
    const checksByCategory = {};
    data.checks.forEach((c) => {
      const cat = c.category;
      if (!checksByCategory[cat]) checksByCategory[cat] = [];
      checksByCategory[cat].push(c);
    });

    const catBarsHtml = (data.categories || []).map((c) => `
      <div class="category-bar">
        <div class="head"><span class="name">${escapeHtml(c.name)} <span class="badge">${c.weight_pct}% weight</span></span><span class="value">${c.score}%</span></div>
        <div class="track"><div class="fill" style="width: ${c.score}%;"></div></div>
        <div class="desc">${escapeHtml(c.desc || "")}</div>
      </div>
    `).join("");

    const checkListHtml = Object.keys(checksByCategory).map((cat) => {
      const rows = checksByCategory[cat].map((c) => {
        const icon = ICONS[c.status] || ICONS.warn;
        return `<div class="check-row">
          <div class="status ${c.status}">${icon}</div>
          <div class="body">
            <div class="label">${escapeHtml(c.name)} <span class="priority-badge ${c.priority}">${c.priority}</span></div>
            <div class="detail">${escapeHtml(c.detail)}</div>
          </div>
        </div>`;
      }).join("");
      return `<div class="check-list" style="margin-bottom: 16px;"><h4>${escapeHtml(cat)}</h4>${rows}</div>`;
    }).join("");

    const reportId = "aeo-" + Math.random().toString(36).slice(2, 8);
    const metaRows = [
      ["Fetched URL", data.fetched_url],
      ["HTTP status", data.http_code],
      ["Response size", (data.response_size_bytes / 1024).toFixed(1) + " KB"],
      ["Page title", data.meta.title],
      ["Meta description (length)", data.meta.meta_description ? data.meta.meta_description.substring(0, 80) + " (" + (data.meta.meta_description.length) + " chars)" : "(none)"],
      ["Canonical URL", data.meta.canonical || "(none)"],
      ["Schema types detected", (data.meta.schema_types_detected || []).join(", ") || "(none)"],
      ["H1 / H2 / H3 counts", data.meta.heading_counts ? (data.meta.heading_counts.h1 + " / " + data.meta.heading_counts.h2 + " / " + data.meta.heading_counts.h3) : "n/a"],
      ["Images (missing alt)", data.meta.images_total + " (" + data.meta.images_missing_alt + " missing alt)"],
      ["HTML lang", data.meta.html_lang || "(none)"],
    ];

    const metaHtml = metaRows.map(([k, v]) => `<div style="display: flex; padding: 8px 0; border-bottom: 1px dashed var(--color-slate-100); gap: 12px;"><strong style="min-width: 200px; color: var(--text-primary); font-size: 0.8125rem;">${escapeHtml(k)}</strong><span style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-muted); word-break: break-all;">${escapeHtml(String(v || "n/a"))}</span></div>`).join("");

    resultBox.innerHTML = `
      <div class="score-summary">
        <div class="gauge" style="background: ${gaugeGradient(score)};">
          <div class="score-val"><div class="n">${score}</div><div class="l">/ 100</div></div>
        </div>
        <div class="score-meta">
          <span class="grade ${gradeClass}">${gradeTitle}</span>
          <h3>AEO Readiness Score</h3>
          <p>${escapeHtml(gradeDesc)}</p>
          <p style="font-size: 0.75rem; color: var(--text-light); margin-top: 8px;">Analyzed at ${escapeHtml(data.fetched_at)} · <a href="#" id="downloadReport" data-report-id="${reportId}">Download report</a></p>
        </div>
      </div>
      <div class="category-bars">${catBarsHtml}</div>
      <div style="padding: 16px 24px; border-top: 1px solid var(--color-slate-200); background: var(--color-slate-50);">
        <h4 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-light); margin-bottom: 12px;">Page metadata detected</h4>
        ${metaHtml}
      </div>
      <div class="check-list" style="padding: 0 24px 24px;">
        <h4 style="margin-top: 16px;">${data.checks.length} checks across ${Object.keys(checksByCategory).length} categories</h4>
        ${checkListHtml}
      </div>
      <div style="padding: 24px; border-top: 1px solid var(--color-slate-200); background: var(--gradient-aurora-soft);">
        <p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px;">${escapeHtml(data.disclaimer || "")}</p>
        <a class="btn btn-primary btn-block" href="/free-aeo-audit/" data-ga="audit_request" data-ga-source="tool_result">Request a full human AEO audit →</a>
      </div>
    `;

    // Wire download
    const dl = $("#downloadReport");
    if (dl) {
      dl.addEventListener("click", (e) => {
        e.preventDefault();
        if (window.EXPERTINAEO && typeof window.EXPERTINAEO.event === "function") {
          window.EXPERTINAEO.event("report_download", { tool_name: "aeo_checker", source_page: location.pathname });
        }
        downloadReport(data, reportId);
      });
    }
  }

  function downloadReport(data, reportId) {
    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>AEO Report — ${escapeAttr(data.fetched_url)}</title><style>body{font-family:-apple-system,sans-serif;max-width:760px;margin:40px auto;padding:0 24px;color:#334155}h1{color:#081A32}table{width:100%;border-collapse:collapse;margin:16px 0}td,th{padding:8px 12px;border:1px solid #E2E8F0;text-align:left;font-size:13px}</style></head><body>
      <h1>AEO Readiness Report</h1>
      <p><strong>URL:</strong> ${escapeHtml(data.fetched_url)}<br/>
      <strong>Score:</strong> ${data.score}/100 (${data.grade})<br/>
      <strong>Generated:</strong> ${escapeHtml(data.fetched_at)}</p>
      <h2>Categories</h2><table><tr><th>Category</th><th>Score</th><th>Weight</th></tr>${(data.categories || []).map(c => `<tr><td>${escapeHtml(c.name)}</td><td>${c.score}%</td><td>${c.weight_pct}%</td></tr>`).join("")}</table>
      <h2>Checks</h2><table><tr><th>Category</th><th>Check</th><th>Status</th><th>Priority</th><th>Detail</th></tr>${data.checks.map(c => `<tr><td>${escapeHtml(c.category)}</td><td>${escapeHtml(c.name)}</td><td>${c.status}</td><td>${c.priority}</td><td>${escapeHtml(c.detail)}</td></tr>`).join("")}</table>
      <p style="font-size:11px;color:#94A3B8;margin-top:24px">${escapeHtml(data.disclaimer || "")}</p>
      <p style="font-size:11px;color:#94A3B8">Generated by ExpertinAEO — expertinaeo.com</p>
    </body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "aeo-report-" + reportId + ".html";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  function showError(msg) {
    resultBox.innerHTML = `<div class="tool-result-empty"><div class="icon" style="background: rgba(239,68,68,0.12); color: #DC2626;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div><h3>Analysis could not complete</h3><p>${escapeHtml(msg)}</p></div>`;
  }

  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) { showError("Please enter a URL to analyze."); return; }

    if (window.EXPERTINAEO && typeof window.EXPERTINAEO.event === "function") {
      window.EXPERTINAEO.event("aeo_tool_start", { tool_name: "aeo_checker", source_page: location.pathname });
    }

    const stopLoading = showLoading();
    analyzeBtn.disabled = true;
    analyzeBtn.textContent = "Analyzing…";

    const formData = new FormData(form);
    fetch(form.action, { method: "POST", body: formData, headers: { "X-Requested-With": "XMLHttpRequest" } })
      .then((r) => r.json())
      .then((data) => {
        stopLoading();
        if (data.ok) {
          if (window.EXPERTINAEO && typeof window.EXPERTINAEO.event === "function") {
            window.EXPERTINAEO.event("aeo_tool_complete", { tool_name: "aeo_checker", source_page: location.pathname, score_bucket: bucketScore(data.score) });
          }
          renderResults(data);
        } else {
          showError(data.message || "Unknown error.");
        }
      })
      .catch((err) => {
        stopLoading();
        showError("Network or server error. Please try again or email us directly.");
      })
      .finally(() => {
        analyzeBtn.disabled = false;
        analyzeBtn.textContent = "Analyze";
      });
  });

  function bucketScore(s) {
    if (s >= 85) return "excellent_85_100";
    if (s >= 70) return "good_70_84";
    if (s >= 50) return "fair_50_69";
    return "poor_0_49";
  }
})();
