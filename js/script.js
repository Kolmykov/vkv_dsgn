// Браузер по умолчанию восстанавливает прежнюю позицию скролла при
// обновлении страницы (F5) — отключаем это и всегда стартуем с самого
// верха (hero), а не с того места, где нажали "обновить".
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Печатающийся текст заголовка hero: печатает фразу по одному символу
// каждые ~55мс, курсор (.caret) продолжает мигать на месте после того,
// как печать закончилась. Подзаголовок ("3 года в дизайне...") появляется
// только когда печать полностью закончена, а следом за ним — аватарка и имя
// с ролью. Запускается из revealHero(), когда очередь доходит до hero-offer.
function startTypewriter() {
  var textEl = document.getElementById('hero-title-text');
  if (!textEl) return;

  var subtitleEl = document.querySelector('.hero-offer__subtitle');
  var fullText = 'Дизайн, который решает задачи бизнеса';
  var CHAR_DELAY = 55;
  var i = 0;

  function typeNext() {
    textEl.textContent = fullText.slice(0, i);
    if (i >= fullText.length) {
      if (subtitleEl) subtitleEl.classList.add('is-visible');
      // Пауза, чтобы подзаголовок успел "прочитаться", затем фото и следом,
      // с заметной паузой, имя с ролью — глазу есть за что зацепиться.
      setTimeout(function () {
        staggerReveal(['.brand-avatar', '.brand-identity'], 500, function (el, selector) {
          if (selector !== '.brand-identity') return;
          // Автоцикл decoder-эффекта запускаем только когда блок с ролью
          // реально закончил проявляться (его transition — 1.1s, см.
          // .js-reveal--slow), а не одновременно с началом fade-in.
          setTimeout(function () {
            var link = document.querySelector('.fx-decoder');
            if (link) link.classList.add('is-ready');
          }, 1100);
        });
      }, 400);
      return;
    }
    i++;
    setTimeout(typeNext, CHAR_DELAY);
  }

  typeNext();
}

// Общий помощник: проявляет элементы по списку селекторов один за другим
// с шагом stepMs (добавляет им класс is-visible), а не все разом.
function staggerReveal(selectors, stepMs, onEach) {
  selectors.forEach(function (selector, i) {
    var el = typeof selector === 'string' ? document.querySelector(selector) : selector;
    if (!el) return;
    setTimeout(function () {
      el.classList.add('is-visible');
      if (onEach) onEach(el, selector, i);
    }, i * stepMs);
  });
}

// Последовательное появление контента hero после того, как лоадер полностью
// раскрылся: элементы проявляются (blur+fade) по очереди, а не все разом —
// в духе плавных построчных reveal-анимаций (ориентир: kei-inc.jp).
function revealHero() {
  var order = [
    '.brand-letter-pos--v-left',
    '.header-nav__item--projects',
    '.header-nav__item--active',
    '.header-nav__item--about',
    '.header-nav__item--contacts',
    '.brand-letter-pos--k',
    '.brand-letter-pos--v-right',
    '.hero-offer',
  ];

  staggerReveal(order, 100, function (el, selector) {
    if (selector === '.hero-offer') {
      startTypewriter();
    }
  });
}

