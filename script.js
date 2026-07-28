(() => {
  'use strict';

  document.documentElement.classList.remove('no-js');
  document.documentElement.classList.add('js');

  const WHATSAPP_NUMBER = '256762193386';
  const MAX_WHATSAPP_MESSAGE_LENGTH = 1500;
  const MAX_WHATSAPP_URL_LENGTH = 4096;
  const WHATSAPP_URL_PREFIX = `https://wa.me/${WHATSAPP_NUMBER}?text=`;
  const WHATSAPP_SHORTENED_MARKER = '\n\n[Message shortened]';
  const PLATFORM_QUERY_MAP = Object.freeze({
    instagram: 'Instagram',
    tiktok: 'TikTok',
    facebook: 'Facebook'
  });
  const PACKAGE_QUERY_MAP = Object.freeze({
    '10000': '10,000 followers — reference offer $100'
  });
  const SERVICE_QUERY_MAP = Object.freeze({
    prime: 'Prime Video',
    apple: 'Apple TV+'
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, minimum, maximum) => Math.min(Math.max(value, minimum), maximum);
  const prefersReducedMotion = typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  const feedbackByForm = new WeakMap();

  const safeInit = initializer => {
    try {
      initializer();
    } catch {
      // Keep unrelated page features working if an optional component is malformed.
    }
  };

  const listen = (target, type, handler, options) => {
    if (!target?.addEventListener) return;
    target.addEventListener(type, event => {
      try {
        handler(event);
      } catch {
        // Do not expose form values or allow one handler to stop later interactions.
      }
    }, options);
  };

  const normalizeUnicode = value => {
    const stringValue = String(value ?? '');
    try {
      return stringValue.normalize('NFC');
    } catch {
      return stringValue;
    }
  };

  const stripControlCharacters = value => normalizeUnicode(value)
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, '');

  const limitText = (value, maximum) => {
    const characters = Array.from(value);
    if (characters.length <= maximum) return value;
    return `${characters.slice(0, Math.max(0, maximum - 1)).join('')}…`;
  };

  const cleanSingleLine = (value, maximum = 500) => limitText(
    stripControlCharacters(value)
      .replace(/[\r\n\t]+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim(),
    maximum
  );

  const cleanMultiLine = (value, maximum = 1200) => limitText(
    stripControlCharacters(value)
      .replace(/\r\n?/g, '\n')
      .replace(/[^\S\n]+/g, ' ')
      .replace(/ *\n */g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
    maximum
  );

  const getNamedControls = (form, name) => [...form.elements]
    .filter(control => control.name === name);

  const getFieldValue = (form, name, options = {}) => {
    const rawValue = new FormData(form).get(name);
    const value = typeof rawValue === 'string' ? rawValue : '';
    return options.multiline
      ? cleanMultiLine(value, options.maximum)
      : cleanSingleLine(value, options.maximum);
  };

  const selectRadioByValue = (form, name, expectedValue) => {
    if (!expectedValue) return false;
    const radio = getNamedControls(form, name)
      .find(control => control.type === 'radio' && control.value === expectedValue);
    if (!radio) return false;
    radio.checked = true;
    return true;
  };

  const getQueryToken = name => {
    try {
      const rawValue = new URL(window.location.href).searchParams.get(name);
      if (!rawValue || rawValue.length > 40) return '';
      const token = rawValue.trim().toLowerCase();
      return /^[a-z0-9]+$/.test(token) ? token : '';
    } catch {
      return '';
    }
  };

  const setLengthConstraints = (form, name, minimum, maximum) => {
    getNamedControls(form, name).forEach(control => {
      if (typeof minimum === 'number') control.minLength = minimum;
      if (typeof maximum === 'number') control.maxLength = maximum;
    });
  };

  const validatePhone = input => {
    if (!input) return true;
    input.setCustomValidity('');
    const value = cleanSingleLine(input.value, 24);
    input.value = value;
    if (!value) return true;
    const digits = value.replace(/\D/g, '');
    const validCharacters = /^\+?[0-9][0-9\s().-]*[0-9]$/.test(value);
    const validLength = digits.length >= 7 && digits.length <= 15;
    if (!validCharacters || !validLength) {
      input.setCustomValidity('Enter a valid WhatsApp number, including the country code.');
      return false;
    }
    return true;
  };

  const validateHttpsUrl = input => {
    if (!input) return true;
    input.setCustomValidity('');
    const value = cleanSingleLine(input.value, 500);
    input.value = value;
    if (!value) return true;
    try {
      const parsed = new URL(value);
      const isValid = parsed.protocol === 'https:'
        && parsed.hostname.includes('.')
        && !parsed.username
        && !parsed.password;
      if (!isValid) throw new TypeError('Invalid public URL');
      return true;
    } catch {
      input.setCustomValidity('Enter a complete public HTTPS profile or page link.');
      return false;
    }
  };

  const configureFormConstraints = (form, options = {}) => {
    setLengthConstraints(form, 'name', 2, 80);
    setLengthConstraints(form, 'phone', 7, 24);
    setLengthConstraints(form, 'notes', 0, 500);
    setLengthConstraints(form, 'message', 10, 1000);
    setLengthConstraints(form, 'profileLink', 8, 500);

    const phone = getNamedControls(form, 'phone')[0];
    if (phone) {
      phone.setAttribute('inputmode', 'tel');
      phone.setAttribute('autocomplete', 'tel');
      listen(phone, 'input', () => phone.setCustomValidity(''));
      listen(phone, 'blur', () => validatePhone(phone));
    }

    const profileLink = getNamedControls(form, 'profileLink')[0];
    if (profileLink) {
      profileLink.setAttribute('inputmode', 'url');
      profileLink.setAttribute('autocomplete', 'url');
      listen(profileLink, 'input', () => profileLink.setCustomValidity(''));
      listen(profileLink, 'blur', () => validateHttpsUrl(profileLink));
    }

    if (options.customTarget) {
      const customTarget = getNamedControls(form, 'customTarget')[0];
      if (customTarget) {
        customTarget.min = customTarget.min || '100';
        customTarget.step = customTarget.step || '100';
      }
    }
  };

  const normalizeFormControls = form => {
    [...form.elements].forEach(control => {
      if (!('value' in control)) return;
      if (control.tagName === 'TEXTAREA') {
        const maximum = control.maxLength > 0 ? control.maxLength : 1200;
        control.value = cleanMultiLine(control.value, maximum);
        return;
      }
      if (control.tagName !== 'INPUT') return;
      if (!['text', 'tel', 'url', 'email', 'search'].includes(control.type)) return;
      const maximum = control.maxLength > 0 ? control.maxLength : 500;
      control.value = cleanSingleLine(control.value, maximum);
    });
  };

  const validateSpecialFields = form => {
    const phone = getNamedControls(form, 'phone')[0];
    const profileLink = getNamedControls(form, 'profileLink')[0];
    const phoneValid = validatePhone(phone);
    const profileValid = validateHttpsUrl(profileLink);
    return phoneValid && profileValid;
  };

  const createFeedbackHooks = form => {
    const status = document.createElement('p');
    status.dataset.formStatus = '';
    status.className = 'form-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;

    const fallback = document.createElement('a');
    fallback.dataset.formFallback = '';
    fallback.className = 'button button-secondary form-fallback';
    fallback.textContent = 'Open WhatsApp';
    fallback.target = '_blank';
    fallback.rel = 'noopener noreferrer';
    fallback.hidden = true;

    form.append(status, fallback);
    return { status, fallback };
  };

  const getFeedbackHooks = form => {
    if (feedbackByForm.has(form)) return feedbackByForm.get(form);

    let status = $('[data-form-status]', form);
    let fallback = $('[data-form-fallback]', form);
    if (!status || !fallback) {
      const created = createFeedbackHooks(form);
      status ||= created.status;
      fallback ||= created.fallback;
      if (created.status !== status) created.status.remove();
      if (created.fallback !== fallback) created.fallback.remove();
    }

    status.setAttribute('role', status.getAttribute('role') || 'status');
    status.setAttribute('aria-live', status.getAttribute('aria-live') || 'polite');
    fallback.setAttribute('target', '_blank');
    fallback.setAttribute('rel', 'noopener noreferrer');
    feedbackByForm.set(form, { status, fallback });
    return { status, fallback };
  };

  const clearFormFeedback = form => {
    const { status, fallback } = getFeedbackHooks(form);
    status.textContent = '';
    status.hidden = true;
    fallback.hidden = true;
    fallback.removeAttribute('href');
  };

  const showFormStatus = (form, message) => {
    const { status } = getFeedbackHooks(form);
    status.textContent = message;
    status.hidden = false;
  };

  const showWhatsAppFallback = (form, url) => {
    const { status, fallback } = getFeedbackHooks(form);
    status.textContent = 'WhatsApp could not open automatically. Use the link below to continue.';
    status.hidden = false;
    fallback.href = url;
    fallback.hidden = false;
    window.requestAnimationFrame(() => fallback.focus());
  };

  const prepareWhatsAppMessage = message => {
    const normalized = cleanMultiLine(message, MAX_WHATSAPP_MESSAGE_LENGTH);
    const prepared = normalized.length ? normalized : 'Hello 97.world, I need assistance.';
    if (`${WHATSAPP_URL_PREFIX}${encodeURIComponent(prepared)}`.length <= MAX_WHATSAPP_URL_LENGTH) {
      return prepared;
    }

    const characters = Array.from(prepared);
    let lowerBound = 0;
    let upperBound = characters.length;
    while (lowerBound < upperBound) {
      const midpoint = Math.ceil((lowerBound + upperBound) / 2);
      const candidate = `${characters.slice(0, midpoint).join('').trimEnd()}${WHATSAPP_SHORTENED_MARKER}`;
      const candidateLength = `${WHATSAPP_URL_PREFIX}${encodeURIComponent(candidate)}`.length;
      if (candidateLength <= MAX_WHATSAPP_URL_LENGTH) {
        lowerBound = midpoint;
      } else {
        upperBound = midpoint - 1;
      }
    }

    return `${characters.slice(0, lowerBound).join('').trimEnd()}${WHATSAPP_SHORTENED_MARKER}`;
  };

  const openWhatsApp = (form, message) => {
    const preparedMessage = prepareWhatsAppMessage(message);
    const url = `${WHATSAPP_URL_PREFIX}${encodeURIComponent(preparedMessage)}`;
    let popup = null;

    try {
      popup = window.open(url, '_blank');
      if (popup) popup.opener = null;
    } catch {
      popup = null;
    }

    if (!popup) {
      showWhatsAppFallback(form, url);
      return false;
    }

    const { status, fallback } = getFeedbackHooks(form);
    fallback.hidden = true;
    fallback.removeAttribute('href');
    status.textContent = 'WhatsApp opened in a new tab. Your details remain on this page.';
    status.hidden = false;
    return true;
  };

  const bindWhatsAppForm = (form, buildMessage, options = {}) => {
    configureFormConstraints(form, options);
    listen(form, 'input', () => clearFormFeedback(form));
    listen(form, 'submit', event => {
      event.preventDefault();
      clearFormFeedback(form);
      normalizeFormControls(form);
      validateSpecialFields(form);

      if (!form.reportValidity()) {
        showFormStatus(form, 'Check the highlighted fields, then try again.');
        return;
      }

      const message = buildMessage();
      openWhatsApp(form, message);
    });
  };

  safeInit(() => {
    $$('[data-year]').forEach(element => {
      element.textContent = new Date().getFullYear();
    });
  });

  safeInit(() => {
    const header = $('[data-header]');
    if (!header) return;
    let scheduled = false;
    const update = () => {
      scheduled = false;
      header.classList.toggle('scrolled', window.scrollY > 24);
    };
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(update);
    };
    update();
    listen(window, 'scroll', schedule, { passive: true });
  });

  safeInit(() => {
    const floatingWhatsApp = $('.floating-whatsapp');
    const heroPrimaryCta = $('.hero-actions .button');
    if (!floatingWhatsApp || !heroPrimaryCta || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (entry) floatingWhatsApp.classList.toggle('is-suppressed', entry.isIntersecting);
    }, { threshold: 0.15 });
    observer.observe(heroPrimaryCta);
  });

  safeInit(() => {
    const menuButton = $('[data-menu-button]');
    const mobileNav = $('[data-mobile-nav]');
    if (!menuButton || !mobileNav) return;

    const isOpen = () => menuButton.getAttribute('aria-expanded') === 'true';
    const visibleFocusableElements = () => [
      menuButton,
      ...$$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', mobileNav)
    ].filter((element, index, elements) => (
      elements.indexOf(element) === index
      && !element.hasAttribute('hidden')
      && element.getAttribute('aria-hidden') !== 'true'
    ));

    const setMenuState = (open, returnFocus = false) => {
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      mobileNav.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);

      if (open) {
        const firstLink = $('a[href]', mobileNav);
        window.setTimeout(() => firstLink?.focus(), prefersReducedMotion.matches ? 0 : 120);
      } else if (returnFocus) {
        menuButton.focus();
      }
    };

    listen(menuButton, 'click', () => setMenuState(!isOpen()));
    $$('a[href]', mobileNav).forEach(link => {
      listen(link, 'click', () => setMenuState(false));
    });
    listen(window, 'resize', () => {
      if (getComputedStyle(menuButton).display === 'none' && isOpen()) {
        setMenuState(false);
      }
    }, { passive: true });
    listen(document, 'keydown', event => {
      if (!isOpen()) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuState(false, true);
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = visibleFocusableElements();
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
    });
  });

  safeInit(() => {
    const revealElements = [...new Set([
      ...$$('.reveal'),
      ...$$('[data-reveal]')
    ])];
    revealElements.forEach(element => element.classList.add('reveal'));

    $$('[data-stagger], [data-reveal-stagger]').forEach(group => {
      const rawInterval = group.getAttribute('data-stagger')
        || group.getAttribute('data-reveal-stagger')
        || '80';
      const interval = clamp(Number.parseInt(rawInterval, 10) || 80, 0, 250);
      const children = [...group.querySelectorAll('.reveal, [data-reveal]')];
      children.forEach((element, index) => {
        element.classList.add('reveal');
        const delay = Math.min(index * interval, 1000);
        element.style.setProperty('--reveal-delay', `${delay}ms`);
      });
    });

    revealElements.forEach(element => {
      const explicitDelay = Number.parseInt(element.dataset.revealDelay, 10);
      if (Number.isFinite(explicitDelay)) {
        element.style.setProperty('--reveal-delay', `${clamp(explicitDelay, 0, 1000)}ms`);
      }
    });

    if (prefersReducedMotion.matches || !('IntersectionObserver' in window)) {
      revealElements.forEach(element => element.classList.add('visible'));
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: '0px 0px -4% 0px'
    });
    revealElements.forEach(element => observer.observe(element));
  });

  safeInit(() => {
    const elements = $$('[data-parallax]');
    if (!elements.length) return;

    const clearVariables = () => {
      elements.forEach(element => {
        element.style.removeProperty('--parallax-y');
        element.style.removeProperty('--parallax-progress');
      });
    };

    let frame = 0;
    const update = () => {
      frame = 0;
      if (prefersReducedMotion.matches) {
        clearVariables();
        return;
      }

      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
      const viewportCenter = viewportHeight / 2;
      elements.forEach(element => {
        const rect = element.getBoundingClientRect();
        if (rect.bottom < -viewportHeight * 0.25 || rect.top > viewportHeight * 1.25) return;
        const rawStrength = Number.parseFloat(element.dataset.parallax);
        const strength = clamp(Number.isFinite(rawStrength) ? rawStrength : 18, -48, 48);
        const elementCenter = rect.top + rect.height / 2;
        const progress = clamp(
          (viewportCenter - elementCenter) / Math.max(viewportHeight + rect.height, 1),
          -1,
          1
        );
        element.style.setProperty('--parallax-progress', progress.toFixed(4));
        element.style.setProperty('--parallax-y', `${(progress * strength).toFixed(2)}px`);
      });
    };

    const schedule = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(update);
    };

    listen(window, 'scroll', schedule, { passive: true });
    listen(window, 'resize', schedule, { passive: true });
    if (prefersReducedMotion.addEventListener) {
      listen(prefersReducedMotion, 'change', schedule);
    } else if (prefersReducedMotion.addListener) {
      prefersReducedMotion.addListener(schedule);
    }
    update();
  });

  safeInit(() => {
    const animateCounter = element => {
      const target = Number(element.dataset.counter || 0);
      if (!Number.isFinite(target) || target <= 0 || element.dataset.animated === 'true') return;
      element.dataset.animated = 'true';

      if (prefersReducedMotion.matches) {
        element.textContent = Math.round(target).toLocaleString();
        return;
      }

      const started = performance.now();
      const duration = 1100;
      const tick = now => {
        const progress = Math.min((now - started) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        element.textContent = Math.round(target * eased).toLocaleString();
        if (progress < 1) window.requestAnimationFrame(tick);
      };
      window.requestAnimationFrame(tick);
    };

    const elements = $$('[data-counter]');
    if (!('IntersectionObserver' in window)) {
      elements.forEach(animateCounter);
      return;
    }

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.7 });
    elements.forEach(element => observer.observe(element));
  });

  safeInit(() => {
    const form = $('#follower-order-form');
    if (!form) return;

    selectRadioByValue(form, 'platform', PLATFORM_QUERY_MAP[getQueryToken('platform')]);
    selectRadioByValue(form, 'package', PACKAGE_QUERY_MAP[getQueryToken('package')]);

    const mobileOrderBar = $('[data-mobile-order-bar]');
    if (mobileOrderBar) {
      document.body.classList.add('has-mobile-order-bar');
      const syncKeyboardState = () => {
        const viewport = window.visualViewport;
        const keyboardOpen = Boolean(viewport && viewport.height < window.innerHeight * 0.72);
        document.body.classList.toggle('keyboard-open', keyboardOpen);
      };
      if (window.visualViewport) {
        listen(window.visualViewport, 'resize', syncKeyboardState, { passive: true });
      }
      syncKeyboardState();
    }

    const customField = $('.custom-target-field', form);
    const customInput = getNamedControls(form, 'customTarget')[0];
    const summary = {
      platform: $('[data-summary-platform]'),
      package: $('[data-summary-package]'),
      account: $('[data-summary-account]'),
      delivery: $('[data-summary-delivery]')
    };

    const updateFollowerSummary = () => {
      const selectedPackage = getFieldValue(form, 'package', { maximum: 100 });
      const customTarget = getFieldValue(form, 'customTarget', { maximum: 12 });
      const isCustom = selectedPackage === 'Custom follower target';
      if (customField) customField.hidden = !isCustom;
      if (customInput) customInput.required = isCustom;
      if (summary.platform) {
        summary.platform.textContent = getFieldValue(form, 'platform', { maximum: 30 }) || 'Not selected';
      }
      if (summary.package) {
        const numericTarget = Number(customTarget);
        summary.package.textContent = isCustom && Number.isFinite(numericTarget) && numericTarget > 0
          ? `${numericTarget.toLocaleString()} followers`
          : (selectedPackage || 'Not selected');
      }
      if (summary.account) {
        summary.account.textContent = getFieldValue(form, 'profileLink', { maximum: 500 }) || 'Not added';
      }
      if (summary.delivery) {
        summary.delivery.textContent = getFieldValue(form, 'delivery', { maximum: 80 }) || 'Not selected';
      }
    };

    const mobileOrderLabel = $('[data-mobile-order-label]');
    const updateMobileOrderBar = () => {
      if (!mobileOrderLabel) return;
      const platform = getFieldValue(form, 'platform', { maximum: 30 });
      const selectedPackage = getFieldValue(form, 'package', { maximum: 100 });
      const packageLabel = selectedPackage.split(' — ')[0];
      mobileOrderLabel.textContent = platform
        ? `${platform}${selectedPackage ? ` · ${packageLabel}` : ' · choose a target'}`
        : 'Choose a platform to begin';
    };

    listen(form, 'input', updateFollowerSummary);
    listen(form, 'change', () => {
      updateFollowerSummary();
      updateMobileOrderBar();
    });
    updateFollowerSummary();
    updateMobileOrderBar();

    const mobileOrderSubmit = $('[data-mobile-order-submit]');
    listen(mobileOrderSubmit, 'click', () => {
      normalizeFormControls(form);
      validateSpecialFields(form);
      const firstMissing = $('input:invalid, select:invalid, textarea:invalid', form);
      if (firstMissing) {
        firstMissing.closest('.form-step')?.scrollIntoView({
          behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
          block: 'start'
        });
        window.setTimeout(() => firstMissing.focus(), prefersReducedMotion.matches ? 0 : 350);
        return;
      }
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        const submitButton = $('[type="submit"]', form);
        submitButton?.click();
      }
    });

    bindWhatsAppForm(form, () => {
      const selectedPackage = getFieldValue(form, 'package', { maximum: 100 });
      const customTarget = Number(getFieldValue(form, 'customTarget', { maximum: 12 }));
      const target = selectedPackage === 'Custom follower target'
        ? `${Number.isFinite(customTarget) ? customTarget.toLocaleString() : ''} followers (custom target)`
        : selectedPackage;
      return [
        'Hello 97.world, I want to place a follower growth order.',
        '',
        `Platform: ${getFieldValue(form, 'platform', { maximum: 30 })}`,
        `Target: ${target}`,
        `Profile/page: ${getFieldValue(form, 'profileLink', { maximum: 500 })}`,
        `Country: ${getFieldValue(form, 'country', { maximum: 80 })}`,
        `Preferred delivery: ${getFieldValue(form, 'delivery', { maximum: 80 })}`,
        `Name: ${getFieldValue(form, 'name', { maximum: 80 })}`,
        `My WhatsApp: ${getFieldValue(form, 'phone', { maximum: 24 })}`,
        getFieldValue(form, 'notes', { multiline: true, maximum: 500 })
          ? `Notes: ${getFieldValue(form, 'notes', { multiline: true, maximum: 500 })}`
          : '',
        '',
        'Please check the account and confirm availability, final price and delivery details.'
      ].filter(Boolean).join('\n');
    }, { customTarget: true });
  });

  safeInit(() => {
    const form = $('#streaming-order-form');
    if (!form) return;

    selectRadioByValue(form, 'service', SERVICE_QUERY_MAP[getQueryToken('service')]);
    bindWhatsAppForm(form, () => {
      const notes = getFieldValue(form, 'notes', { multiline: true, maximum: 500 });
      return [
        'Hello 97.world, I want streaming support.',
        '',
        `Service: ${getFieldValue(form, 'service', { maximum: 40 })}`,
        `Duration: ${getFieldValue(form, 'duration', { maximum: 40 })}`,
        `Devices: ${getFieldValue(form, 'devices', { maximum: 40 })}`,
        `Country: ${getFieldValue(form, 'country', { maximum: 80 })}`,
        `Main device: ${getFieldValue(form, 'deviceType', { maximum: 80 })}`,
        `Name: ${getFieldValue(form, 'name', { maximum: 80 })}`,
        `My WhatsApp: ${getFieldValue(form, 'phone', { maximum: 24 })}`,
        notes ? `Notes: ${notes}` : '',
        '',
        'Please confirm compatibility, package availability and final price.'
      ].filter(Boolean).join('\n');
    });
  });

  safeInit(() => {
    const form = $('#contact-form');
    if (!form) return;

    bindWhatsAppForm(form, () => [
      'Hello 97.world, I need support.',
      '',
      `Name: ${getFieldValue(form, 'name', { maximum: 80 })}`,
      `My WhatsApp: ${getFieldValue(form, 'phone', { maximum: 24 })}`,
      `Topic: ${getFieldValue(form, 'topic', { maximum: 80 })}`,
      `Message: ${getFieldValue(form, 'message', { multiline: true, maximum: 1000 })}`
    ].join('\n'));
  });
})();
