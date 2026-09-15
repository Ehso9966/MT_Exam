window.MT = window.MT || {};

/* Accordion — single-open FAQ items with smooth height + opacity transitions.
   Respects prefers-reduced-motion (transitions are disabled via tokens.css). */
MT.Accordion = (function () {
  function init() {
    var lists = document.querySelectorAll('.faq-list');
    Array.prototype.forEach.call(lists, function (list) {
      var items = Array.prototype.slice.call(list.querySelectorAll('.faq-item'));
      items.forEach(function (item) {
        var q = item.querySelector('.faq-question');
        if (!q) return;
        var answer = item.querySelector('.faq-answer');
        var chevron = q.querySelector('.faq-chevron');

        if (answer && !answer.style.maxHeight) {
          answer.style.maxHeight = '0px';
        }

        q.addEventListener('click', function () {
          var isOpen = item.classList.contains('open');
          closeAll(list, items, answer);
          if (!isOpen) openItem(item, q, answer);
        });
      });
    });
  }

  function closeAll(list, items, except) {
    items.forEach(function (item) {
      if (item.querySelector('.faq-answer') === except) return;
      item.classList.remove('open');
      var q = item.querySelector('.faq-question');
      var a = item.querySelector('.faq-answer');
      if (q) q.setAttribute('aria-expanded', 'false');
      if (a) a.style.maxHeight = '0px';
    });
  }

  function openItem(item, q, answer) {
    item.classList.add('open');
    if (q) q.setAttribute('aria-expanded', 'true');
    if (answer) answer.style.maxHeight = answer.scrollHeight + 'px';
  }

  return { init: init };
})();