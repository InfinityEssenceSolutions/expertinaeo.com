/* ==========================================================================
   ExpertinAEO — Shared tool frontend for Schema / Answer / FAQ / Meta tools
   Detects which form is present on the page and wires it up.
   ========================================================================== */
(function () {
  "use strict";
  const $ = (s, c = document) => c.querySelector(s);
  const escapeHtml = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const ICONS = {
    pass: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 10l3 3 7-7"/></svg>',
    warn: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M10 2L2 17h16L10 2z"/><path d="M10 8v4M10 14h.01"/></svg>',
    fail: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 5l10 10M15 5L5 15"/></svg>'
  };

  function gaugeGradient(score) {
    const deg = Math.round((score / 100) * 360);
    let color = score >= 85 ? "#14B8A6" : score >= 70 ? "#2563EB" : score >= 50 ? "#D97706" : "#DC2626";
    return `conic-gradient(${color} 0deg, ${color} ${deg}deg, #E2E8F0 ${deg}deg)`;
  }

  function showLoading(box, stages) {
    let i = 0;
    box.innerHTML = '<div class="tool-result-loading"><div class="spinner"></div><div class="stage" id="loadingStage">' + (stages[0] || 'Analyzing…') + '</div></div>';
    return setInterval(() => {
      i = (i + 1) % stages.length;
      const el = $("#loadingStage");
      if (el) el.textContent = stages[i];
    }, 900);
  }

  function showError(box, msg) {
    box.innerHTML = '<div class="tool-result-empty"><div class="icon" style="background: rgba(239,68,68,0.12); color: #DC2626;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg></div><h3>Analysis could not complete</h3><p>' + escapeHtml(msg) + '</p></div>';
  }

  function trackEvent(name, params) {
    if (window.EXPERTINAEO && typeof window.EXPERTINAEO.event === "function") {
      window.EXPERTINAEO.event(name, params);
    }
  }

  function renderCheckList(data, box, toolName, scoreKey) {
    const score = data[scoreKey] != null ? data[scoreKey] : 0;
    const checksByCat = {};
    (data.checks || []).forEach((c) => {
      const cat = c.category || "Checks";
      if (!checksByCat[cat]) checksByCat[cat] = [];
      checksByCat[cat].push(c);
    });

    let gaugeHtml = "";
    if (score != null && data.checks && data.checks.length > 0) {
      gaugeHtml = '<div class="score-summary"><div class="gauge" style="background: ' + gaugeGradient(score) + ';"><div class="score-val"><div class="n">' + score + '</div><div class="l">/ 100</div></div></div><div class="score-meta"><span class="grade ' + (score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor') + '">' + (score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs work') + '</span><h3>Score</h3><p>Across ' + data.checks.length + ' checks.</p></div></div>';
    }

    let listHtml = '<div class="check-list" style="padding: 0 24px 24px;">';
    Object.keys(checksByCat).forEach((cat) => {
      listHtml += '<h4>' + escapeHtml(cat) + '</h4>';
      checksByCat[cat].forEach((c) => {
        const icon = ICONS[c.status] || ICONS.warn;
        listHtml += '<div class="check-row"><div class="status ' + c.status + '">' + icon + '</div><div class="body"><div class="label">' + escapeHtml(c.name) + ' <span class="priority-badge ' + (c.priority || 'low') + '">' + escapeHtml(c.priority || 'low') + '</span></div><div class="detail">' + escapeHtml(c.detail) + '</div></div></div>';
      });
    });
    listHtml += '</div>';

    box.innerHTML = gaugeHtml + listHtml + '<div style="padding: 24px; background: var(--gradient-aurora-soft);"><a class="btn btn-primary btn-block" href="/free-aeo-audit/" data-ga="audit_request" data-ga-source="tool_result_' + toolName + '">Request a full human AEO audit →</a></div>';
  }

  /* ---------- Schema Checker ---------- */
  function wireSchemaChecker() {
    const form = $("#schemaForm");
    if (!form) return;
    const box = $("#toolResult");
    const btn = $("#analyzeBtn");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = $("#urlInput").value.trim();
      if (!url) return showError(box, "Please enter a URL.");
      trackEvent("aeo_tool_start", { tool_name: "schema_checker", source_page: location.pathname });
      const stop = showLoading(box, ["Validating URL…", "Fetching page…", "Parsing JSON-LD…", "Detecting schema types…", "Compiling report…"]);
      btn.disabled = true; btn.textContent = "Inspecting…";
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "XMLHttpRequest" } })
        .then(r => r.json())
        .then(data => {
          clearInterval(stop);
          if (data.ok) {
            trackEvent("aeo_tool_complete", { tool_name: "schema_checker", source_page: location.pathname, blocks: data.schema_block_count });
            renderSchemaResult(data, box);
          } else showError(box, data.message || "Unknown error.");
        })
        .catch(() => { clearInterval(stop); showError(box, "Network error. Please try again."); })
        .finally(() => { btn.disabled = false; btn.textContent = "Inspect"; });
    });

    function renderSchemaResult(data, box) {
      let html = '<div style="padding: 24px; border-bottom: 1px solid var(--color-slate-200); background: var(--color-slate-50);"><h3 style="margin-bottom: 8px;">Schema inspection report</h3><p style="font-size: 0.875rem; color: var(--text-muted);">' + escapeHtml(data.fetched_url) + ' · HTTP ' + data.http_code + ' · ' + data.valid_block_count + ' valid of ' + data.schema_block_count + ' blocks</p></div>';
      if (!data.schemas || data.schemas.length === 0) {
        html += '<div class="check-list"><h4>No JSON-LD blocks detected</h4><div class="check-row"><div class="status fail">' + ICONS.fail + '</div><div class="body"><div class="label">No JSON-LD structured data found</div><div class="detail">No &lt;script type="application/ld+json"&gt; blocks detected on this page. Add schema markup to make your page eligible for rich results and AI-answer citations.</div></div></div></div>';
      } else {
        data.schemas.forEach((s) => {
          html += '<div class="check-list"><h4>Block #' + (s.index + 1) + ' — ' + (s.valid ? 'Valid JSON' : 'Invalid JSON') + '</h4>';
          if (s.valid) {
            html += '<div class="check-row"><div class="status pass">' + ICONS.pass + '</div><div class="body"><div class="label">JSON parses successfully</div><div class="detail">Types detected: ' + escapeHtml((s.types || []).join(", ") || "(none)") + ' · Items: ' + s.item_count + '</div></div></div>';
            if (s.has_sameAs) html += '<div class="check-row"><div class="status pass">' + ICONS.pass + '</div><div class="body"><div class="label">sameAs property present</div><div class="detail">Entity grounding signals detected — helps engines identify your organization.</div></div></div>';
            else html += '<div class="check-row"><div class="status warn">' + ICONS.warn + '</div><div class="body"><div class="label">No sameAs property</div><div class="detail">Adding sameAs links to your organization\'s external profiles (Wikipedia, LinkedIn, etc.) improves entity grounding.</div></div></div>';
            if (s.has_author) html += '<div class="check-row"><div class="status pass">' + ICONS.pass + '</div><div class="body"><div class="label">author property present</div><div class="detail">Author attribution improves E-E-A-T signals.</div></div></div>';
            if (s.has_datePublished) html += '<div class="check-row"><div class="status pass">' + ICONS.pass + '</div><div class="body"><div class="label">datePublished present</div><div class="detail">Date markup improves freshness signals.</div></div></div>';
            if (s.has_image) html += '<div class="check-row"><div class="status pass">' + ICONS.pass + '</div><div class="body"><div class="label">image property present</div><div class="detail">Image schema improves visual rich results.</div></div></div>';
          } else {
            html += '<div class="check-row"><div class="status fail">' + ICONS.fail + '</div><div class="body"><div class="label">JSON parse error</div><div class="detail">' + escapeHtml(s.parse_error || "Invalid JSON") + '</div></div></div>';
            html += '<div class="check-row"><div class="body"><div class="detail" style="font-family: var(--font-mono); font-size: 0.75rem; word-break: break-all; max-height: 200px; overflow: auto; background: var(--color-slate-50); padding: 8px; border-radius: 4px;">' + escapeHtml(s.raw) + '</div></div></div>';
          }
          html += '</div>';
        });
      }
      html += '<div style="padding: 24px; background: var(--gradient-aurora-soft);"><p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px;">' + escapeHtml(data.disclaimer || "") + '</p><a class="btn btn-primary btn-block" href="/free-aeo-audit/" data-ga="audit_request" data-ga-source="schema_result">Request full schema audit →</a></div>';
      box.innerHTML = html;
    }
  }

  /* ---------- Answer Checker ---------- */
  function wireAnswerChecker() {
    const form = $("#answerForm");
    if (!form) return;
    const box = $("#toolResult");
    const btn = $("#analyzeBtn");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = $("#urlInput").value.trim();
      const content = $("#contentInput").value.trim();
      if (!url && !content) return showError(box, "Please enter a URL or paste content.");
      trackEvent("aeo_tool_start", { tool_name: "answer_checker", source_page: location.pathname });
      const stop = showLoading(box, ["Validating input…", "Fetching / parsing…", "Detecting answer patterns…", "Scoring extractability…"]);
      btn.disabled = true; btn.textContent = "Checking…";
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "XMLHttpRequest" } })
        .then(r => r.json())
        .then(data => {
          clearInterval(stop);
          if (data.ok) {
            trackEvent("aeo_tool_complete", { tool_name: "answer_checker", source_page: location.pathname, score_bucket: data.score });
            // Prepend H1 and first paragraph context
            let html = '<div style="padding: 24px; border-bottom: 1px solid var(--color-slate-200); background: var(--color-slate-50);"><h3 style="margin-bottom: 8px;">Answer extractability report</h3>';
            if (data.h1) html += '<p style="font-size: 0.875rem; color: var(--text-muted); margin-bottom: 8px;"><strong>H1:</strong> ' + escapeHtml(data.h1) + '</p>';
            if (data.first_paragraph) html += '<p style="font-size: 0.8125rem; color: var(--text-light); margin-bottom: 4px;"><strong>First paragraph (' + data.first_paragraph_length + ' chars):</strong></p><p style="font-size: 0.875rem; color: var(--text-secondary); font-family: var(--font-mono); background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--color-slate-200);">' + escapeHtml(data.first_paragraph) + '</p>';
            html += '</div>';
            // Render checks using shared renderer
            const fakeData = { checks: data.checks };
            // Pre-build score summary using data.score
            const score = data.score;
            let gauge = '<div class="score-summary"><div class="gauge" style="background: ' + gaugeGradient(score) + ';"><div class="score-val"><div class="n">' + score + '</div><div class="l">/ 100</div></div></div><div class="score-meta"><span class="grade ' + (score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor') + '">' + (score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs work') + '</span><h3>Extractability score</h3><p>Across ' + data.checks.length + ' checks.</p></div></div>';
            let listHtml = '<div class="check-list" style="padding: 0 24px 24px;">';
            data.checks.forEach((c) => {
              const icon = ICONS[c.status] || ICONS.warn;
              listHtml += '<div class="check-row"><div class="status ' + c.status + '">' + icon + '</div><div class="body"><div class="label">' + escapeHtml(c.name) + ' <span class="priority-badge ' + (c.priority || 'low') + '">' + escapeHtml(c.priority || 'low') + '</span></div><div class="detail">' + escapeHtml(c.detail) + '</div></div></div>';
            });
            listHtml += '</div>';
            box.innerHTML = html + gauge + listHtml + '<div style="padding: 24px; background: var(--gradient-aurora-soft);"><p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px;">' + escapeHtml(data.disclaimer || "") + '</p><a class="btn btn-primary btn-block" href="/free-aeo-audit/" data-ga="audit_request" data-ga-source="answer_result">Request answer content audit →</a></div>';
          } else showError(box, data.message || "Unknown error.");
        })
        .catch(() => { clearInterval(stop); showError(box, "Network error. Please try again."); })
        .finally(() => { btn.disabled = false; btn.textContent = "Check answers"; });
    });
  }

  /* ---------- FAQ Generator ---------- */
  function wireFaqGenerator() {
    const form = $("#faqForm");
    if (!form) return;
    const box = $("#toolResult");
    const btn = $("#generateBtn");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const topic = $("#topicInput").value.trim();
      if (!topic) return showError(box, "Please enter a topic.");
      trackEvent("aeo_tool_start", { tool_name: "faq_generator", source_page: location.pathname });
      const stop = showLoading(box, ["Analyzing topic…", "Generating question patterns…", "Compiling suggestions…", "Building JSON-LD template…"]);
      btn.disabled = true; btn.textContent = "Generating…";
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "XMLHttpRequest" } })
        .then(r => r.json())
        .then(data => {
          clearInterval(stop);
          if (data.ok) {
            trackEvent("aeo_tool_complete", { tool_name: "faq_generator", source_page: location.pathname, question_count: data.question_count });
            let html = '<div style="padding: 24px; border-bottom: 1px solid var(--color-slate-200); background: var(--color-slate-50);"><h3 style="margin-bottom: 8px;">' + data.question_count + ' question suggestions for "' + escapeHtml(data.topic) + '"</h3><p style="font-size: 0.8125rem; color: var(--text-muted);">' + escapeHtml(data.method) + '</p></div>';
            // Group questions by group
            const byGroup = {};
            data.questions.forEach((q) => { if (!byGroup[q.group]) byGroup[q.group] = []; byGroup[q.group].push(q.question); });
            html += '<div class="check-list" style="padding: 24px;">';
            Object.keys(byGroup).forEach((g) => {
              html += '<h4>' + g.toUpperCase() + ' (' + byGroup[g].length + ')</h4>';
              byGroup[g].forEach((q) => {
                html += '<div class="check-row"><div class="status pass">' + ICONS.pass + '</div><div class="body"><div class="label">' + escapeHtml(q) + '</div></div></div>';
              });
            });
            html += '</div>';
            // FAQPage JSON-LD template
            html += '<div style="padding: 24px; border-top: 1px solid var(--color-slate-200); background: var(--color-slate-50);"><h4 style="margin-bottom: 12px;">FAQPage JSON-LD template (copy &amp; fill in answers)</h4><textarea readonly style="width: 100%; min-height: 280px; font-family: var(--font-mono); font-size: 0.75rem; padding: 12px; border: 1px solid var(--color-slate-200); border-radius: 6px; background: white;">' + escapeHtml(data.faqpage_jsonld) + '</textarea>';
            html += '<button type="button" class="btn btn-secondary btn-sm" style="margin-top: 12px;" id="copyJsonld">Copy JSON-LD</button></div>';
            html += '<div style="padding: 24px;"><p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px;">' + escapeHtml(data.disclaimer || "") + '</p><a class="btn btn-primary btn-block" href="/free-aeo-audit/" data-ga="audit_request" data-ga-source="faq_result">Request editorial FAQ content →</a></div>';
            box.innerHTML = html;
            const copy = $("#copyJsonld");
            if (copy) copy.addEventListener("click", () => {
              const ta = box.querySelector("textarea");
              if (ta) { ta.select(); document.execCommand("copy"); copy.textContent = "Copied!"; setTimeout(() => copy.textContent = "Copy JSON-LD", 2000); }
            });
          } else showError(box, data.message || "Unknown error.");
        })
        .catch(() => { clearInterval(stop); showError(box, "Network error. Please try again."); })
        .finally(() => { btn.disabled = false; btn.textContent = "Generate questions"; });
    });
  }

  /* ---------- Meta & Heading Checker ---------- */
  function wireMetaChecker() {
    const form = $("#metaForm");
    if (!form) return;
    const box = $("#toolResult");
    const btn = $("#analyzeBtn");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const url = $("#urlInput").value.trim();
      if (!url) return showError(box, "Please enter a URL.");
      trackEvent("aeo_tool_start", { tool_name: "meta_checker", source_page: location.pathname });
      const stop = showLoading(box, ["Validating URL…", "Fetching page…", "Parsing meta tags…", "Building heading outline…", "Scoring…"]);
      btn.disabled = true; btn.textContent = "Auditing…";
      fetch(form.action, { method: "POST", body: new FormData(form), headers: { "X-Requested-With": "XMLHttpRequest" } })
        .then(r => r.json())
        .then(data => {
          clearInterval(stop);
          if (data.ok) {
            trackEvent("aeo_tool_complete", { tool_name: "meta_checker", source_page: location.pathname, score_bucket: data.score });
            renderMetaResult(data, box);
          } else showError(box, data.message || "Unknown error.");
        })
        .catch(() => { clearInterval(stop); showError(box, "Network error. Please try again."); })
        .finally(() => { btn.disabled = false; btn.textContent = "Audit"; });
    });

    function renderMetaResult(data, box) {
      const score = data.score;
      let html = '<div class="score-summary"><div class="gauge" style="background: ' + gaugeGradient(score) + ';"><div class="score-val"><div class="n">' + score + '</div><div class="l">/ 100</div></div></div><div class="score-meta"><span class="grade ' + (score >= 85 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor') + '">' + (score >= 85 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Fair' : 'Needs work') + '</span><h3>Meta &amp; heading score</h3><p>Across ' + data.checks.length + ' checks.</p></div></div>';

      // Meta summary
      const m = data.meta || {};
      html += '<div style="padding: 16px 24px; border-top: 1px solid var(--color-slate-200); background: var(--color-slate-50);"><h4 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-light); margin-bottom: 12px;">Meta summary</h4>';
      const rows = [
        ["Title", m.title + " (" + m.title_length + " chars)"],
        ["Meta description", m.meta_description ? (m.meta_description.substring(0, 100) + "… (" + m.meta_description_length + " chars)") : "(none)"],
        ["Canonical", m.canonical || "(none)"],
        ["Robots", m.meta_robots || "(none, defaults to index,follow)"],
        ["Viewport", m.viewport || "(none — mobile-unfriendly!)"],
        ["Charset", m.charset || "(none)"],
        ["HTML lang", m.html_lang || "(none)"],
        ["og:title", (m.open_graph || {})["og:title"] || "(none)"],
        ["og:description", (m.open_graph || {})["og:description"] || "(none)"],
        ["og:image", (m.open_graph || {})["og:image"] || "(none)"],
        ["og:url", (m.open_graph || {})["og:url"] || "(none)"],
        ["og:type", (m.open_graph || {})["og:type"] || "(none)"],
        ["twitter:card", m.twitter_card || "(none)"],
      ];
      rows.forEach(([k, v]) => {
        html += '<div style="display: flex; padding: 6px 0; border-bottom: 1px dashed var(--color-slate-100); gap: 12px;"><strong style="min-width: 180px; color: var(--text-primary); font-size: 0.8125rem;">' + escapeHtml(k) + '</strong><span style="font-family: var(--font-mono); font-size: 0.8125rem; color: var(--text-muted); word-break: break-all;">' + escapeHtml(v) + '</span></div>';
      });
      html += '</div>';

      // Heading outline
      html += '<div style="padding: 16px 24px; border-top: 1px solid var(--color-slate-200); background: var(--color-slate-50);"><h4 style="font-size: 0.875rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-light); margin-bottom: 12px;">Heading outline (first 40)</h4>';
      (data.outline || []).forEach((h) => {
        const indent = { h1: 0, h2: 16, h3: 32, h4: 48 }[h.tag] || 0;
        const color = { h1: "var(--accent-blue)", h2: "var(--text-primary)", h3: "var(--text-muted)", h4: "var(--text-light)" }[h.tag] || "var(--text-muted)";
        html += '<div style="padding: 4px 0 4px ' + indent + 'px; font-family: var(--font-mono); font-size: 0.8125rem;"><strong style="color: ' + color + '; text-transform: uppercase; font-size: 0.6875rem; margin-right: 8px;">' + h.tag + '</strong>' + escapeHtml(h.text) + '</div>';
      });
      html += '</div>';

      // Checks
      html += '<div class="check-list" style="padding: 24px;">';
      data.checks.forEach((c) => {
        const icon = ICONS[c.status] || ICONS.warn;
        html += '<div class="check-row"><div class="status ' + c.status + '">' + icon + '</div><div class="body"><div class="label">' + escapeHtml(c.name) + ' <span class="priority-badge ' + (c.priority || 'low') + '">' + escapeHtml(c.priority || 'low') + '</span></div><div class="detail">' + escapeHtml(c.detail) + '</div></div></div>';
      });
      html += '</div>';

      html += '<div style="padding: 24px; background: var(--gradient-aurora-soft);"><p style="font-size: 0.8125rem; color: var(--text-muted); margin-bottom: 12px;">' + escapeHtml(data.disclaimer || "") + '</p><a class="btn btn-primary btn-block" href="/free-aeo-audit/" data-ga="audit_request" data-ga-source="meta_result">Request full on-page audit →</a></div>';

      box.innerHTML = html;
    }
  }

  /* ---------- Init ---------- */
  function init() {
    wireSchemaChecker();
    wireAnswerChecker();
    wireFaqGenerator();
    wireMetaChecker();
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else init();
})();
