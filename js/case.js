// Браузер по умолчанию восстанавливает прежнюю позицию скролла при
// обновлении страницы (F5) — отключаем это и всегда стартуем с самого
// верха кейса, а не с того места, где нажали "обновить" (тот же приём,
// что на главной, см. script.js).
if ('scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

// Фрейм 1920xH сжимается под ширину окна (но не увеличивается сверх 100%).
// .case-page сам сжимается через CSS zoom, а не transform: scale() — на
// таких длинных страницах (кейсы — десятки тысяч px из-за реальных
// скриншотов) transform: scale(), как на главной, упирается в лимит
// размера текстуры на некоторых GPU и часть страницы рендерится белой.
// Но nav и стрелка (case-project-nav) живут ВНЕ .case-page и масштабируются
// через --case-scale отдельным transform: scale() — тем же приёмом, что
// .float-menu на главной: у zoom тонкие линии (напр. подчёркивание) при
// дробном масштабе укладываются на дробный физический пиксель и меняют
// толщину после перерисовки, а transform-scale просто растягивает уже
// отрисованный слой, как на главной, — там этой проблемы нет.
//
// Высота .case-page НЕ берётся из фигмы как константа: шрифты браузера
// укладывают текст чуть иначе, чем Figma (доли пикселя на строку × десятки
// текстовых блоков дают заметный разъезд к концу восьмитысячной страницы) —
// высота считается от фактического рендера .case-content, поэтому нижний
// отступ остаётся ровно 40px независимо от таких расхождений.
(function () {
  var FRAME_WIDTH = 1920;
  var BOTTOM_PADDING = 40;

  var page = document.querySelector('.case-page');
  var content = document.querySelector('.case-content');
  if (!page || !content) return;

  // Полоски бургера в плавающем меню (.float-menu, живёт вне .case-page и
  // масштабируется своим transform: scale(--case-scale) — см. case.css)
  // при дробном масштабе иначе укладываются на дробный физический пиксель
  // и выходят разной толщины — тот же приём подгонки под целые физические
  // пиксели, что и в script.js на главной, здесь просто от --case-scale.
  function snapToDevicePx(targetCssPx, scale, dpr) {
    var devicePx = Math.max(1, Math.round(targetCssPx * dpr));
    return devicePx / dpr / scale;
  }

  function fit() {
    var scale = Math.min(document.documentElement.clientWidth / FRAME_WIDTH, 1);
    var dpr = window.devicePixelRatio || 1;
    var root = document.documentElement;
    root.style.setProperty('--case-scale', scale);
    root.style.setProperty('--fm-hairline', snapToDevicePx(1, scale, dpr) + 'px');
    root.style.setProperty('--fm-bar-gap', snapToDevicePx(9.25 * scale, scale, dpr) + 'px');
    // offsetTop/offsetHeight и style.height у зумленного элемента живут в
    // одном и том же "довизуальном" пространстве px (в отличие от
    // getBoundingClientRect, который уже отдаёт финальные экранные px) —
    // масштабировать здесь ничего не нужно, zoom сам растянет итоговую
    // высоту при отрисовке.
    page.style.height = (content.offsetTop + content.offsetHeight + BOTTOM_PADDING) + 'px';
    page.style.zoom = scale;
  }

  fit();
  window.addEventListener('resize', fit);
  window.addEventListener('load', fit);

  if (window.ResizeObserver) {
    new ResizeObserver(fit).observe(content);
  }

  // Зум браузера меняет devicePixelRatio — от него зависит округление
  // толщины полосок бургера (см. snapToDevicePx выше), пересчитываем и
  // по нему тоже (resize при зуме приходит не во всех сценариях).
  function watchDpr() {
    var mq = window.matchMedia('(resolution: ' + (window.devicePixelRatio || 1) + 'dppx)');
    mq.addEventListener('change', function () {
      fit();
      watchDpr();
    }, { once: true });
  }
  watchDpr();
})();

// Подсветка активного пункта в левой навигации кейса при скролле —
// IntersectionObserver следит, какая секция сейчас в верхней части экрана,
// и переключает .is-active на соответствующей ссылке в .case-nav__list.
(function () {
  var links = document.querySelectorAll('.case-nav__link');
  if (!links.length) return;

  var sections = document.querySelectorAll('[data-case-section]');

  function setActive(id) {
    links.forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('href') === '#' + id);
    });
  }

  // У полосы отслеживания (15–30% от верха экрана) последняя секция может
  // быть короче, чем расстояние от начала полосы до конца страницы — тогда
  // страница упирается в нижний край раньше, чем секция вообще попадёт в
  // эту полосу, и подсветка застревает на предпоследнем пункте. Долистали
  // до самого низа — значит точно смотрим на последнюю секцию, форсируем.
  // Проверка встроена и в наблюдатель, и в отдельный слушатель скролла —
  // иначе они конкурируют за то, кто выставит класс последним, и итог
  // зависит от случайного порядка срабатывания (наблюдатель асинхронный).
  var lastSection = sections[sections.length - 1];
  function isAtBottom() {
    return window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 2;
  }

  var observer = new IntersectionObserver(
    function (entries) {
      if (isAtBottom()) {
        setActive(lastSection.id);
        return;
      }
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    { rootMargin: '-15% 0px -70% 0px', threshold: 0 }
  );

  sections.forEach(function (section) {
    observer.observe(section);
  });

  // Секция "Обзор" (hero) не имеет своего пункта в меню — по умолчанию
  // подсвечивается первая секция, у которой такой пункт есть.
  for (var i = 0; i < sections.length; i++) {
    if (document.querySelector('.case-nav__link[href="#' + sections[i].id + '"]')) {
      setActive(sections[i].id);
      break;
    }
  }

  function checkBottom() {
    if (isAtBottom()) {
      setActive(lastSection.id);
    }
  }
  checkBottom();
  window.addEventListener('scroll', checkBottom, { passive: true });
  window.addEventListener('resize', checkBottom);
})();

