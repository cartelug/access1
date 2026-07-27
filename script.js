(() => {
  document.documentElement.classList.add('js');
  const WHATSAPP_NUMBER = '256762193386';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  $$('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

  const header = $('[data-header]');
  const onScroll = () => header?.classList.toggle('scrolled', window.scrollY > 24);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  const floatingWhatsApp = $('.floating-whatsapp');
  const heroPrimaryCta = $('.hero-actions .button');
  if (floatingWhatsApp && heroPrimaryCta && 'IntersectionObserver' in window) {
    const floatingObserver = new IntersectionObserver(([entry]) => {
      floatingWhatsApp.classList.toggle('is-suppressed', entry.isIntersecting);
    }, { threshold: .15 });
    floatingObserver.observe(heroPrimaryCta);
  }

  const menuButton = $('[data-menu-button]');
  const mobileNav = $('[data-mobile-nav]');
  if (menuButton && mobileNav) {
    const setMenuState = open => {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      mobileNav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      if (open) {
        const firstLink = $('a', mobileNav);
        window.setTimeout(() => firstLink?.focus(), 120);
      }
    };
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') === 'true';
      setMenuState(!open);
    });
    $$('a', mobileNav).forEach(link => link.addEventListener('click', () => {
      setMenuState(false);
    }));
    window.addEventListener('resize', () => {
      if (getComputedStyle(menuButton).display === 'none' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenuState(false);
      }
    }, { passive: true });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
        setMenuState(false);
        menuButton.focus();
      }
      if (event.key === 'Tab' && menuButton.getAttribute('aria-expanded') === 'true') {
        const focusable = [menuButton, ...$$('a, button', mobileNav)].filter(element => !element.hasAttribute('disabled'));
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
  }

  const revealObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      }), { threshold: 0.12 })
    : null;
  $$('.reveal').forEach(el => revealObserver ? revealObserver.observe(el) : el.classList.add('visible'));

  const animateCounter = element => {
    const target = Number(element.dataset.counter || 0);
    if (!target || element.dataset.animated === 'true') return;
    element.dataset.animated = 'true';
    const started = performance.now();
    const duration = 1100;
    const tick = now => {
      const progress = Math.min((now - started) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = Math.round(target * eased).toLocaleString();
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterObserver = 'IntersectionObserver' in window
    ? new IntersectionObserver(entries => entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      }), { threshold: 0.7 })
    : null;
  $$('[data-counter]').forEach(el => counterObserver ? counterObserver.observe(el) : animateCounter(el));

  const waOpen = message => {
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener');
  };

  const urlParams = new URLSearchParams(window.location.search);
  const followerForm = $('#follower-order-form');
  if (followerForm) {
    const mobileOrderBar = $('[data-mobile-order-bar]');
    if (mobileOrderBar) {
      document.body.classList.add('has-mobile-order-bar');
      const syncKeyboardState = () => {
        const viewport = window.visualViewport;
        document.body.classList.toggle('keyboard-open', Boolean(viewport && viewport.height < window.innerHeight * .72));
      };
      window.visualViewport?.addEventListener('resize', syncKeyboardState, { passive: true });
      syncKeyboardState();
    }

    const initialPlatform = urlParams.get('platform');
    const initialPackage = urlParams.get('package');
    if (initialPlatform) {
      const radio = $(`input[name="platform"][value="${initialPlatform[0].toUpperCase()}${initialPlatform.slice(1)}"]`, followerForm);
      if (radio) radio.checked = true;
    }
    if (initialPackage === '10000') {
      const radio = $('input[name="package"][value^="10,000"]', followerForm);
      if (radio) radio.checked = true;
    }

    const customField = $('.custom-target-field', followerForm);
    const customInput = $('#custom-target', followerForm);
    const summary = {
      platform: $('[data-summary-platform]'),
      package: $('[data-summary-package]'),
      account: $('[data-summary-account]'),
      delivery: $('[data-summary-delivery]')
    };

    const updateFollowerSummary = () => {
      const data = new FormData(followerForm);
      const selectedPackage = data.get('package');
      const isCustom = selectedPackage === 'Custom follower target';
      if (customField) customField.hidden = !isCustom;
      if (customInput) customInput.required = isCustom;
      if (summary.platform) summary.platform.textContent = data.get('platform') || 'Not selected';
      if (summary.package) summary.package.textContent = isCustom && data.get('customTarget') ? `${Number(data.get('customTarget')).toLocaleString()} followers` : (selectedPackage || 'Not selected');
      if (summary.account) summary.account.textContent = data.get('profileLink') || 'Not added';
      if (summary.delivery) summary.delivery.textContent = data.get('delivery') || 'Not selected';
    };
    followerForm.addEventListener('input', updateFollowerSummary);
    followerForm.addEventListener('change', updateFollowerSummary);
    updateFollowerSummary();

    const mobileOrderLabel = $('[data-mobile-order-label]');
    const mobileOrderSubmit = $('[data-mobile-order-submit]');
    const updateMobileOrderBar = () => {
      if (!mobileOrderLabel) return;
      const data = new FormData(followerForm);
      const platform = data.get('platform');
      const selectedPackage = data.get('package');
      mobileOrderLabel.textContent = platform
        ? `${platform}${selectedPackage ? ` · ${selectedPackage.split(' — ')[0]}` : ' · choose a target'}`
        : 'Choose a platform to begin';
    };
    followerForm.addEventListener('change', updateMobileOrderBar);
    updateMobileOrderBar();
    mobileOrderSubmit?.addEventListener('click', () => {
      const firstMissing = $('input:invalid, select:invalid, textarea:invalid', followerForm);
      if (firstMissing) {
        firstMissing.closest('.form-step')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        window.setTimeout(() => firstMissing.focus(), 350);
        return;
      }
      followerForm.requestSubmit();
    });

    followerForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!followerForm.reportValidity()) return;
      const data = new FormData(followerForm);
      let target = data.get('package');
      if (target === 'Custom follower target') target = `${Number(data.get('customTarget')).toLocaleString()} followers (custom target)`;
      const message = [
        'Hello 97.world, I want to place a follower growth order.',
        '',
        `Platform: ${data.get('platform')}`,
        `Target: ${target}`,
        `Profile/page: ${data.get('profileLink')}`,
        `Country: ${data.get('country')}`,
        `Preferred delivery: ${data.get('delivery')}`,
        `Name: ${data.get('name')}`,
        `My WhatsApp: ${data.get('phone')}`,
        data.get('notes') ? `Notes: ${data.get('notes')}` : '',
        '',
        'Please check the account and confirm availability, final price and delivery details.'
      ].filter(Boolean).join('\n');
      waOpen(message);
    });
  }

  const streamingForm = $('#streaming-order-form');
  if (streamingForm) {
    const initialService = urlParams.get('service');
    if (initialService) {
      const value = initialService === 'prime' ? 'Prime Video' : initialService === 'apple' ? 'Apple TV+' : '';
      const radio = value ? $(`input[name="service"][value="${value}"]`, streamingForm) : null;
      if (radio) radio.checked = true;
    }
    streamingForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!streamingForm.reportValidity()) return;
      const data = new FormData(streamingForm);
      const message = [
        'Hello 97.world, I want streaming support.', '',
        `Service: ${data.get('service')}`,
        `Duration: ${data.get('duration')}`,
        `Devices: ${data.get('devices')}`,
        `Country: ${data.get('country')}`,
        `Main device: ${data.get('deviceType')}`,
        `Name: ${data.get('name')}`,
        `My WhatsApp: ${data.get('phone')}`,
        data.get('notes') ? `Notes: ${data.get('notes')}` : '', '',
        'Please confirm compatibility, package availability and final price.'
      ].filter(Boolean).join('\n');
      waOpen(message);
    });
  }

  const contactForm = $('#contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', event => {
      event.preventDefault();
      if (!contactForm.reportValidity()) return;
      const data = new FormData(contactForm);
      const message = [
        'Hello 97.world, I need support.', '',
        `Name: ${data.get('name')}`,
        `My WhatsApp: ${data.get('phone')}`,
        `Topic: ${data.get('topic')}`,
        `Message: ${data.get('message')}`
      ].join('\n');
      waOpen(message);
    });
  }
})();