// Появление остальных секций (projects/about/footer) при скролле: пока
// hero доигрывает свою анимацию после лоадера, всё остальное ждёт своей
// очереди и появляется только когда блок реально доезжает до вьюпорта —
// тем же способом, что на kei-inc.jp (IntersectionObserver, один раз).
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.js-scroll-reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  // Линия над каждым фактом "чертится" 0.9s (см. .fact-item::before в css) —
  // шаг между фактами должен быть не меньше этого, иначе линии рисуются
  // одновременно, а не по очереди одна за другой.
  var FACT_LINE_DURATION = 900;
  var FACT_TEXT_FADE_DURATION = 500;
  var FACT_ITEMS_START_DELAY = 300;
  var FACT_ITEMS_COUNT = document.querySelectorAll('.fact-item').length;
  // Момент, когда полностью проявится последний факт ("Методы"): линии
  // чертятся по очереди с шагом FACT_LINE_DURATION, у последней текст
  // начинает проявляться сразу как она дочерчена (transition-delay в css
  // совпадает с FACT_LINE_DURATION) и занимает ещё FACT_TEXT_FADE_DURATION.
  var ABOUT_FACTS_TOTAL_DURATION =
    FACT_ITEMS_START_DELAY +
    (FACT_ITEMS_COUNT - 1) * FACT_LINE_DURATION +
    FACT_LINE_DURATION +
    FACT_TEXT_FADE_DURATION;

  // Футер (линия и весь контент) не должен проявляться раньше, чем
  // полностью прогрузится блок "Обо мне" — иначе при быстром скролле футер
  // "обгоняет" ещё не дочерченные факты. afterAboutFacts() либо выполняет
  // колбэк сразу (если "Обо мне" уже полностью показан), либо откладывает
  // его до этого момента.
  var aboutFactsDoneAt = null;
  var aboutFactsWaiters = [];

  function markAboutFactsDone() {
    if (aboutFactsDoneAt !== null) return;
    aboutFactsDoneAt = true;
    aboutFactsWaiters.forEach(function (cb) {
      cb();
    });
    aboutFactsWaiters = [];
  }

  function afterAboutFacts(cb) {
    if (aboutFactsDoneAt !== null) {
      cb();
      return;
    }
    aboutFactsWaiters.push(cb);
    // Предохранитель: если секцию "Обо мне" почему-то не показали (например,
    // сразу перешли в футер по ссылке "Контакты"), не блокируем футер навсегда.
    setTimeout(markAboutFactsDone, 6000);
  }

  var groups = [
    {
      trigger: '.projects',
      targets: [
        '.projects__head',
        '.projects__list .card:nth-child(1)',
        '.projects__list .card:nth-child(2)',
        '.projects__list .card:nth-child(3)',
        '.projects__list .card:nth-child(4)',
      ],
    },
    {
      trigger: '.about',
      onEnter: function () {
        staggerReveal(['.about__title', '.about__lead'], 150);
        var factItems = Array.prototype.slice.call(document.querySelectorAll('.fact-item'));
        // Заголовок и текст проявляются сразу, а линии над фактами ждут
        // своей очереди и чертятся строго одна за другой, без наложения.
        setTimeout(function () {
          staggerReveal(factItems, FACT_LINE_DURATION);
        }, FACT_ITEMS_START_DELAY);
        // Как только полностью проявится последний факт ("Методы") — можно
        // показывать футер (см. afterAboutFacts ниже).
        setTimeout(markAboutFactsDone, ABOUT_FACTS_TOTAL_DURATION);
      },
    },
    {
      trigger: '.footer',
      onEnter: function () {
        // Футер не должен обгонять ещё не дочерченные факты в "Обо мне" —
        // ждём, пока там всё полностью проявится, и только потом чертим
        // линию сверху футера (.footer) и показываем контент (.footer-main,
        // у него уже есть свой transition-delay, синхронизированный с линией).
        afterAboutFacts(function () {
          staggerReveal(['.footer', '.footer-main'], 120);
        });
      },
    },
  ];

  var observer = new IntersectionObserver(function (entries, obs) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      var group = groups.filter(function (g) {
        return document.querySelector(g.trigger) === entry.target;
      })[0];
      if (group) {
        if (group.onEnter) {
          group.onEnter();
        } else {
          staggerReveal(group.targets, 120);
        }
      }
      obs.unobserve(entry.target);
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.15 });

  groups.forEach(function (g) {
    var el = document.querySelector(g.trigger);
    if (el) observer.observe(el);
  });
})();

// Loader: держит экран загрузки минимум 3 секунды, даже если страница
// загрузилась быстрее — и не скрывает раньше, чем реально всё загрузится,
// если это займёт дольше 3 секунд. После того как круговой reveal
// полностью откроет сайт, запускает каскадное появление hero.
(function () {
  var loader = document.getElementById('loader');
  if (!loader) return;

  var MIN_DURATION = 2000;
  var startTime = performance.now();
  var pageLoaded = false;

  function hideLoader() {
    loader.classList.add('is-hidden');
    loader.addEventListener('transitionend', function handler() {
      loader.style.display = 'none';
      loader.removeEventListener('transitionend', handler);
      revealHero();
    }, { once: true });
  }

  function tryHide() {
    if (!pageLoaded) return;
    var remaining = MIN_DURATION - (performance.now() - startTime);
    if (remaining > 0) {
      setTimeout(hideLoader, remaining);
    } else {
      hideLoader();
    }
  }

  function onPageLoaded() {
    pageLoaded = true;
    tryHide();
  }

  if (document.readyState === 'complete') {
    onPageLoaded();
  } else {
    window.addEventListener('load', onPageLoaded);
  }
})();