// Стрелка перехода к соседнему проекту показывается, только когда
// страницу успели немного прокрутить — не должна мозолить глаза поверх
// самого первого экрана. У кейса в середине списка (например,
// Инвестколлекции) стрелок две — prev и next, — поэтому querySelectorAll,
// а не querySelector: с одиночным querySelector вторая стрелка так и не
// получала .is-visible и оставалась невидимой.
(function () {
  var arrows = document.querySelectorAll('.case-project-nav');
  if (!arrows.length) return;

  var SHOW_AFTER = 150;

  function toggle() {
    var visible = window.scrollY > SHOW_AFTER;
    arrows.forEach(function (arrow) {
      arrow.classList.toggle('is-visible', visible);
    });
  }

  toggle();
  window.addEventListener('scroll', toggle, { passive: true });
})();

// "Все проекты" ведёт на главную — ставим флаг, чтобы script.js не
// проигрывал заново вступительную анимацию (лоадер + печатающийся
// заголовок), а сразу показал готовую главную: пользователь и так только
// что видел её при заходе на этот кейс.
(function () {
  var back = document.querySelector('.case-nav__back');
  if (!back) return;
  back.addEventListener('click', function () {
    try {
      sessionStorage.setItem('skipIntro', '1');
    } catch (e) {}
  });
})();

// Появление контента кейса.
//
// При заходе на страницу — каскад, как на главной после лоадера (см.
// revealHero в script.js): элементы включаются по очереди с шагом 100мс —
// меню (сначала "Все проекты", потом пункты разделов), затем первый экран,
// затем то, что уже попало во вьюпорт при загрузке. Последнее важно: у
// такой секции ("О проекте" на высоком экране) наблюдатель сработал бы
// сразу при загрузке, и она проявилась бы разом, не дожидаясь очереди.
//
// Всё, что ниже сгиба, ждёт своей очереди на IntersectionObserver — тот же
// приём, что для projects/about/footer на главной. rootMargin с
// положительным нижним значением расширяет зону срабатывания ВНИЗ за
// пределы экрана: блок начинает проявляться до того, как реально доехал до
// вьюпорта, и успевает раскрыться (см. ускоренную анимацию в case.css) к
// моменту, когда до него долистали, — без паузы на пустом месте.
//
// Начальное (скрытое) состояние первого экрана и меню стоит прямо в
// разметке классом js-reveal, а не навешивается отсюда: иначе браузер
// схлопывает "скрыть" и "показать" в один пересчёт стилей до первой
// отрисовки, transition не запускается и всё появляется разом.
(function () {
  var STEP = 100;

  var scrollTargets = [].slice.call(
    document.querySelectorAll('.case-section:not(#obzor), .case-screen')
  );
  scrollTargets.forEach(function (el) {
    el.classList.add('js-scroll-reveal');
  });

  var inViewOnLoad = scrollTargets.filter(function (el) {
    return el.getBoundingClientRect().top < window.innerHeight;
  });
  var belowTheFold = scrollTargets.filter(function (el) {
    return inViewOnLoad.indexOf(el) === -1;
  });

  var cascade = [document.querySelector('.case-nav__back')]
    .concat([].slice.call(document.querySelectorAll('.case-nav__link')))
    .concat([document.querySelector('.float-menu')])
    .concat([].slice.call(document.querySelectorAll('#obzor .js-reveal')))
    .concat(inViewOnLoad);

  cascade.forEach(function (el, i) {
    if (!el) return;
    setTimeout(function () {
      el.classList.add('is-visible');
    }, i * STEP);
  });

  if (!('IntersectionObserver' in window)) {
    belowTheFold.forEach(function (el) {
      el.classList.add('is-visible');
    });
    return;
  }

  var observer = new IntersectionObserver(
    function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    },
    { rootMargin: '0px 0px 25% 0px', threshold: 0 }
  );

  belowTheFold.forEach(function (el) {
    observer.observe(el);
  });
})();

