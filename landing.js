document.addEventListener('DOMContentLoaded', () => {
  // 1. Mobile Menu Toggle
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const navMenu = document.getElementById('nav-menu');

  if (menuToggle && navMenu) {
    menuToggle.addEventListener('click', () => {
      navMenu.classList.toggle('open');
      menuToggle.textContent = navMenu.classList.contains('open') ? '✕' : '☰';
    });
  }

  // 2. Auto Year in Footer
  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  // 3. Scroll Reveal Animation (Intersection Observer)
  const revealElements = document.querySelectorAll('.scroll-reveal');

  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    },
    {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px',
    }
  );

  revealElements.forEach((el) => revealObserver.observe(el));

  // 4. Mouse-tracking Spotlight Effect on Bento Cards
  const cards = document.querySelectorAll('.spotlight-card');

  cards.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  });

  // 5. Number Counter Animation
  const counters = document.querySelectorAll('.counter');

  const counterObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const target = entry.target;
          const targetNumber = parseInt(target.getAttribute('data-target'), 10);
          const prefix = target.getAttribute('data-prefix') || '';
          const suffix = target.getAttribute('data-suffix') || '';
          const duration = 2000;
          const fps = 60;
          const frames = duration / (1000 / fps);
          const increment = targetNumber / frames;

          let currentNumber = 0;

          const updateCounter = () => {
            currentNumber += increment;
            if (currentNumber < targetNumber) {
              target.textContent = `${prefix}${Math.ceil(currentNumber)}${suffix}`;
              requestAnimationFrame(updateCounter);
            } else {
              target.textContent = `${prefix}${targetNumber}${suffix}`;
            }
          };

          requestAnimationFrame(updateCounter);
          observer.unobserve(target);
        }
      });
    },
    { threshold: 0.5 }
  );

  counters.forEach((counter) => counterObserver.observe(counter));

  // 6. Typewriter Effect for Hero Text
  const typewriterText = document.querySelector('.typewriter-text');
  if (typewriterText) {
    const textHtml = typewriterText.innerHTML;
    // Replace <br> with a special token to handle line breaks correctly
    const textToType = textHtml.replace(/<br>/gi, '||');
    typewriterText.innerHTML = '';

    let i = 0;
    const speed = 50; // ms per char

    function typeWriter() {
      if (i < textToType.length) {
        if (textToType.slice(i, i + 2) === '||') {
          typewriterText.innerHTML += '<br>';
          i += 2;
        } else {
          typewriterText.innerHTML += textToType.charAt(i);
          i++;
        }
        setTimeout(typeWriter, speed);
      }
    }

    setTimeout(typeWriter, 500);
  }

  // 7. Typewriter Effect for Mock Code Block
  const typewriterCode = document.querySelector('.typewriter-code');
  if (typewriterCode) {
    const codeText = typewriterCode.textContent;
    typewriterCode.textContent = '';

    let i = 0;
    const speed = 100; // ms per char

    function typeCode() {
      if (i < codeText.length) {
        typewriterCode.textContent += codeText.charAt(i);
        i++;
        setTimeout(typeCode, speed);
      }
    }

    // Start slightly after the main hero text
    setTimeout(typeCode, 1500);
  }
});