// Fit-to-width: масштабирует фрейм 1920x2745 по ширине окна браузера
// (но не увеличивает сверх 100%), высота скроллится обычным образом.
// Сама вёрстка (.page) остаётся в исходном пиксельном размере
// Figma-фрейма — этот блок ничего в ней не меняет, только визуальный zoom.
(function () {
  var FRAME_WIDTH = 1920;
  var FRAME_HEIGHT = 2738;

  var page = document.querySelector('.page');
  var stage = document.querySelector('.stage');

  function fit() {
    var scale = Math.min(document.documentElement.clientWidth / FRAME_WIDTH, 1);

    page.style.transform = 'scale(' + scale + ')';
    stage.style.width = FRAME_WIDTH * scale + 'px';
    stage.style.height = FRAME_HEIGHT * scale + 'px';
    document.documentElement.style.setProperty('--page-scale', scale);
  }

  fit();
  window.addEventListener('resize', fit);
})();

// Клик по пунктам меню в хедере и по логотипу в футере: свой сценарий
// скролла под каждый пункт — «Главная» и логотип прижимаются точно к верху
// страницы (0px), «Проекты» центрируются по экрану, остальные разделы
// выравниваются по верху.
(function () {
  function scrollToTop(e) {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  var links = document.querySelectorAll('.header-nav__item');

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var targetId = link.getAttribute('href').slice(1);

      if (targetId === 'hero') {
        scrollToTop(e);
        return;
      }

      var target = document.getElementById(targetId);
      if (!target) return;

      e.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: targetId === 'projects' ? 'center' : 'start',
      });
    });
  });

  var footerBrandLink = document.getElementById('footer-brand-link');
  if (footerBrandLink) {
    footerBrandLink.addEventListener('click', scrollToTop);
  }
})();

// Клик по email в футере копирует адрес в буфер обмена вместо перехода
// в почтовый клиент; всплывающая подсказка меняет текст на "Скопировано!".
(function () {
  var link = document.getElementById('footer-email-link');
  var bubble = document.getElementById('footer-email-tooltip');
  if (!link || !bubble) return;

  var defaultText = bubble.textContent;
  var revertTimer = null;

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } catch (err) {}
    document.body.removeChild(ta);
  }

  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      // На некоторых страницах (например, без фокуса окна) современный API
      // может отклонить промис — тогда откатываемся на старый способ.
      return navigator.clipboard.writeText(text).catch(function () {
        legacyCopy(text);
      });
    }
    legacyCopy(text);
    return Promise.resolve();
  }

  link.addEventListener('click', function (e) {
    e.preventDefault();
    copyText(link.textContent.trim()).then(function () {
      bubble.textContent = 'Скопировано!';
      clearTimeout(revertTimer);
      revertTimer = setTimeout(function () {
        bubble.textContent = defaultText;
      }, 1600);
    });
  });
})();

// Magnet-эффект на буквах V K V в hero: буква немного тянется к курсору,
// когда он находится над ней, и возвращается на место при уходе мыши.
// Транзиция задана в CSS (.magnet-btn), здесь только считаем смещение.
(function () {
  var PULL = 0.3;

  document.querySelectorAll('.magnet-btn').forEach(function (el) {
    el.addEventListener('mousemove', function (e) {
      var rect = el.getBoundingClientRect();
      var offsetX = e.clientX - (rect.left + rect.width / 2);
      var offsetY = e.clientY - (rect.top + rect.height / 2);
      el.style.transform = 'translate(' + offsetX * PULL + 'px, ' + offsetY * PULL + 'px)';
    });

    el.addEventListener('mouseleave', function () {
      el.style.transform = 'translate(0, 0)';
    });
  });
})();

// Наведение на "Воронеж" в футере меняет текст на "Город куража" —
// плавный кроссфейд через opacity (см. .footer-location в css).
(function () {
  var el = document.querySelector('.footer-location');
  if (!el) return;

  var defaultText = el.textContent;
  var hoverText = 'Город куража';

  function swapTo(text) {
    if (el.textContent === text) return;
    el.classList.add('is-swapping');
    setTimeout(function () {
      el.textContent = text;
      el.classList.remove('is-swapping');
    }, 200);
  }

  el.addEventListener('mouseenter', function () {
    swapTo(hoverText);
  });
  el.addEventListener('mouseleave', function () {
    swapTo(defaultText);
  });
})();

// Decoder-эффект на "Product | UX/UI Designer": в покое строка расшифрована
// и живёт своим автоциклом (см. @keyframes fx-decoder в css). Наведение
// мыши перебивает его мгновенной зашифровкой, при уходе курсора автоцикл
// перезапускается с нуля — снова расшифровывается и продолжает идти сам.
(function () {
  var el = document.querySelector('.fx-decoder');
  if (!el) return;

  el.addEventListener('mouseenter', function () {
    el.classList.add('is-hovering');
  });
  el.addEventListener('mouseleave', function () {
    el.classList.remove('is-hovering');
  });
})();