// Параллакс на первом фото каждого кейса (Обзор) — тот же приём, что для
// карточек проектов на главной: картинка чуть сдвигается вниз по мере
// приближения к центру экрана, до +30px, создавая ощущение глубины.
(function () {
  var shot = document.querySelector('.case-shot--parallax');
  if (!shot) return;

  var PARALLAX_FACTOR = 0.2;
  var MAX_OFFSET = 30;
  var ticking = false;

  function getScale() {
    return Math.min(document.documentElement.clientWidth / 1920, 1) || 1;
  }

  function update() {
    var scale = getScale();
    var rect = shot.getBoundingClientRect();
    var viewportCenter = window.innerHeight / 2;
    var shotCenter = rect.top + rect.height / 2;
    var offset = (viewportCenter - shotCenter) * PARALLAX_FACTOR;
    if (offset < 0) offset = 0;
    if (offset > MAX_OFFSET) offset = MAX_OFFSET;
    shot.style.setProperty('--case-parallax-y', (offset / scale).toFixed(1) + 'px');
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
})();

// Плавающее меню (бургер + Telegram) — та же кнопка, что и на главной, но
// здесь она не появляется/прячется по скроллу (в кейсе нет хедера, из-под
// которого она выныривает на главной) — она видна с самого начала и просто
// участвует в общем каскаде появления страницы (см. .float-menu в cascade
// выше). Здесь только интерактив: открытие/закрытие выпадашки, блокировка
// скролла, пока она открыта, и закрытие по клику вне меню — один в один с
// логикой в script.js.
(function () {
  var floatMenu = document.querySelector('.float-menu');
  if (!floatMenu) return;

  var toggle = document.getElementById('float-menu-toggle');
  var dropdown = document.getElementById('float-menu-dropdown');
  if (!toggle || !dropdown) return;

  var backdrop = document.getElementById('float-menu-backdrop');

  var dropdownItems = dropdown.querySelectorAll('.float-menu__dropdown-item');
  dropdownItems.forEach(function (item, i) {
    item.style.setProperty('--item-delay', i * 80 + 'ms');
  });

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

  toggle.addEventListener('click', function (e) {
    e.stopPropagation();
    setOpen(!dropdown.classList.contains('is-open'));
  });

  // Пункты, ведущие на разделы главной, — как "Все проекты": не
  // проигрывать заново вступительную анимацию лоадера, раз человек её уже
  // видел. CV сюда не попадает — он открывает PDF в новой вкладке, а не
  // ведёт на главную, флаг ему ни к чему.
  dropdown.querySelectorAll('a[href^="../index.html"]').forEach(function (link) {
    link.addEventListener('click', function () {
      try {
        sessionStorage.setItem('skipIntro', '1');
      } catch (e) {}
    });
  });

  // Любой пункт (включая CV) закрывает выпадашку по клику.
  dropdown.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeDropdown);
  });

  document.addEventListener('click', function (e) {
    if (!floatMenu.contains(e.target)) closeDropdown();
  });

  // Меню прибито к низу ЭКРАНА (position:fixed), а не к низу СТРАНИЦЫ —
  // у самого конца контента оно наезжает на последний абзац. Прячем его,
  // как только до конца страницы остаётся меньше отступа снизу + высоты
  // самого меню, и возвращаем при скролле обратно вверх.
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

