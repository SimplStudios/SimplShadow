// Neutered Google Analytics
(function() {
  var noopfn = function() {};
  var noopnull = function() { return null; };
  window.ga = window.ga || function() {
    (window.ga.q = window.ga.q || []).push(arguments);
  };
  window.ga.l = Date.now();
  window.ga.create = noopfn;
  window.ga.getByName = noopnull;
  window.ga.getAll = function() { return []; };
  window.ga.remove = noopfn;
  window.gaData = window.gaData || {};
  window.gaGlobal = window.gaGlobal || {};
  window.GoogleAnalyticsObject = 'ga';
})();
