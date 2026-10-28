(() => {
  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#primary-nav');
  if (menuButton && nav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      nav.classList.toggle('is-open', open);
    });
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a') && window.matchMedia('(max-width: 760px)').matches) {
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation');
        nav.classList.remove('is-open');
      }
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && nav.classList.contains('is-open')) {
        nav.classList.remove('is-open');
        menuButton.setAttribute('aria-expanded', 'false');
        menuButton.setAttribute('aria-label', 'Open navigation');
        menuButton.focus();
      }
    });
  }

  const form = document.querySelector('#estimate-form');
  if (!form) return;

  const steps = [...form.querySelectorAll('[data-form-step]')];
  const indicators = [...document.querySelectorAll('[data-step-indicator]')];
  const status = document.querySelector('#form-status');
  const commercialDetails = form.querySelector('.conditional-commercial');
  const fileInput = form.querySelector('#attachments');
  const selectedFiles = form.querySelector('#selected-files');
  let currentStep = 1;

  const setStep = (step) => {
    currentStep = step;
    steps.forEach((node) => {
      const isCurrent = Number(node.dataset.formStep) === step;
      node.hidden = !isCurrent;
      node.classList.toggle('is-active', isCurrent);
    });
    indicators.forEach((node) => {
      const isCurrent = Number(node.dataset.stepIndicator) === step;
      node.classList.toggle('is-active', isCurrent);
      if (isCurrent) node.setAttribute('aria-current', 'step');
      else node.removeAttribute('aria-current');
    });
    const firstControl = steps[step - 1]?.querySelector('input:not([type=radio]),select,textarea,input[type=radio]');
    firstControl?.focus({ preventScroll: true });
  };

  const updateConditionalFields = () => {
    const selected = form.querySelector('input[name="projectType"]:checked')?.value || '';
    const show = ['commercial', 'construction', 'multifamily'].includes(selected);
    if (commercialDetails) commercialDetails.hidden = !show;
  };

  const reportError = (name, message) => {
    const target = form.querySelector(`[data-error-for="${name}"]`);
    if (target) target.textContent = message;
  };

  const validateStep = (stepNumber) => {
    const step = steps[stepNumber - 1];
    if (!step) return false;
    let firstInvalid = null;
    let valid = true;
    step.querySelectorAll('[data-error-for]').forEach((node) => { node.textContent = ''; });
    if (stepNumber === 1) {
      const checked = form.querySelector('input[name="projectType"]:checked');
      if (!checked) {
        reportError('projectType', 'Choose the project type that best fits.');
        firstInvalid = form.querySelector('input[name="projectType"]');
        valid = false;
      }
    } else {
      const required = [...step.querySelectorAll('[required]')].filter((field) => !field.closest('[hidden]'));
      required.forEach((field) => {
        const name = field.name;
        if (!field.value.trim()) {
          reportError(name, 'Please complete this field.');
          firstInvalid ||= field;
          valid = false;
          return;
        }
        if (!field.checkValidity()) {
          reportError(name, name === 'email' ? 'Enter a valid email address.' : 'Check this field and try again.');
          firstInvalid ||= field;
          valid = false;
        }
      });
      if (stepNumber === 3) {
        const phone = form.elements.namedItem('phone');
        const digits = phone?.value.replace(/\D/g, '') || '';
        if (digits.length < 7) {
          reportError('phone', 'Enter a phone number with at least 7 digits.');
          firstInvalid ||= phone;
          valid = false;
        }
      }
    }
    if (!valid && firstInvalid) firstInvalid.focus();
    return valid;
  };

  form.querySelectorAll('input[name="projectType"]').forEach((radio) => {
    radio.addEventListener('change', updateConditionalFields);
  });

  const preset = new URLSearchParams(window.location.search);
  const requestedType = preset.get('type');
  const requestedArea = preset.get('area');
  const requestedService = preset.get('service');
  if (requestedType) {
    const match = form.querySelector(`input[name="projectType"][value="${CSS.escape(requestedType)}"]`);
    if (match) match.checked = true;
  }
  updateConditionalFields();
  if (requestedArea) {
    const option = [...form.elements.namedItem('location').options].find((item) => item.value.toLowerCase().includes(requestedArea.toLowerCase()));
    if (option) option.selected = true;
  }
  if (requestedService) {
    const option = [...form.elements.namedItem('service').options].find((item) => item.dataset.serviceSlug === requestedService);
    if (option) option.selected = true;
  }

  form.querySelectorAll('[data-next-step]').forEach((button) => {
    button.addEventListener('click', () => {
      if (validateStep(currentStep)) setStep(Math.min(currentStep + 1, 3));
    });
  });
  form.querySelectorAll('[data-previous-step]').forEach((button) => {
    button.addEventListener('click', () => setStep(Math.max(currentStep - 1, 1)));
  });

  fileInput?.addEventListener('change', () => {
    const names = [...(fileInput.files || [])].map((file) => file.name);
    if (selectedFiles) selectedFiles.textContent = names.length ? `Selected locally: ${names.join(', ')}` : '';
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!validateStep(3)) return;
    if (status) {
      status.hidden = true;
      status.replaceChildren();
    }
    const values = new FormData(form);
    const type = form.querySelector('input[name="projectType"]:checked');
    const labels = {
      commercial: 'Commercial property', construction: 'New construction', multifamily: 'Multi-family building',
      residential: 'Residential repair', renovation: 'Kitchen or bathroom renovation', other: 'Other plumbing project'
    };
    const fileNames = [...(fileInput?.files || [])].map((file) => file.name);
    const lines = [
      `Project type: ${labels[type?.value] || type?.value || ''}`,
      `Service: ${values.get('service') || ''}`,
      `Property location: ${values.get('location') || ''}`,
      `Timing: ${values.get('urgency') || ''}`,
      `Preferred contact time: ${values.get('preferredContact') || ''}`,
      `Approximate scope: ${values.get('scope') || ''}`,
      `Commercial / building details: ${values.get('commercialDetails') || 'Not provided'}`,
      `Name: ${values.get('name') || ''}`,
      `Phone: ${values.get('phone') || ''}`,
      `Email: ${values.get('email') || ''}`,
      `Project description: ${values.get('description') || ''}`,
      `Selected files (attach manually): ${fileNames.length ? fileNames.join(', ') : 'None'}`,
      '',
      'This message was prepared from the Tap Plumbing Corp redesign estimate prototype. Please review and send it yourself.'
    ];
    const subject = `Plumbing estimate request — ${values.get('location') || 'project enquiry'}`;
    const mailto = `mailto:Office@tapplumbingcorp.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
    const heading = document.createElement('strong');
    heading.textContent = 'Your email draft is ready.';
    const message = document.createElement('p');
    message.textContent = 'The request has not been sent to Tap Plumbing Corp and no appointment is confirmed. Open the draft, attach any selected files, review the details, and send it from your email app.';
    const send = document.createElement('a');
    send.className = 'button button-primary';
    send.href = mailto;
    send.textContent = 'Open email draft';
    const fallback = document.createElement('p');
    fallback.className = 'status-warning';
    fallback.textContent = 'If your email app does not open, call 718-337-8749 or email Office@tapplumbingcorp.com directly.';
    status?.append(heading, message, send, fallback);
    if (status) {
      status.hidden = false;
      status.focus?.();
    }
    status?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });
})();
