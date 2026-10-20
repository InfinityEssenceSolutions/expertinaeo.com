/* ==========================================================================
   ExpertinAEO — Main interaction layer
   - Sticky header behaviour
   - Mobile menu toggle
   - WhatsApp FAB injection (single source of truth)
   - GA4 event tracking (non-PII only)
   - Scroll-reveal animations
   - Form validation + AJAX submit
   - Dropdown keyboard handling
   ========================================================================== */
(function () {
  "use strict";

  const CFG = window.EXPERTINAEO || {};
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  /* ---------- 1. Inject WhatsApp FAB ---------- */
  function injectWhatsApp() {
    if (!CFG.whatsappNumber) return;
    const ctx = document.body.getAttribute("data-wa-context");
    const msg = document.body.getAttribute("data-wa-message") || CFG.whatsappDefaultMsg;
    const fab = document.createElement("a");
    fab.className = "whatsapp-fab";
    fab.href = CFG.waLink(msg);
    fab.target = "_blank";
    fab.rel = "noopener noreferrer";
    fab.setAttribute("aria-label", "Chat with ExpertinAEO on WhatsApp");
    fab.setAttribute("data-ga", "whatsapp_click");
    fab.setAttribute("data-ga-source", ctx || "floating");
    fab.innerHTML =
      '<span class="fab-icon" aria-hidden="true">' +
        '<svg viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">' +
          '<path d="M16.001 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.256.591 4.449 1.711 6.389L3.2 28.8l6.576-1.721a12.74 12.74 0 0 0 6.225 1.587h.005c7.059 0 12.8-5.74 12.8-12.8 0-3.421-1.332-6.637-3.753-9.058A12.726 12.726 0 0 0 16.001 3.2zm0 23.04h-.004a10.62 10.62 0 0 1-5.41-1.482l-.388-.231-3.902 1.022 1.041-3.802-.254-.39a10.6 10.6 0 0 1-1.625-5.657c0-5.856 4.766-10.621 10.624-10.621 2.84 0 5.506 1.107 7.513 3.115a10.555 10.555 0 0 1 3.11 7.517c0 5.857-4.766 10.622-10.621 10.622zm5.836-7.948c-.32-.16-1.892-.933-2.184-1.04-.292-.107-.505-.16-.717.16-.213.32-.826 1.04-1.014 1.253-.186.213-.373.24-.693.12-.32-.16-1.353-.499-2.577-1.588-.953-.85-1.596-1.9-1.783-2.22-.186-.32-.02-.493.14-.652.144-.143.32-.373.48-.56.16-.187.213-.32.32-.533.107-.213.053-.4-.027-.56-.08-.16-.717-1.728-.981-2.366-.259-.622-.522-.538-.717-.547l-.61-.011c-.213 0-.56.08-.853.4-.293.32-1.12 1.093-1.12 2.666 0 1.573 1.146 3.093 1.306 3.306.16.214 2.254 3.441 5.46 4.829.763.329 1.358.526 1.823.673.766.244 1.463.209 2.014.127.614-.092 1.892-.773 2.158-1.519.267-.747.267-1.387.187-1.52-.08-.134-.293-.214-.613-.374z"/>' +
        '</svg>' +
      '</span>' +
      '<span class="fab-label">Chat with us</span>';
    document.body.appendChild(fab);

    fab.addEventListener("click", function () {
      trackEvent("whatsapp_click", { source_page: ctx || "floating" });
    });
  }

  /* ---------- 2. Email link tracking ---------- */
  function wireEmailTracking() {
    $$('a[href^="mailto:"]').forEach(function (a) {
      a.addEventListener("click", function () {
        trackEvent("email_click", { source_page: location.pathname });
      });
    });
    $$('[data-ga="email_click"]').forEach(function (a) {
      a.addEventListener("click", function () {
        trackEvent("email_click", { source_page: location.pathname });
      });
    });
  }

  /* ---------- 3. GA4 helper ---------- */
  function trackEvent(name, params) {
    if (typeof CFG.event === "function") {
      CFG.event(name, params);
    }
  }
  window.expertinAeoTrack = trackEvent;

  /* ---------- 4. Sticky header on scroll ---------- */
  function wireStickyHeader() {
    const header = $(".site-header");
    if (!header) return;
    const onScroll = function () {
      if (window.scrollY > 8) header.classList.add("scrolled");
      else header.classList.remove("scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- 5. Mobile menu ---------- */
  function wireMobileMenu() {
    const burger = $(".hamburger");
    const menu = $("#mobileMenu");
    if (!burger || !menu) return;
    const close = function () {
      burger.classList.remove("open");
      menu.classList.remove("open");
      document.body.style.overflow = "";
    };
    burger.addEventListener("click", function () {
      const isOpen = burger.classList.toggle("open");
      menu.classList.toggle("open", isOpen);
      document.body.style.overflow = isOpen ? "hidden" : "";
    });
    $$("[data-mobile-toggle]", menu).forEach(function (toggle) {
      toggle.addEventListener("click", function () {
        const target = $("#" + toggle.getAttribute("data-mobile-toggle"));
        if (target) target.classList.toggle("open");
      });
    });
    $$('a[href]', menu).forEach(function (a) {
      a.addEventListener("click", function () { close(); });
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") close();
    });
  }

  /* ---------- 6. Dropdown keyboard nav ---------- */
  function wireDropdowns() {
    $$(".nav-item.has-dropdown").forEach(function (item) {
      const trigger = $(".nav-link", item);
      if (!trigger) return;
      trigger.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          item.classList.toggle("open");
        }
      });
    });
  }

  /* ---------- 7. Scroll reveal ---------- */
  function wireScrollReveal() {
    const els = $$("[data-reveal]");
    if (!els.length || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("revealed"); });
      return;
    }
    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("revealed");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 8. Smooth anchor scrolling ---------- */
  function wireAnchors() {
    $$('a[href^="#"]').forEach(function (a) {
      const href = a.getAttribute("href");
      if (href === "#" || href.length < 2) return;
      a.addEventListener("click", function (e) {
        const target = $(href);
        if (!target) return;
        e.preventDefault();
        const headerOffset = 88;
        const top = target.getBoundingClientRect().top + window.scrollY - headerOffset;
        window.scrollTo({ top: top, behavior: "smooth" });
      });
    });
  }

  /* ---------- 9. Form behaviours ---------- */
  function wireForms() {
    $$("form[data-ajax-form]").forEach(function (form) {
      const formId = form.getAttribute("id") || "form";
      const msgBox = $("#" + formId + "-message") || $("[data-form-message]", form);

      // form_start on first focus
      let started = false;
      form.addEventListener("focusin", function () {
        if (!started) {
          started = true;
          trackEvent("form_start", { form_id: formId, source_page: location.pathname });
        }
      }, { once: true });

      // Client-side validation
      const validateField = function (field) {
        const wrapper = field.closest(".form-field") || field.parentElement;
        if (!wrapper) return true;
        let ok = true;
        if (field.hasAttribute("required") && !field.value.trim()) ok = false;
        if (field.type === "email" && field.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(field.value)) ok = false;
        if (field.type === "url" && field.value && field.value !== "No Website Yet" && !/^https?:\/\/.+/i.test(field.value)) ok = false;
        wrapper.classList.toggle("has-error", !ok);
        return ok;
      };

      form.addEventListener("submit", function (e) {
        e.preventDefault();
        const fields = $$("[name]", form);
        let valid = true;
        fields.forEach(validateField);
        fields.forEach(function (f) { if (!validateField(f)) valid = false; });
        // Privacy consent
        const consent = form.querySelector("[name='privacy_consent']");
        if (consent && consent.required && !consent.checked) {
          consent.closest(".form-field").classList.add("has-error");
          valid = false;
        } else if (consent) {
          consent.closest(".form-field").classList.remove("has-error");
        }
        // Honeypot — must be empty
        const honeypot = form.querySelector("[name='company_url']");
        if (honeypot && honeypot.value) { valid = false; }

        if (!valid) {
          if (msgBox) {
            msgBox.className = "form-message error";
            msgBox.textContent = "Please complete the highlighted fields and try again.";
          }
          return;
        }

        const submitBtn = form.querySelector("[type=submit]");
        const originalText = submitBtn ? submitBtn.textContent : "";
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting…"; }

        if (msgBox) { msgBox.className = ""; msgBox.textContent = ""; }

        const formData = new FormData(form);
        // Source metadata
        formData.append("source_url", location.href);
        formData.append("utm_source", new URLSearchParams(location.search).get("utm_source") || "");
        formData.append("utm_medium", new URLSearchParams(location.search).get("utm_medium") || "");
        formData.append("utm_campaign", new URLSearchParams(location.search).get("utm_campaign") || "");

        fetch(form.action, { method: "POST", body: formData, headers: { "X-Requested-With": "XMLHttpRequest" } })
          .then(function (r) { return r.json(); })
          .then(function (data) {
            if (data.ok) {
              trackEvent("generate_lead", { form_id: formId, source_page: location.pathname });
              trackEvent("audit_request", { form_id: formId, source_page: location.pathname });
              if (form.hasAttribute("data-redirect")) {
                window.location.href = form.getAttribute("data-redirect");
                return;
              }
              if (msgBox) {
                msgBox.className = "form-message success";
                msgBox.textContent = data.message || "Thank you. We'll be in touch within one business day.";
              }
              form.reset();
            } else {
              if (msgBox) {
                msgBox.className = "form-message error";
                msgBox.textContent = data.message || "Something went wrong. Please try again or email us directly.";
              }
            }
          })
          .catch(function () {
            if (msgBox) {
              msgBox.className = "form-message error";
              msgBox.textContent = "Network error. Please email us at " + (CFG.email || "") + ".";
            }
          })
          .finally(function () {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = originalText; }
          });
      });
    });
  }

  /* ---------- 10. Tool interaction tracking ---------- */
  function wireToolTracking() {
    $$("[data-ga]").forEach(function (el) {
      if (el.dataset.gaWired) return;
      el.dataset.gaWired = "1";
      el.addEventListener("click", function () {
        const ev = el.getAttribute("data-ga");
        const params = {};
        const source = el.getAttribute("data-ga-source");
        const tool = el.getAttribute("data-ga-tool");
        const service = el.getAttribute("data-ga-service");
        if (source) params.source_page = source;
        if (tool) params.tool_name = tool;
        if (service) params.service_name = service;
        trackEvent(ev, params);
      });
    });
  }

  /* ---------- 11. Active nav highlighting ---------- */
  function highlightActiveNav() {
    const path = location.pathname.replace(/\/+$/, "");
    $$(".nav-link, .mobile-nav-link").forEach(function (link) {
      const href = link.getAttribute("href");
      if (!href) return;
      const clean = href.replace(/\/+$/, "").replace(/^https?:\/\/[^/]+/, "");
      if (clean === path || (path === "" && clean === "")) {
        link.classList.add("active");
      }
    });
  }

  /* ---------- 12. Set WhatsApp context messages ---------- */
  function applyWhatsAppContext() {
    document.body.setAttribute("data-wa-context", document.body.getAttribute("data-wa-context") || "site");
    const waLinks = $$("[data-wa-context-link]");
    waLinks.forEach(function (a) {
      const ctx = a.getAttribute("data-wa-context-link");
      a.href = CFG.waLink(ctx);
    });
  }

  /* ---------- 13. Year in footer ---------- */
  function fillYear() {
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  }

  /* ---------- 14. Init ---------- */
  function init() {
    injectWhatsApp();
    wireEmailTracking();
    wireStickyHeader();
    wireMobileMenu();
    wireDropdowns();
    wireScrollReveal();
    wireAnchors();
    wireForms();
    wireToolTracking();
    highlightActiveNav();
    applyWhatsAppContext();
    fillYear();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

     /* ---------- 14. Init ---------- */
  function init() {
    injectWhatsApp();
    wireStickyHeader();
    wireMobileMenu(); // This will now find the injected mobile menu
    wireScrollReveal();
    wireAnchors();
    wireForms();
    wireToolTracking();
    highlightActiveNav(); // Important: highlights the active page link
    applyWhatsAppContext();
    fillYear();
  }

  // Run when layout is injected OR if DOM is already loaded
  document.addEventListener("layoutInjected", init);
  
  if (document.readyState === "loading") {
    // Fallback in case layout.js is missing
    document.addEventListener("DOMContentLoaded", () => {
      if (!document.querySelector('.site-header')) init();
    });
  } else {
    if (!document.querySelector('.site-header')) init();
  }
})();
