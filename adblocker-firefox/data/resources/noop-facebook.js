// Neutered Facebook Pixel
(function() {
  var noopfn = function() {};
  window.fbq = window.fbq || function() {
    if (window.fbq.callMethod) {
      window.fbq.callMethod.apply(window.fbq, arguments);
    } else {
      window.fbq.queue = window.fbq.queue || [];
      window.fbq.queue.push(arguments);
    }
  };
  window.fbq.push = noopfn;
  window.fbq.loaded = true;
  window.fbq.version = '2.0';
  window.fbq.queue = [];
  window._fbq = window.fbq;
})();
