// Браузер по умолчанию восстанавливает прежнюю позицию скролла при
// обновлении страницы (F5) — отключаем это и всегда стартуем с самого
// верха (hero), а не с того места, где нажали "обновить".
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Мобильная версия — тот же порог, что у media-запроса в styles.css. На ней
// hover-эффекты выключены: на тачскрине наведения нет (тап оставляет
// "залипший" hover), поэтому обработчики ниже проверяют это в момент
// события, а не один раз при загрузке — так корректно и после ресайза.
function isMobileLayout() {
  return document.documentElement.clientWidth <= 768;
}

// Флаг ставится в case.js по клику на "Все проекты" в кейсе: раз человек
// только что видел главную (пришёл с неё), незачем повторно проигрывать
// лоадер и печатающийся заголовок — сразу показываем готовую страницу
// (см. SKIP_INTRO ниже, в блоке лоадера и revealHeroInstant()).
var SKIP_INTRO = false;
try {
  SKIP_INTRO = sessionStorage.getItem('skipIntro') === '1';
  sessionStorage.removeItem('skipIntro');
} catch (e) {}

// Хэш в адресе (#projects, #about, #contacts...) — сохраняем и сразу
// убираем из URL: иначе браузер сам, независимо от нашего JS (и в
// произвольный момент — иногда уже после того, как мы прокрутили куда
// нужно), долистает до элемента с этим id своим штатным выравниванием
// (по верху), а для "Проекты" это ещё и не то центрирование, что при
// клике на "Проекты" в шапке/бургере (см. ниже). Сам скролл к разделу
// делаем позже, в блоке лоадера.
var SKIP_INTRO_HASH = '';
if (SKIP_INTRO && location.hash) {
  SKIP_INTRO_HASH = location.hash;
  history.replaceState(null, '', location.pathname + location.search);
}

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
          // Имя с ролью — последний шаг каскада hero: только за ним идут
          // блоки, видимые на первом экране (проекты на мобильной версии).
          setTimeout(startScrollReveal, 400);
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

// Конечное состояние revealHero()+startTypewriter(), без построчной печати
// и без пауз между элементами — используется вместо revealHero(), когда
// SKIP_INTRO включён (пришли с "Все проекты" из кейса).
function revealHeroInstant() {
  document.querySelectorAll('.js-reveal').forEach(function (el) {
    el.classList.add('is-visible');
  });
  var textEl = document.getElementById('hero-title-text');
  if (textEl) textEl.textContent = 'Дизайн, который решает задачи бизнеса';
  var link = document.querySelector('.fx-decoder');
  if (link) link.classList.add('is-ready');
}

// Появление остальных секций (projects/about/footer) при скролле: пока
// hero доигрывает свою анимацию после лоадера, всё остальное ждёт своей
// очереди и появляется только когда блок реально доезжает до вьюпорта —
// тем же способом, что на kei-inc.jp (IntersectionObserver, один раз).
var startScrollReveal = function () {};
(function () {
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.js-scroll-reveal').forEach(function (el) {
      el.classList.add('is-visible');
    });
    document.querySelectorAll('.tool').forEach(function (el) {
      el.classList.add('is-visible', 'is-filled');
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
  // "Инструменты" (последний факт) после своей линии проявляются построчно:
  // строка текста → 5 серых кружков по очереди → закрашиваются чёрным те,
  // что входят в уровень (тайминги кружков — в .tool__level в css).
  var toolRows = Array.prototype.slice.call(document.querySelectorAll('.tool'));
  var TOOL_ROW_STEP = 1000;
  var TOOL_FILL_DELAY = 600;
  var TOOL_FILL_DURATION = 4 * 80 + 420;
  var TOOLS_TOTAL_DURATION = toolRows.length
    ? (toolRows.length - 1) * TOOL_ROW_STEP + TOOL_FILL_DELAY + TOOL_FILL_DURATION
    : FACT_TEXT_FADE_DURATION;

  function revealTools() {
    toolRows.forEach(function (row, i) {
      setTimeout(function () {
        row.classList.add('is-visible');
        setTimeout(function () {
          row.classList.add('is-filled');
        }, TOOL_FILL_DELAY);
      }, i * TOOL_ROW_STEP);
    });
  }

  var ABOUT_FACTS_TOTAL_DURATION =
    FACT_ITEMS_START_DELAY +
    (FACT_ITEMS_COUNT - 1) * FACT_LINE_DURATION +
    FACT_LINE_DURATION +
    TOOLS_TOTAL_DURATION;

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
          staggerReveal(factItems, FACT_LINE_DURATION, function (el) {
            if (!el.classList.contains('fact-item--tools')) return;
            setTimeout(revealTools, FACT_LINE_DURATION);
          });
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

  // Наблюдение включается не сразу, а после каскада hero (см. лоадер
  // ниже): на мобильной версии проекты видны уже на первом экране, и
  // observer срабатывал ещё под лоадером — карточки проявлялись раньше
  // hero, а их каскад никто не видел. На десктопе блоки ниже первого
  // экрана, так что для него ничего не меняется.
  startScrollReveal = function () {
    startScrollReveal = function () {};
    groups.forEach(function (g) {
      var el = document.querySelector(g.trigger);
      if (el) observer.observe(el);
    });
  };
})();