// Перетаскивание карточек проектов мышью (для тех, у кого нет трекпада —
// колесо и Shift+колесо работают и так, через нативный overflow-x, а это
// добавляет ещё и drag левой кнопкой).
(function () {
  var list = document.querySelector('.projects__list');
  if (!list) return;

  var isDragging = false;
  var moved = false;
  var startX = 0;
  var startScrollLeft = 0;

  function getPageScale() {
    return Math.min(document.documentElement.clientWidth / 1920, 1) || 1;
  }

  list.addEventListener('mousedown', function (e) {
    isDragging = true;
    moved = false;
    startX = e.clientX;
    startScrollLeft = list.scrollLeft;
    list.classList.add('is-dragging');
  });

  window.addEventListener('mousemove', function (e) {
    if (!isDragging) return;
    var dx = e.clientX - startX;
    if (Math.abs(dx) > 3) moved = true;
    list.scrollLeft = startScrollLeft - dx / getPageScale();
  });

  window.addEventListener('mouseup', function () {
    if (!isDragging) return;
    isDragging = false;
    list.classList.remove('is-dragging');
  });

  // Если это было перетаскивание, а не клик — гасим click по карточке
  // (на будущее, если карточки станут ссылками).
  list.addEventListener('click', function (e) {
    if (moved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);
})();

// 3D-наклон + блик на изображениях карточек проектов при наведении.
// Курсор отслеживается на плоской зоне .t-tilt, координаты пишутся в
// CSS-переменные, которые уже сама CSS использует для поворота .t-tilt-card
// и позиции блика .t-tilt-glare.
(function () {
  var MAX_TILT = 10;

  document.querySelectorAll('.t-tilt').forEach(function (wrap) {
    var card = wrap.querySelector('.t-tilt-card');
    if (!card) return;

    function updateTilt(e) {
      var rect = wrap.getBoundingClientRect();
      var px = (e.clientX - rect.left) / rect.width;
      var py = (e.clientY - rect.top) / rect.height;

      var ry = (px - 0.5) * 2 * MAX_TILT;
      var rx = -(py - 0.5) * 2 * MAX_TILT;

      wrap.style.setProperty('--tilt-rx', rx.toFixed(2) + 'deg');
      wrap.style.setProperty('--tilt-ry', ry.toFixed(2) + 'deg');
      wrap.style.setProperty('--tilt-gx', (px * 100).toFixed(1) + '%');
      wrap.style.setProperty('--tilt-gy', (py * 100).toFixed(1) + '%');
    }

    wrap.addEventListener('pointerenter', function (e) {
      wrap.classList.add('is-hover');
      card.classList.add('is-tilting');
      updateTilt(e);
    });

    wrap.addEventListener('pointermove', updateTilt);

    wrap.addEventListener('pointerleave', function () {
      wrap.classList.remove('is-hover');
      card.classList.remove('is-tilting');
      wrap.style.setProperty('--tilt-rx', '0deg');
      wrap.style.setProperty('--tilt-ry', '0deg');
    });
  });
})();

// Параллакс на изображениях проектов: при скролле страницы каждая картинка
// чуть сдвигается вверх или вниз (в зависимости от того, выше или ниже
// центра экрана она находится) — небольшая разница в скорости с самой
// страницей создаёт ощущение глубины.
(function () {
  var cards = document.querySelectorAll('.t-tilt-card');
  if (!cards.length) return;

  var PARALLAX_FACTOR = 0.2;
  var MAX_OFFSET = 30;
  var ticking = false;

  function getPageScale() {
    return Math.min(document.documentElement.clientWidth / 1920, 1) || 1;
  }

  function updateParallax() {
    var scale = getPageScale();
    var viewportCenter = window.innerHeight / 2;

    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var cardCenter = rect.top + rect.height / 2;
      // Сдвиг только вниз: пока карточка не дошла до центра экрана, картинка
      // "прибита" к верхней границе (0), вверх за неё не уходит. Вниз —
      // как раньше, до MAX_OFFSET.
      var offset = (viewportCenter - cardCenter) * PARALLAX_FACTOR;
      if (offset < 0) offset = 0;
      if (offset > MAX_OFFSET) offset = MAX_OFFSET;
      card.style.setProperty('--parallax-y', (offset / scale).toFixed(1) + 'px');
    });

    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(updateParallax);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  updateParallax();
})();
