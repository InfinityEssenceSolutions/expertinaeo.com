/* ==========================================================================
   ExpertinAEO — Main interaction layer
   ========================================================================== */
   (function () {
    "use strict";

    const CFG = window.EXPERTINAEO || {};
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

    function trackEvent(name, params) {
      if (typeof CFG.event === "function") CFG.event(name, params || {});
    }
    window.expertinAeoTrack = trackEvent;

    /* ---------- 1. Sticky header ---------- */
    function wireStickyHeader() {
      const header = $(".site-header");
      if (!header) return;
      const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 8);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    /* ---------- 2. Mobile menu + accordion ---------- */
    function wireMobileMenu() {
      const burger = $(".hamburger");
      const menu = $("#mobileMenu");
      const backdrop = $("#mobileMenuBackdrop");

      if (!burger || !menu) return;

      function open() {
        burger.classList.add("open");
        burger.setAttribute("aria-expanded", "true");
        menu.classList.add("open");
        menu.setAttribute("aria-hidden", "false");
        if (backdrop) backdrop.classList.add("open");
        document.body.style.overflow = "hidden";
      }
      function close() {
        burger.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
        menu.classList.remove("open");
        menu.setAttribute("aria-hidden", "true");
        if (backdrop) backdrop.classList.remove("open");
        document.body.style.overflow = "";
      }

      // Toggle on hamburger click
      burger.addEventListener("click", (e) => {
        e.preventDefault();
        menu.classList.contains("open") ? close() : open();
      });

      if (backdrop) backdrop.addEventListener("click", close);

      // Accordion submenus
      $$("[data-acc-toggle]", menu).forEach((toggle) => {
        toggle.addEventListener("click", (e) => {
          e.preventDefault();
          const item = toggle.closest(".mobile-nav-item");
          const isOpen = item.classList.toggle("open");
          toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
        });
      });

      // Close on link click
      $$("a[href]", menu).forEach((a) => a.addEventListener("click", close));

      // Close on Escape
      document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
    }

    /* ---------- 3. Scroll reveal ---------- */
    function wireScrollReveal() {
      const els = $$("[data-reveal]");
      if (!els.length || !("IntersectionObserver" in window)) {
        els.forEach((el) => el.classList.add("revealed"));
        return;
      }
      const io = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            io.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
      els.forEach((el) => io.observe(el));
    }

    /* ---------- 4. Smooth anchors ---------- */
    function wireAnchors() {
      $$('a[href^="#"]').forEach((a) => {
        const href = a.getAttribute("href");
        if (!href || href === "#" || href.length < 2) return;
        a.addEventListener("click", (e) => {
          const target = document.getElementById(href.slice(1));
          if (!target) return;
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.scrollY - 88;
          window.scrollTo({ top, behavior: "smooth" });
        });
      });
    }

    /* ---------- 5. Forms ---------- */
    function wireForms() {
      $$("form[data-ajax-form]").forEach((form) => {
        const formId = form.id || "form";
        const msgBox = document.getElementById(formId + "-message") || form.querySelector("[data-form-message]");

        const validateField = (field) => {
          const wrapper = field.closest(".form-field") || field.parentElement;
          if (!wrapper) return true;
          let ok = true;
          if (field.hasAttribute("required") && !field.value.trim()) ok = false;
          if (field.type === "email" && field.value && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(field.value)) ok = false;
          wrapper.classList.toggle("has-error", !ok);
          return ok;
        };

        form.addEventListener("submit", (e) => {
          e.preventDefault(); // Prevents ERR_FILE_NOT_FOUND locally

          const fields = $$("[name]", form);
          let valid = true;
          fields.forEach((f) => { if (!validateField(f)) valid = false; });

          const consent = form.querySelector("[name='privacy_consent']");
          if (consent && consent.required && !consent.checked) {
            consent.closest(".form-field").classList.add("has-error");
            valid = false;
          } else if (consent) {
            consent.closest(".form-field").classList.remove("has-error");
          }

          const honeypot = form.querySelector("[name='company_url']");
          if (honeypot && honeypot.value) valid = false;

          if (!valid) {
            if (msgBox) { msgBox.className = "form-message error"; msgBox.textContent = "Please complete the highlighted fields and try again."; }
            return;
          }

          const submitBtn = form.querySelector("[type=submit]");
          const originalText = submitBtn ? submitBtn.innerHTML : "";
          if (submitBtn) { submitBtn.disabled = true; submitBtn.innerHTML = "Submitting…"; }
          if (msgBox) { msgBox.className = ""; msgBox.textContent = ""; }

          // Simulated form submission for local testing
          setTimeout(() => {
            if (msgBox) {
              msgBox.className = "form-message success";
              msgBox.textContent = "Thank you. We'll be in touch within one business day. (Simulated locally)";
            }
            form.reset();
            if (submitBtn) { submitBtn.disabled = false; submitBtn.innerHTML = originalText; }
          }, 1000);
        });
      });

      // Newsletter
      $$("[data-newsletter]").forEach((form) => {
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const email = form.querySelector("input[name=newsletter_email]");
          if (!email || !email.value) return;
          trackEvent("newsletter_signup", { source_page: location.pathname });
          email.value = "";
          email.placeholder = "Thanks — check your inbox!";
          setTimeout(() => { email.placeholder = "you@company.com"; }, 3500);
        });
      });
    }

    /* ---------- 6. Init Function ---------- */
    function init() {
      wireStickyHeader();
      wireMobileMenu();
      wireScrollReveal();
      wireAnchors();
      wireForms();
    }

    /* ---------- 7. Boot Sequence ---------- */
    // 1. Listen for the layout to be injected by layout.js
    document.addEventListener("layoutInjected", init);

    // 2. Fallback: If layout.js is missing or fails, init normally
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        if (!document.querySelector('.site-header')) init();
      });
    } else {
      if (!document.querySelector('.site-header')) init();
    }

  })();