// Loader: держит экран загрузки минимум 3 секунды, даже если страница
// загрузилась быстрее — и не скрывает раньше, чем реально всё загрузится,
// если это займёт дольше 3 секунд. После того как круговой reveal
// полностью откроет сайт, запускает каскадное появление hero.
(function () {
  var loader = document.getElementById('loader');
  if (!loader) {
    startScrollReveal();
    return;
  }

  // Пока лоадер на экране — жёстко блокируем скролл. Одного
  // overflow:hidden на html оказалось недостаточно: колесо/тачпад
  // продолжают копить дельту скролла, пока лоадер показан, и в момент
  // снятия блокировки браузер применяет всю накопленную дельту разом —
  // страница улетает сразу в футер вместо того, чтобы просто не
  // реагировать на скролл. position:fixed на body убирает документ из
  // потока скролла целиком — копить нечему в принципе, а не просто
  // визуально "не даёт". Место под скроллбар зарезервировано постоянно
  // (scrollbar-gutter на html, см. styles.css), поэтому блокировка не
  // сдвигает контент по горизонтали.
  document.documentElement.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = '0';
  document.body.style.left = '0';
  document.body.style.right = '0';
  function unlockScroll() {
    document.documentElement.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
  }

  if (SKIP_INTRO) {
    loader.style.display = 'none';
    unlockScroll();
    revealHeroInstant();
    startScrollReveal();
    // Ссылки из кейса (плавающее меню, "Все проекты") ведут на конкретный
    // раздел главной ("../index.html#about" и т.п.) — раз хэш уже вырезан
    // из адреса выше (см. SKIP_INTRO_HASH), скроллим к нему сюда сами.
    // "Проекты" при клике в шапке/бургере (см. ниже, .header-nav__item)
    // центрируется (block: 'center'), а не выравнивается по верху —
    // результат должен быть одинаковым независимо от способа перехода,
    // поэтому та же логика (по id, не только для "projects") и здесь.
    if (SKIP_INTRO_HASH) {
      var targetId = SKIP_INTRO_HASH.slice(1);
      var targetSection = document.getElementById(targetId);
      if (targetSection) {
        var scrollToTarget = function () {
          targetSection.scrollIntoView({ behavior: 'auto', block: targetId === 'projects' ? 'center' : 'start' });
        };
        // Сразу вызывать бесполезно: страница только что распарсилась,
        // layout ещё не устоялся (особенно на длинной scale()-странице), и
        // scrollIntoView в этот момент молча не срабатывает. Два кадра
        // подряд гарантируют, что раскладка уже посчитана, плюс подстраховка
        // после полной загрузки (картинки/шрифты могли сдвинуть высоту).
        requestAnimationFrame(function () {
          requestAnimationFrame(scrollToTarget);
        });
        window.addEventListener('load', scrollToTarget);
      }
    }
    return;
  }

  var MIN_DURATION = 2000;
  var startTime = performance.now();
  var pageLoaded = false;

  function hideLoader() {
    loader.classList.add('is-hidden');
    // Разблокируем скролл только когда круговой reveal (1.4s, см. .loader
    // в css) реально закончился, а не в момент старта анимации — иначе
    // почти полторы секунды экран ещё визуально закрыт лоадером, а
    // прокрутить страницу за ним уже можно.
    loader.addEventListener('transitionend', function handler() {
      loader.style.display = 'none';
      loader.removeEventListener('transitionend', handler);
      unlockScroll();
      revealHero();
      // На десктопе проекты ниже первого экрана — ждать конца каскада hero
      // не нужно (иначе при быстром скролле они бы не появлялись).
      if (!isMobileLayout()) startScrollReveal();
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
//
// На мобильной версии (≤768px, см. MOBILE_BREAKPOINT) .page вместо этого
// идёт обычным потоком (см. media-запрос в styles.css) — тексту нужно
// реально переноситься по словам на разных ширинах, а с застывшим
// пиксельным фреймом высота блока "Обо мне" была бы не той, что подскажет
// собственный рендер шрифтов браузера. Поэтому здесь для мобильной версии
// .page/.stage просто не трогаем (сбрасываем инлайн-стили, если они
// остались с десктопной ширины), а --page-scale считаем от СВОЕГО
// эталона 430px — он нужен только плавающему меню (бургер+Telegram),
// которое, как и на десктопе, живёт вне .page и масштабируется им.
(function () {
  var FRAME_WIDTH = 1920;
  var FRAME_HEIGHT = 2833;
  var MOBILE_BREAKPOINT = 768;
  var MOBILE_FRAME_WIDTH = 430;
  // Аналог "9.25" у десктопного бургера (25px полоска → 9.25px шаг), но
  // для мобильной кнопки 16.58px — та же пропорция (9.25 / 25 * 16.58).
  var MOBILE_BAR_GAP = 6.13;

  var page = document.querySelector('.page');
  var stage = document.querySelector('.stage');

  // Полоски бургера лежат внутри .float-menu, который отмасштабирован на
  // scale(--page-scale). Из-за дробного масштаба края полосок попадают на
  // дробные физические пиксели, причём у каждой полоски своя дробная часть
  // (top 0 / 9.25 / 18.5 → 0.0 / 6.09 / 12.19 при scale 0.659): первая
  // ложится ровно на сетку и рисуется чётко, остальные размазываются по
  // двум рядам и выглядят тоньше. Поэтому толщину и шаг считаем здесь и
  // подгоняем так, чтобы после масштабирования они были целым числом
  // физических пикселей — тогда фаза сетки у всех трёх одинаковая.
  function snapToDevicePx(targetCssPx, scale, dpr) {
    var devicePx = Math.max(1, Math.round(targetCssPx * dpr));
    return devicePx / dpr / scale;
  }

  function fit() {
    var dpr = window.devicePixelRatio || 1;
    var root = document.documentElement;
    var isMobile = document.documentElement.clientWidth <= MOBILE_BREAKPOINT;

    if (isMobile) {
      // Сбрасываем инлайн-стили, которые мог выставить этот же fit() при
      // предыдущем вызове на десктопной ширине (например, окно сузили) —
      // иначе .page остался бы зажат в них поверх media-запроса.
      page.style.transform = '';
      stage.style.width = '';
      stage.style.height = '';

      var mobileScale = Math.min(document.documentElement.clientWidth / MOBILE_FRAME_WIDTH, 1);
      root.style.setProperty('--page-scale', mobileScale);
      root.style.setProperty('--fm-hairline', snapToDevicePx(1, mobileScale, dpr) + 'px');
      root.style.setProperty('--fm-bar-gap', snapToDevicePx(MOBILE_BAR_GAP * mobileScale, mobileScale, dpr) + 'px');
      return;
    }

    var scale = Math.min(document.documentElement.clientWidth / FRAME_WIDTH, 1);

    page.style.transform = 'scale(' + scale + ')';
    stage.style.width = FRAME_WIDTH * scale + 'px';
    stage.style.height = FRAME_HEIGHT * scale + 'px';
    root.style.setProperty('--page-scale', scale);
    // --fm-hairline — 1 реальный CSS-пиксель (полоски бургера и обводки
    // кнопок), --fm-bar-gap — шаг между полосками (9.25px макета); оба
    // округлены до целых физических пикселей (см. комментарий выше).
    root.style.setProperty('--fm-hairline', snapToDevicePx(1, scale, dpr) + 'px');
    root.style.setProperty('--fm-bar-gap', snapToDevicePx(9.25 * scale, scale, dpr) + 'px');
  }

  fit();
  window.addEventListener('resize', fit);

  // Зум браузера меняет devicePixelRatio — от него зависит округление
  // толщины полосок бургера, поэтому пересчитываем и по нему тоже
  // (resize при зуме приходит не во всех сценариях, например при переносе
  // окна на монитор с другой плотностью).
  function watchDpr() {
    var mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    mq.addEventListener('change', function () {
      fit();
      watchDpr();
    }, { once: true });
  }
  watchDpr();
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

  var links = document.querySelectorAll('.header-nav__item, .js-nav-scroll');

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
      // На мобильной версии подсказка по наведению выключена — показываем
      // её классом, иначе копирование проходило бы без обратной связи.
      bubble.parentElement.classList.add('is-copied');
      clearTimeout(revertTimer);
      revertTimer = setTimeout(function () {
        bubble.textContent = defaultText;
        bubble.parentElement.classList.remove('is-copied');
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
      if (isMobileLayout()) {
        el.style.transform = 'translate(0, 0)';
        return;
      }
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
    if (isMobileLayout()) return;
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
    if (isMobileLayout()) return;
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

  // На мобильной версии (≤768px) .page не сжимается через transform:
  // scale() — там всегда действующий масштаб 1 (см. комментарий у fit()
  // выше), иначе тут делили бы на clientWidth/1920, а это крошечное число
  // на телефонном экране — перетаскивание/параллакс улетали бы в разгон.
  function getPageScale() {
    if (isMobileLayout()) return 1;
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

    // На тачскрине нет наведения — палец не "зависает" над картинкой, он
    // либо тапает, либо тащит (в т.ч. чтобы прокрутить ленту проектов
    // вбок), поэтому касание эффект не запускает. На мобильной версии
    // наклон выключен и для мыши — как и остальные hover-эффекты (см.
    // isMobileLayout выше).
    wrap.addEventListener('pointerenter', function (e) {
      if (e.pointerType === 'touch' || isMobileLayout()) return;
      wrap.classList.add('is-hover');
      card.classList.add('is-tilting');
      updateTilt(e);
    });

    wrap.addEventListener('pointermove', function (e) {
      if (e.pointerType === 'touch' || isMobileLayout()) return;
      updateTilt(e);
    });

    wrap.addEventListener('pointerleave', function (e) {
      // Тап по карточке тоже заканчивается pointerleave — на телефоне он
      // не должен сбрасывать наклон от гироскопа (см. ниже).
      if (e.pointerType === 'touch') return;
      wrap.classList.remove('is-hover');
      card.classList.remove('is-tilting');
      wrap.style.setProperty('--tilt-rx', '0deg');
      wrap.style.setProperty('--tilt-ry', '0deg');
    });
  });
})();

// Тот же 3D-наклон с бликом на мобильной версии — от наклона самого
// телефона (гироскоп) вместо курсора. Разрешение сознательно не
// запрашиваем (requestPermission не вызываем — он и показывает системный
// диалог): просто слушаем событие. Где датчик отдаёт данные без вопросов
// (Android), эффект работает; на iPhone без разрешения события не
// приходят — там карточки просто остаются ровными.
//
// Нейтральное положение — то, как телефон держат сейчас, а не строго
// горизонтально: база медленно подтягивается к текущему углу, поэтому
// карточки откликаются на движение и через пару секунд спокойно
// возвращаются в ровное положение, если телефон держат неподвижно.
(function () {
  if (!('DeviceOrientationEvent' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  var wraps = document.querySelectorAll('.t-tilt');
  if (!wraps.length) return;

  var MAX_TILT = 10;      // как у наклона мышью
  var INPUT_RANGE = 20;   // наклон телефона в градусах, дающий полный наклон карточки
  var BASE_FOLLOW = 0.015; // скорость, с которой база догоняет текущее положение

  var baseX = null;
  var baseY = null;
  var lastX = 0;
  var lastY = 0;
  var active = false;
  var ticking = false;

  function screenAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    return typeof window.orientation === 'number' ? window.orientation : 0;
  }

  // gamma — наклон влево-вправо, beta — к себе / от себя; в альбомной
  // ориентации оси экрана поворачиваются относительно датчика.
  function readAxes(e) {
    var angle = ((screenAngle() % 360) + 360) % 360;
    if (angle === 90) return { x: e.beta, y: -e.gamma };
    if (angle === 270) return { x: -e.beta, y: e.gamma };
    if (angle === 180) return { x: -e.gamma, y: -e.beta };
    return { x: e.gamma, y: e.beta };
  }

  function clamp(v) {
    return Math.max(-1, Math.min(1, v));
  }

  function apply() {
    ticking = false;
    var nx = clamp((lastX - baseX) / INPUT_RANGE);
    var ny = clamp((lastY - baseY) / INPUT_RANGE);
    wraps.forEach(function (wrap) {
      wrap.style.setProperty('--tilt-ry', (nx * MAX_TILT).toFixed(2) + 'deg');
      wrap.style.setProperty('--tilt-rx', (-ny * MAX_TILT).toFixed(2) + 'deg');
      wrap.style.setProperty('--tilt-gx', (50 + nx * 50).toFixed(1) + '%');
      wrap.style.setProperty('--tilt-gy', (50 + ny * 50).toFixed(1) + '%');
      if (!active) {
        wrap.classList.add('is-hover');
        var card = wrap.querySelector('.t-tilt-card');
        if (card) card.classList.add('is-tilting');
      }
    });
    active = true;
  }

  function reset() {
    active = false;
    baseX = baseY = null;
    wraps.forEach(function (wrap) {
      wrap.classList.remove('is-hover');
      var card = wrap.querySelector('.t-tilt-card');
      if (card) card.classList.remove('is-tilting');
      wrap.style.setProperty('--tilt-rx', '0deg');
      wrap.style.setProperty('--tilt-ry', '0deg');
    });
  }

  window.addEventListener('deviceorientation', function (e) {
    if (!isMobileLayout()) {
      if (active) reset();
      return;
    }
    if (e.beta === null || e.gamma === null) return;

    var axes = readAxes(e);
    lastX = axes.x;
    lastY = axes.y;
    if (baseX === null) {
      baseX = lastX;
      baseY = lastY;
    } else {
      baseX += (lastX - baseX) * BASE_FOLLOW;
      baseY += (lastY - baseY) * BASE_FOLLOW;
    }

    if (!ticking) {
      ticking = true;
      requestAnimationFrame(apply);
    }
  });
})();

// Параллакс на изображениях проектов: при скролле страницы каждая картинка
// чуть сдвигается вверх или вниз (в зависимости от того, выше или ниже
// центра экрана она находится) — небольшая разница в скорости с самой
// страницей создаёт ощущение глубины.
(function () {
  // Сдвигается .t-tilt-shift, а не .t-tilt-card — см. комментарий у
  // .t-tilt-card в styles.css: сдвигать по Y сам скруглённый (overflow:
  // hidden) элемент нельзя, вместе с картинкой уезжала бы и его рамка.
  var cards = document.querySelectorAll('.t-tilt-shift');
  if (!cards.length) return;

  var PARALLAX_FACTOR = 0.2;
  var ticking = false;

  // На мобильной версии (≤768px) .page не сжимается через transform:
  // scale() — там всегда действующий масштаб 1 (см. комментарий у fit()
  // выше), иначе тут делили бы на clientWidth/1920, а это крошечное число
  // на телефонном экране — перетаскивание/параллакс улетали бы в разгон.
  function getPageScale() {
    if (isMobileLayout()) return 1;
    return Math.min(document.documentElement.clientWidth / 1920, 1) || 1;
  }

  function updateParallax() {
    var scale = getPageScale();
    var viewportCenter = window.innerHeight / 2;

    cards.forEach(function (card) {
      var rect = card.getBoundingClientRect();
      var cardCenter = rect.top + rect.height / 2;
      // Запас по краям даёт scale(1.12) на .t-tilt-card (см. styles.css) —
      // по 6% высоты с каждой стороны. Раньше сдвиг ограничивался общим
      // потолком в 30px для всех карточек сразу, но у карточек пониже
      // (card__media--2/--3, 462/386px) 6% от их высоты — это меньше 30px,
      // и на максимуме сдвиг вылезал за пределы запаса, оголяя пустоту у
      // края картинки. Теперь потолок свой у каждой карточки, от её
      // реальной высоты, а не общий на всех.
      var maxOffset = rect.height * 0.06;
      var offset = (viewportCenter - cardCenter) * PARALLAX_FACTOR;
      if (offset < 0) offset = 0;
      if (offset > maxOffset) offset = maxOffset;
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

// Плавающее меню (бургер + Telegram): появляется, когда меню в шапке
// (.header-nav) уходит за пределы экрана при скролле вниз, и прячется
// обратно, когда шапка снова видна.
(function () {
  var floatMenu = document.getElementById('float-menu');
  var headerNav = document.querySelector('.header-nav');
  if (!floatMenu || !headerNav) return;

  var toggle = document.getElementById('float-menu-toggle');
  var dropdown = document.getElementById('float-menu-dropdown');
  if (!toggle || !dropdown) return;

  var backdrop = document.getElementById('float-menu-backdrop');

  var dropdownItems = dropdown.querySelectorAll('.float-menu__dropdown-item');
  // Задержка на каждый пункт — 80ms * индекс, как у .js-modal__item на
  // kei-inc.jp; сама CSS-анимация запускается/сбрасывается классом is-open.
  dropdownItems.forEach(function (item, i) {
    item.style.setProperty('--item-delay', i * 80 + 'ms');
  });

  // Пока меню открыто, страница не скроллится. Ничего не съезжает, потому
  // что место под скроллбар зарезервировано постоянно — scrollbar-gutter
  // на html (см. styles.css).
  function setScrollLock(locked) {
    document.documentElement.style.overflow = locked ? 'hidden' : '';
  }

  function setOpen(isOpen) {
    floatMenu.classList.toggle('is-open', isOpen);
    dropdown.classList.toggle('is-open', isOpen);
    if (backdrop) backdrop.classList.toggle('is-open', isOpen);
    dropdown.setAttribute('aria-hidden', String(!isOpen));
    toggle.setAttribute('aria-expanded', String(isOpen));
    setScrollLock(isOpen);
  }

  function closeDropdown() {
    setOpen(false);
  }

  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          // Когда шапка снова видна, меню прячется — заодно закрываем
          // выпадашку, иначе при следующем появлении (шапка опять уйдёт
          // за экран) меню вылезет уже открытым, минуя закрытое состояние.
          if (entry.isIntersecting) closeDropdown();
          floatMenu.classList.toggle('is-visible', !entry.isIntersecting);
        });
      },
      { threshold: 0 }
    );
    observer.observe(headerNav);
  }

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!dropdown.classList.contains('is-open'));
  });

  // Все пункты выпадашки закрывают её по клику, не только якорные
  // js-nav-scroll — CV (PDF, новая вкладка) якорем не является, но
  // после клика по нему меню тоже должно закрыться.
  dropdown.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeDropdown);
  });

  document.addEventListener('click', function (e) {
    if (!floatMenu.contains(e.target)) closeDropdown();
  });

  // Меню прибито к низу ЭКРАНА (position:fixed), а не к низу СТРАНИЦЫ —
  // у самого конца футера оно наезжает на его содержимое. Прячем его, как
  // только до конца страницы остаётся меньше отступа снизу + высоты
  // самого меню, и возвращаем при скролле обратно вверх — один в один с
  // isNearBottom() в case.js.
  var BOTTOM_GAP = 160;
  function isNearBottom() {
    return document.documentElement.scrollHeight - (window.scrollY + window.innerHeight) < BOTTOM_GAP;
  }
  function updateBottomVisibility() {
    var nearBottom = isNearBottom();
    floatMenu.classList.toggle('is-near-bottom', nearBottom);
    if (nearBottom) closeDropdown();
  }
  updateBottomVisibility();
  window.addEventListener('scroll', updateBottomVisibility, { passive: true });
  window.addEventListener('resize', updateBottomVisibility);
})();
