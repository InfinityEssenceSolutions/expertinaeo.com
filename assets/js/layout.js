/* ==========================================================================
   ExpertinAEO — Master Layout Injection
   - Injects Header, Mobile Menu, and Footer
   - Automatically adjusts relative paths based on folder depth
   ========================================================================== */
   (function () {
    "use strict";

    // Determine the relative path to the root directory
    // If the URL contains /services/, /industries/, etc., we need to go up one level.
    // For deeper pages, we calculate depth.
    const pathSegments = window.location.pathname.split('/').filter(p => p && p !== 'index.html' && p !== 'index.php');
    let rootPath = './';

    // If we are in a subfolder (e.g., /services/aeo-consulting/), calculate the relative root
    const depth = pathSegments.length;
    if (depth > 0) {
      rootPath = '../'.repeat(depth);
    }

    // Helper to build URLs
    const url = (path) => `${rootPath}${path}`;

    // 1. HEADER HTML
    const headerHTML = `
      <a class="skip-link" href="#main">Skip to main content</a>
      <header class="site-header" role="banner">
        <div class="header-shell">
          <div class="header-inner">
            <a class="logo" href="${url('index.html')}" aria-label="ExpertinAEO — home">
              <span class="logo-word"><span class="logo-expertin">Expertin</span><span class="logo-aeo">AEO</span></span>
              <span class="logo-parent">A product of Tapadia Tech</span>
            </a>

            <nav class="nav-primary" aria-label="Primary">
              <div class="nav-item"><a class="nav-link" href="${url('index.html')}">Home</a></div>

              <div class="nav-item has-mega">
                <a class="nav-link" href="${url('services/index.html')}" aria-haspopup="true">Services <i class="fa-solid fa-chevron-down chev"></i></a>
                <div class="mega" role="menu">
                  <div class="mega-grid">
                    <a class="mega-link" href="${url('services/aeo-consulting/index.html')}"><i class="fa-solid fa-lightbulb mega-icon"></i><div><strong>AEO Consulting</strong><small>Strategy, roadmaps &amp; prioritization</small></div></a>
                    <a class="mega-link" href="${url('services/aeo-audit/index.html')}"><i class="fa-solid fa-clipboard-check mega-icon"></i><div><strong>AEO Audit</strong><small>Full readiness assessment</small></div></a>
                    <a class="mega-link" href="${url('services/featured-snippet-optimization/index.html')}"><i class="fa-solid fa-bolt mega-icon"></i><div><strong>Featured Snippets</strong><small>Position-zero content</small></div></a>
                    <a class="mega-link" href="${url('services/people-also-ask-optimization/index.html')}"><i class="fa-solid fa-circle-question mega-icon"></i><div><strong>People Also Ask</strong><small>Question coverage</small></div></a>
                    <a class="mega-link" href="${url('services/voice-search-optimization/index.html')}"><i class="fa-solid fa-microphone mega-icon"></i><div><strong>Voice Search</strong><small>Conversational queries</small></div></a>
                    <a class="mega-link" href="${url('services/conversational-search-optimization/index.html')}"><i class="fa-solid fa-comments mega-icon"></i><div><strong>Conversational</strong><small>Natural-language UX</small></div></a>
                    <a class="mega-link" href="${url('services/faq-content-optimization/index.html')}"><i class="fa-solid fa-list-check mega-icon"></i><div><strong>FAQ Content</strong><small>Answer-rich pages</small></div></a>
                    <a class="mega-link" href="${url('services/schema-markup/index.html')}"><i class="fa-solid fa-code mega-icon"></i><div><strong>Schema Markup</strong><small>JSON-LD implementation</small></div></a>
                    <a class="mega-link" href="${url('services/entity-optimization/index.html')}"><i class="fa-solid fa-diagram-project mega-icon"></i><div><strong>Entity Optimization</strong><small>Knowledge-graph signals</small></div></a>
                  </div>
                  <div class="mega-foot">
                    <span><i class="fa-solid fa-layer-group"></i> 15 specialist services across the full AEO stack</span>
                    <a href="${url('services/index.html')}">View all <i class="fa-solid fa-arrow-right"></i></a>
                  </div>
                </div>
              </div>

              <div class="nav-item has-mega">
                <a class="nav-link" href="${url('industries/index.html')}" aria-haspopup="true">Industries <i class="fa-solid fa-chevron-down chev"></i></a>
                <div class="mega" role="menu">
                  <div class="mega-grid">
                    <a class="mega-link" href="${url('industries/saas/index.html')}"><i class="fa-solid fa-cloud mega-icon"></i><div><strong>SaaS</strong><small>Product-led AEO</small></div></a>
                    <a class="mega-link" href="${url('industries/ecommerce/index.html')}"><i class="fa-solid fa-cart-shopping mega-icon"></i><div><strong>eCommerce</strong><small>Product &amp; category</small></div></a>
                    <a class="mega-link" href="${url('industries/healthcare/index.html')}"><i class="fa-solid fa-heart-pulse mega-icon"></i><div><strong>Healthcare</strong><small>YMYL authority</small></div></a>
                    <a class="mega-link" href="${url('industries/real-estate/index.html')}"><i class="fa-solid fa-house mega-icon"></i><div><strong>Real Estate</strong><small>Local answer coverage</small></div></a>
                    <a class="mega-link" href="${url('industries/education/index.html')}"><i class="fa-solid fa-graduation-cap mega-icon"></i><div><strong>Education</strong><small>Course discovery</small></div></a>
                    <a class="mega-link" href="${url('industries/b2b/index.html')}"><i class="fa-solid fa-briefcase mega-icon"></i><div><strong>B2B</strong><small>Decision-stage content</small></div></a>
                    <a class="mega-link" href="${url('industries/plumbing/index.html')}"><i class="fa-solid fa-faucet-drip mega-icon"></i><div><strong>Plumbing</strong><small>Local services AEO</small></div></a>
                    <a class="mega-link" href="${url('industries/dental-clinics/index.html')}"><i class="fa-solid fa-tooth mega-icon"></i><div><strong>Dental Clinics</strong><small>YMYL healthcare</small></div></a>
                    <a class="mega-link" href="${url('industries/hvac/index.html')}"><i class="fa-solid fa-snowflake mega-icon"></i><div><strong>HVAC</strong><small>Seasonal demand</small></div></a>
                  </div>
                  <div class="mega-foot">
                    <span><i class="fa-solid fa-layer-group"></i> 18 verticals with tailored methodology</span>
                    <a href="${url('industries/index.html')}">View all <i class="fa-solid fa-arrow-right"></i></a>
                  </div>
                </div>
              </div>

              <div class="nav-item"><a class="nav-link" href="${url('pricing/index.html')}">Pricing</a></div>

              <div class="nav-item has-mega">
                <a class="nav-link" href="${url('tools/index.html')}" aria-haspopup="true">Free Tools <i class="fa-solid fa-chevron-down chev"></i></a>
                <div class="mega" style="width: min(560px, calc(100vw - 48px));" role="menu">
                  <div class="mega-grid cols-2">
                    <a class="mega-link" href="${url('tools/aeo-checker/index.html')}"><i class="fa-solid fa-magnifying-glass-chart mega-icon"></i><div><strong>AEO Checker</strong><small>Free readiness audit</small></div></a>
                    <a class="mega-link" href="${url('tools/schema-checker/index.html')}"><i class="fa-solid fa-code mega-icon"></i><div><strong>Schema Checker</strong><small>JSON-LD inspection</small></div></a>
                    <a class="mega-link" href="${url('tools/answer-checker/index.html')}"><i class="fa-solid fa-circle-check mega-icon"></i><div><strong>Answer Checker</strong><small>Direct-answer scoring</small></div></a>
                    <a class="mega-link" href="${url('tools/faq-generator/index.html')}"><i class="fa-solid fa-comment-dots mega-icon"></i><div><strong>FAQ Generator</strong><small>Question suggestions</small></div></a>
                    <a class="mega-link" href="${url('tools/meta-heading-checker/index.html')}"><i class="fa-solid fa-heading mega-icon"></i><div><strong>Meta &amp; Heading</strong><small>On-page audit</small></div></a>
                  </div>
                  <div class="mega-foot">
                    <span><i class="fa-solid fa-gift"></i> 5 free tools, no signup required</span>
                    <a href="${url('tools/index.html')}">Explore <i class="fa-solid fa-arrow-right"></i></a>
                  </div>
                </div>
              </div>

              <div class="nav-item"><a class="nav-link" href="${url('aeo-services/index.html')}">Markets</a></div>

              <div class="nav-item has-mega">
                <a class="nav-link" href="${url('about/index.html')}" aria-haspopup="true">Company <i class="fa-solid fa-chevron-down chev"></i></a>
                <div class="mega" style="width: min(440px, calc(100vw - 48px));" role="menu">
                  <div class="mega-grid cols-2">
                    <a class="mega-link" href="${url('about/index.html')}"><i class="fa-solid fa-building mega-icon"></i><div><strong>About Us</strong><small>23+ years of Tapadia Tech</small></div></a>
                    <a class="mega-link" href="${url('case-studies/index.html')}"><i class="fa-solid fa-chart-line mega-icon"></i><div><strong>Case Studies</strong><small>Methodology &amp; evidence</small></div></a>
                    <a class="mega-link" href="${url('resources/index.html')}"><i class="fa-solid fa-book-open mega-icon"></i><div><strong>Resources</strong><small>Guides &amp; insights</small></div></a>
                    <a class="mega-link" href="${url('contact/index.html')}"><i class="fa-solid fa-envelope mega-icon"></i><div><strong>Contact</strong><small>Talk to a strategist</small></div></a>
                  </div>
                </div>
              </div>
            </nav>

            <div class="header-cta">
              <a class="header-phone" href="tel:+12132581582" aria-label="Call us at +1 213 258 1582">
                <i class="fa-solid fa-phone"></i>
                <span>+1-213-258-1582</span>
              </a>
              <a class="btn btn-primary btn-sm" href="${url('free-aeo-audit/index.html')}" data-ga="audit_request" data-ga-source="header">
  <i class="fa-solid fa-bolt"></i> <span class="btn-text">Get Free AEO Audit</span>
</a>
              <button class="hamburger" aria-label="Open menu" aria-expanded="false" aria-controls="mobileMenu">
                <span></span><span></span><span></span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div class="mobile-menu-backdrop" id="mobileMenuBackdrop"></div>
      <div class="mobile-menu" id="mobileMenu" aria-hidden="true">
        <nav class="mobile-nav" aria-label="Mobile">
          <div class="mobile-nav-item"><a class="mobile-nav-link" href="${url('index.html')}"><i class="fa-solid fa-house"></i> Home</a></div>

          <div class="mobile-nav-item">
            <button class="mobile-nav-link" data-acc-toggle="acc-services" aria-expanded="false">
              <span><i class="fa-solid fa-layer-group"></i> Services</span> <span class="acc-icon"><i class="fa-solid fa-plus"></i></span>
            </button>
            <div class="mobile-nav-children" id="acc-services"><div>
              <a href="${url('services/aeo-consulting/index.html')}">AEO Consulting</a>
              <a href="${url('services/aeo-audit/index.html')}">AEO Audit</a>
              <a href="${url('services/featured-snippet-optimization/index.html')}">Featured Snippet Optimization</a>
              <a href="${url('services/people-also-ask-optimization/index.html')}">People Also Ask Optimization</a>
              <a href="${url('services/voice-search-optimization/index.html')}">Voice Search Optimization</a>
              <a href="${url('services/schema-markup/index.html')}">Schema Markup</a>
              <a href="${url('services/entity-optimization/index.html')}">Entity Optimization</a>
              <a href="${url('services/index.html')}">View all services →</a>
            </div></div>
          </div>

          <div class="mobile-nav-item">
            <button class="mobile-nav-link" data-acc-toggle="acc-industries" aria-expanded="false">
              <span><i class="fa-solid fa-industry"></i> Industries</span> <span class="acc-icon"><i class="fa-solid fa-plus"></i></span>
            </button>
            <div class="mobile-nav-children" id="acc-industries"><div>
              <a href="${url('industries/saas/index.html')}">SaaS</a>
              <a href="${url('industries/ecommerce/index.html')}">eCommerce</a>
              <a href="${url('industries/healthcare/index.html')}">Healthcare</a>
              <a href="${url('industries/real-estate/index.html')}">Real Estate</a>
              <a href="${url('industries/plumbing/index.html')}">Plumbing</a>
              <a href="${url('industries/index.html')}">View all industries →</a>
            </div></div>
          </div>

          <div class="mobile-nav-item"><a class="mobile-nav-link" href="${url('pricing/index.html')}"><i class="fa-solid fa-tag"></i> Pricing</a></div>

          <div class="mobile-nav-item">
            <button class="mobile-nav-link" data-acc-toggle="acc-tools" aria-expanded="false">
              <span><i class="fa-solid fa-toolbox"></i> Free Tools</span> <span class="acc-icon"><i class="fa-solid fa-plus"></i></span>
            </button>
            <div class="mobile-nav-children" id="acc-tools"><div>
              <a href="${url('tools/aeo-checker/index.html')}">AEO Checker</a>
              <a href="${url('tools/schema-checker/index.html')}">Schema Checker</a>
              <a href="${url('tools/answer-checker/index.html')}">Answer Checker</a>
              <a href="${url('tools/faq-generator/index.html')}">FAQ Generator</a>
              <a href="${url('tools/meta-heading-checker/index.html')}">Meta &amp; Heading Checker</a>
            </div></div>
          </div>

          <div class="mobile-nav-item"><a class="mobile-nav-link" href="${url('aeo-services/index.html')}"><i class="fa-solid fa-globe"></i> International Markets</a></div>
          <div class="mobile-nav-item"><a class="mobile-nav-link" href="${url('case-studies/index.html')}"><i class="fa-solid fa-chart-line"></i> Case Studies</a></div>
          <div class="mobile-nav-item"><a class="mobile-nav-link" href="${url('resources/index.html')}"><i class="fa-solid fa-book-open"></i> Resources</a></div>
          <div class="mobile-nav-item"><a class="mobile-nav-link" href="${url('about/index.html')}"><i class="fa-solid fa-building"></i> About</a></div>
          <div class="mobile-nav-item"><a class="mobile-nav-link" href="${url('contact/index.html')}"><i class="fa-solid fa-envelope"></i> Contact</a></div>
        </nav>

        <a class="btn btn-primary btn-block" href="${url('free-aeo-audit/index.html')}"><i class="fa-solid fa-bolt"></i> Get Free AEO Audit</a>

        <div class="mobile-menu-meta">
          <a href="tel:+12132581582"><i class="fa-solid fa-phone"></i> +1-213-258-1582</a>
          <a href="mailto:info@tapadiatech.com"><i class="fa-solid fa-envelope"></i> info@tapadiatech.com</a>
        </div>
      </div>
    `;

    // 2. FOOTER HTML
    const footerHTML = `
      <footer class="site-footer" role="contentinfo">
        <div class="footer-shell">
          <div class="footer-hero">
            <div class="footer-hero-copy">
              <a class="logo" href="${url('index.html')}">
                <span class="logo-word"><span class="logo-expertin">Expertin</span><span class="logo-aeo">AEO</span></span>
                <span class="logo-parent">A product of Tapadia Tech (est. 2001)</span>
              </a>
              <p>Answer Engine Optimization specialists helping brands become the cited source across AI search, voice assistants, generative answers and modern search experiences.</p>
            </div>
            <div class="footer-hero-cta">
              <h4><i class="fa-solid fa-envelope-open-text"></i> Get AEO insights in your inbox</h4>
              <p>One email per month. No spam. Unsubscribe anytime.</p>
              <form class="footer-newsletter" data-newsletter>
                <input type="email" name="newsletter_email" placeholder="you@company.com" required />
                <button class="btn btn-primary btn-sm" type="submit">Subscribe</button>
              </form>
            </div>
          </div>

          <div class="footer-links">
            <div class="footer-col">
              <h4>Services</h4>
              <ul>
                <li><a href="${url('services/aeo-consulting/index.html')}"><i class="fa-solid fa-lightbulb"></i> AEO Consulting</a></li>
                <li><a href="${url('services/aeo-audit/index.html')}"><i class="fa-solid fa-clipboard-check"></i> AEO Audit</a></li>
                <li><a href="${url('services/schema-markup/index.html')}"><i class="fa-solid fa-code"></i> Schema Markup</a></li>
                <li><a href="${url('services/featured-snippet-optimization/index.html')}"><i class="fa-solid fa-bolt"></i> Featured Snippets</a></li>
                <li><a href="${url('services/voice-search-optimization/index.html')}"><i class="fa-solid fa-microphone"></i> Voice Search</a></li>
                <li><a href="${url('services/entity-optimization/index.html')}"><i class="fa-solid fa-diagram-project"></i> Entity Optimization</a></li>
                <li><a href="${url('services/ai-answer-visibility/index.html')}"><i class="fa-solid fa-eye"></i> AI Answer Visibility</a></li>
                <li><a href="${url('services/index.html')}">All 15 services <i class="fa-solid fa-arrow-right"></i></a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h4>Free Tools</h4>
              <ul>
                <li><a href="${url('tools/aeo-checker/index.html')}"><i class="fa-solid fa-magnifying-glass-chart"></i> AEO Checker</a></li>
                <li><a href="${url('tools/schema-checker/index.html')}"><i class="fa-solid fa-code"></i> Schema Checker</a></li>
                <li><a href="${url('tools/answer-checker/index.html')}"><i class="fa-solid fa-circle-check"></i> Answer Checker</a></li>
                <li><a href="${url('tools/faq-generator/index.html')}"><i class="fa-solid fa-comment-dots"></i> FAQ Generator</a></li>
                <li><a href="${url('tools/meta-heading-checker/index.html')}"><i class="fa-solid fa-heading"></i> Meta &amp; Heading</a></li>
              </ul>
              <h4 style="margin-top: 28px;">Pricing</h4>
              <ul>
                <li><a href="${url('pricing/index.html')}"><i class="fa-solid fa-tag"></i> Compare packages</a></li>
                <li><a href="${url('pricing/index.html')}#starter"><i class="fa-solid fa-seedling"></i> Starter — $1,000/mo</a></li>
                <li><a href="${url('pricing/index.html')}#growth"><i class="fa-solid fa-rocket"></i> Growth — $2,000/mo</a></li>
                <li><a href="${url('pricing/index.html')}#authority"><i class="fa-solid fa-crown"></i> Authority — $4,000/mo</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h4>Company</h4>
              <ul>
                <li><a href="${url('about/index.html')}"><i class="fa-solid fa-building"></i> About ExpertinAEO</a></li>
                <li><a href="${url('case-studies/index.html')}"><i class="fa-solid fa-chart-line"></i> Case Studies</a></li>
                <li><a href="${url('resources/index.html')}"><i class="fa-solid fa-book-open"></i> Resources</a></li>
                <li><a href="${url('contact/index.html')}"><i class="fa-solid fa-envelope"></i> Contact</a></li>
                <li><a href="${url('free-aeo-audit/index.html')}"><i class="fa-solid fa-bolt"></i> Free AEO Audit</a></li>
                <li><a href="${url('sitemap.xml')}"><i class="fa-solid fa-sitemap"></i> Sitemap</a></li>
              </ul>
              <h4 style="margin-top: 28px;">Industries</h4>
              <ul>
                <li><a href="${url('industries/saas/index.html')}"><i class="fa-solid fa-cloud"></i> SaaS</a></li>
                <li><a href="${url('industries/ecommerce/index.html')}"><i class="fa-solid fa-cart-shopping"></i> eCommerce</a></li>
                <li><a href="${url('industries/healthcare/index.html')}"><i class="fa-solid fa-heart-pulse"></i> Healthcare</a></li>
                <li><a href="${url('industries/index.html')}">All industries <i class="fa-solid fa-arrow-right"></i></a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h4>AEO by Country</h4>
              <div class="footer-countries">
                <a class="footer-country-link" href="${url('aeo-services/usa/index.html')}"><span class="flag">🇺🇸</span> United States</a>
                <a class="footer-country-link" href="${url('aeo-services/uk/index.html')}"><span class="flag">🇬🇧</span> United Kingdom</a>
                <a class="footer-country-link" href="${url('aeo-services/uae/index.html')}"><span class="flag">🇦🇪</span> UAE</a>
                <a class="footer-country-link" href="${url('aeo-services/canada/index.html')}"><span class="flag">🇨🇦</span> Canada</a>
                <a class="footer-country-link" href="${url('aeo-services/australia/index.html')}"><span class="flag">🇦🇺</span> Australia</a>
                <a class="footer-country-link" href="${url('aeo-services/india/index.html')}"><span class="flag">🇮🇳</span> India</a>
                <a class="footer-country-link" href="${url('aeo-services/singapore/index.html')}"><span class="flag">🇸🇬</span> Singapore</a>
                <a class="footer-country-link" href="${url('aeo-services/germany/index.html')}"><span class="flag">🇩🇪</span> Germany</a>
              </div>

              <div class="footer-contact-card" style="margin-top: 20px;">
                <a class="footer-contact-item" href="mailto:info@tapadiatech.com">
                  <i class="fa-solid fa-envelope"></i>
                  <span><strong>Email</strong>info@tapadiatech.com</span>
                </a>
                <a class="footer-contact-item" href="tel:+12132581582">
                  <i class="fa-solid fa-phone"></i>
                  <span><strong>Phone</strong>+1-213-258-1582</span>
                </a>
                <a class="footer-contact-item" href="https://wa.me/12132581582" target="_blank" rel="noopener">
                  <i class="fa-brands fa-whatsapp"></i>
                  <span><strong>WhatsApp</strong>Chat with us</span>
                </a>
                <div class="footer-socials">
                  <a href="#" aria-label="LinkedIn" title="LinkedIn"><i class="fa-brands fa-linkedin-in"></i></a>
                  <a href="#" aria-label="X (Twitter)" title="X"><i class="fa-brands fa-x-twitter"></i></a>
                  <a href="#" aria-label="YouTube" title="YouTube"><i class="fa-brands fa-youtube"></i></a>
                  <a href="#" aria-label="GitHub" title="GitHub"><i class="fa-brands fa-github"></i></a>
                </div>
              </div>
            </div>
          </div>

          <div class="footer-trust">
            <div class="footer-trust-badges">
              <div class="footer-trust-badge">
                <i class="fa-solid fa-shield-halved"></i>
                <span><strong>SSRF-safe</strong> free tools</span>
              </div>
              <div class="footer-trust-badge">
                <i class="fa-solid fa-clock-rotate-left"></i>
                <span><strong>Est. 2001</strong> parent company</span>
              </div>
              <div class="footer-trust-badge">
                <i class="fa-solid fa-circle-check"></i>
                <span><strong>Evidence-led</strong> reporting</span>
              </div>
            </div>
            <div style="font-size: 0.75rem; color: rgba(255,255,255,0.4);">8 markets · 18 industries · 15 services</div>
          </div>

          <div class="footer-legal">
            <div class="copyright">© <span data-year>2026</span> ExpertinAEO, a product of Tapadia Tech. All rights reserved.</div>
            <div class="legal-links">
              <a href="${url('privacy-policy/index.html')}">Privacy Policy</a>
              <a href="${url('terms-and-conditions/index.html')}">Terms &amp; Conditions</a>
              <a href="${url('sitemap.xml')}">Sitemap</a>
            </div>
          </div>
        </div>
      </footer>
    `;

    // Inject into DOM
    function injectLayout() {
      const body = document.body;

      // Inject Header before main (or as first child)
      const main = document.getElementById('main') || document.querySelector('main');
      if (main) {
        main.insertAdjacentHTML('beforebegin', headerHTML);
      } else {
        body.insertAdjacentHTML('afterbegin', headerHTML);
      }

      // Inject Footer at the end
      body.insertAdjacentHTML('beforeend', footerHTML);

      // Dispatch event so main.js knows the DOM is updated
      document.dispatchEvent(new Event('layoutInjected'));
    }

    // Run on DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', injectLayout);
    } else {
      injectLayout();
    }
  })();
