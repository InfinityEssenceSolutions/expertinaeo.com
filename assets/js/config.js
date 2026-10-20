/* ==========================================================================
   ExpertinAEO — Central site configuration
   Edit WhatsApp number, email, GA4 ID and nav structure here.
   ========================================================================== */
window.EXPERTINAEO = {
  // Brand
  brand: "ExpertinAEO",
  parentBrand: "Tapadia Tech",
  parentSince: 2001,

  // Contact
  email: "info@tapadiatech.com",
  whatsappNumber: "12132581582",      // E.164 digits only, used in wa.me link
  whatsappDisplay: "+1-213-258-1582",
  whatsappDefaultMsg: "Reaching out for Answer Engine Optimization | via ExpertinAEO.com",

  // Analytics
  ga4Id: "G-JLTVJKF4CC",

  // Paths (relative to site root, with trailing slash)
  root: "/",

  // Build the wa.me link with a context-specific message
  waLink: function (message) {
    const msg = encodeURIComponent(message || this.whatsappDefaultMsg);
    return "https://wa.me/" + this.whatsappNumber + "?text=" + msg;
  },

  mailLink: function (subject) {
    const s = subject ? encodeURIComponent(subject) : "";
    return "mailto:" + this.email + (s ? "?subject=" + s : "");
  },

  // GA4 push helper (only sends non-PII parameters)
  event: function (name, params) {
    if (typeof gtag === "function") {
      gtag("event", name, params || {});
    }
    if (window.console && window.console.debug) {
      console.debug("[ga4 event]", name, params);
    }
  }
};
