(function () {
  var toggle = document.querySelector(".nav-toggle");
  var sidebar = document.querySelector(".sidebar");
  if (toggle && sidebar) {
    toggle.addEventListener("click", function () {
      var open = sidebar.classList.toggle("open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        sidebar.classList.remove("open");
        toggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sel = btn.getAttribute("data-copy");
      var el = document.querySelector(sel);
      if (!el) return;
      var text = el.innerText || el.textContent;
      var done = function () {
        btn.textContent = "已复制";
        btn.classList.add("done");
        setTimeout(function () {
          btn.textContent = "复制";
          btn.classList.remove("done");
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () {
          fallbackCopy(text, done);
        });
      } else {
        fallbackCopy(text, done);
      }
    });
  });

  function fallbackCopy(text, done) {
    var ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  var page = document.body.getAttribute("data-page") || location.pathname;
  document.querySelectorAll(".checks input[type=checkbox]").forEach(function (box, i) {
    var key = "gb-guide:" + page + ":" + i;
    try { box.checked = localStorage.getItem(key) === "1"; } catch (e) {}
    box.addEventListener("change", function () {
      try { localStorage.setItem(key, box.checked ? "1" : "0"); } catch (e) {}
    });
  });
})();
