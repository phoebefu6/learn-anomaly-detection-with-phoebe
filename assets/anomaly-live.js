/* anomaly-live.js - a REAL in-browser anomaly detector (learn-anomaly-detection-with-phoebe).
   Not a scripted sim: this runs actual z-score, IQR, robust-MAD, rolling-window, and
   seasonal-residual detectors on a synthetic Lumen daily-sessions series with injected
   anomalies (a spike, a drop, a contextual dip, and a collective run), flags points, and
   recomputes precision / recall / F1 against the ground-truth labels as you switch method
   and sensitivity. The story: a global z-score's own outliers inflate its threshold; robust
   methods do better but miss the CONTEXTUAL anomaly; the seasonal-residual detector removes
   the weekly pattern and catches them all. Deterministic (no RNG).
   Honesty rail: real detector math on a small teaching series, not a production system. */
(function () {
  var host = document.getElementById("anomaly-live");
  if (!host) return;

  var N = 90, M = 7;
  var SEASON = [30, 42, 48, 40, 22, -95, -110];      // weekday shape (weekend dip)
  var y = [];
  for (var i = 0; i < N; i++) {
    y.push(Math.round(900 + 1.2 * i + SEASON[i % M] + (10 * Math.sin(i * 1.7) + 7 * Math.cos(i * 0.6))));
  }
  // injected ground-truth anomalies
  var TRUTH = [20, 45, 63, 70, 71, 72];
  var truthSet = {}; TRUTH.forEach(function (i) { truthSet[i] = 1; });
  y[20] += 430;                 // point spike - a bot surge
  y[45] -= 380;                 // point drop - an outage
  y[63] = y[63] - SEASON[63 % M] + SEASON[6] - 40;   // contextual: a weekday sitting at a weekend-low level
  y[70] += 175; y[71] += 190; y[72] += 170;          // collective: a sustained run

  /* ---- helpers ---- */
  function mean(a) { return a.reduce(function (s, x) { return s + x; }, 0) / a.length; }
  function std(a) { var m = mean(a); return Math.sqrt(mean(a.map(function (x) { return (x - m) * (x - m); }))); }
  function median(a) { var b = a.slice().sort(function (p, q) { return p - q; }); var n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; }

  /* ---- detectors: each returns a set of flagged indices for a given sensitivity k-scale ---- */
  function zscore(kf) {
    var m = mean(y), sd = std(y), k = 3.0 * kf, f = [];
    y.forEach(function (v, i) { if (Math.abs((v - m) / sd) > k) f.push(i); });
    return f;
  }
  function iqr(kf) {
    var b = y.slice().sort(function (p, q) { return p - q; });
    var q1 = b[Math.floor(N * 0.25)], q3 = b[Math.floor(N * 0.75)], iq = q3 - q1;
    var mult = 1.5 * kf, lo = q1 - mult * iq, hi = q3 + mult * iq, f = [];
    y.forEach(function (v, i) { if (v < lo || v > hi) f.push(i); });
    return f;
  }
  function madz(kf) {
    var md = median(y), MAD = median(y.map(function (v) { return Math.abs(v - md); })) || 1, k = 3.0 * kf, f = [];
    y.forEach(function (v, i) { if (Math.abs(0.6745 * (v - md) / MAD) > k) f.push(i); });
    return f;
  }
  function rolling(kf) {
    var w = 10, k = 2.5 * kf, f = [];
    for (var i = 0; i < N; i++) {
      var s = Math.max(0, i - w), win = y.slice(s, i);
      if (win.length < 4) continue;
      var m = mean(win), sd = std(win) || 1;
      if (Math.abs((y[i] - m) / sd) > k) f.push(i);
    }
    return f;
  }
  function seasonal(kf) {
    var med = {};
    for (var d = 0; d < M; d++) { var vals = []; for (var i = 0; i < N; i++) if (i % M === d) vals.push(y[i]); med[d] = median(vals); }
    var resid = y.map(function (v, i) { return v - med[i % M]; });
    var mr = median(resid), MAD = median(resid.map(function (r) { return Math.abs(r - mr); })) || 1, k = 3.0 * kf, f = [];
    resid.forEach(function (r, i) { if (Math.abs(0.6745 * (r - mr) / MAD) > k) f.push(i); });
    return f;
  }

  var METHODS = [
    { id: "z", label: "Z-score", fn: zscore, note: "Global mean and standard deviation. Simple, but its own big outliers inflate the std - so it misses the more moderate anomalies." },
    { id: "iqr", label: "IQR / Tukey", fn: iqr, note: "Robust quartile fences. Catches the extremes without being fooled by them - but still blind to the contextual anomaly." },
    { id: "mad", label: "Robust MAD", fn: madz, note: "Median absolute deviation - a robust z-score. Strong on point outliers; the contextual one still looks normal globally." },
    { id: "roll", label: "Rolling window", fn: rolling, note: "A moving local mean and std. Adapts to the trend, but the weekly weekend dips still trip it up." },
    { id: "seasonal", label: "Seasonal residual", fn: seasonal, note: "Subtracts the weekly pattern first, then flags the residual. Removes the seasonality, so it catches even the contextual anomaly - the winner here." }
  ];
  var SENS = [
    { id: "lo", label: "Low", kf: 1.25 },
    { id: "med", label: "Medium", kf: 1.0 },
    { id: "hi", label: "High", kf: 0.8 }
  ];
  var current = "z", sens = "med";

  function score(flags) {
    var TP = 0, FP = 0; flags.forEach(function (i) { truthSet[i] ? TP++ : FP++; });
    var FN = TRUTH.length - TP;
    var P = (TP + FP) ? TP / (TP + FP) : 0, R = (TP + FN) ? TP / (TP + FN) : 0;
    var F = (P + R) ? 2 * P * R / (P + R) : 0;
    return { TP: TP, FP: FP, FN: FN, P: P, R: R, F: F };
  }

  /* ---- render shell ---- */
  host.innerHTML =
    '<div class="al-shell">' +
      '<div class="al-top">' +
        '<div class="al-ctrl"><span class="al-clabel">Detector</span><div class="al-methods"></div></div>' +
        '<div class="al-ctrl"><span class="al-clabel">Sensitivity</span><div class="al-sens"></div></div>' +
      '</div>' +
      '<div class="al-chart"><svg id="al-svg" viewBox="0 0 860 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Lumen daily sessions with true anomalies ringed and the detector flags in red"></svg></div>' +
      '<div class="al-legend">' +
        '<span><i class="al-sw al-normal"></i>Normal day</span>' +
        '<span><i class="al-sw al-flag"></i>Flagged by detector</span>' +
        '<span><i class="al-sw al-true"></i>True anomaly (ground truth)</span>' +
      '</div>' +
      '<div class="al-meters">' +
        '<div class="al-meter"><span class="al-mlabel">Precision</span><span class="al-mval" id="al-p">-</span></div>' +
        '<div class="al-meter"><span class="al-mlabel">Recall</span><span class="al-mval" id="al-r">-</span></div>' +
        '<div class="al-meter"><span class="al-mlabel">F1</span><span class="al-mval" id="al-f">-</span></div>' +
        '<div class="al-meter al-note" id="al-note"></div>' +
      '</div>' +
      '<p class="al-rail">Real detector math (z-score, IQR, robust MAD, rolling-window, and seasonal-residual) computed live on a small synthetic Lumen series with six injected anomalies - a teaching series, not a production system. Watch precision and recall trade off as you change the detector and the sensitivity, and note which anomalies each method can and cannot see.</p>' +
    '</div>';

  var mWrap = host.querySelector(".al-methods");
  METHODS.forEach(function (a) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "al-btn"; b.setAttribute("data-m", a.id); b.textContent = a.label;
    b.addEventListener("click", function () { current = a.id; render(); });
    mWrap.appendChild(b);
  });
  var sWrap = host.querySelector(".al-sens");
  SENS.forEach(function (a) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "al-btn"; b.setAttribute("data-s", a.id); b.textContent = a.label;
    b.addEventListener("click", function () { sens = a.id; render(); });
    sWrap.appendChild(b);
  });

  /* ---- draw ---- */
  var PAD_L = 44, PAD_R = 14, PAD_T = 16, PAD_B = 26, W = 860, HT = 300;
  var plotW = W - PAD_L - PAD_R, plotH = HT - PAD_T - PAD_B;
  var yMin = Math.min.apply(null, y), yMax = Math.max.apply(null, y);
  var padY = (yMax - yMin) * 0.08; yMin -= padY; yMax += padY;
  function X(i) { return PAD_L + (i / (N - 1)) * plotW; }
  function Y(v) { return PAD_T + (1 - (v - yMin) / (yMax - yMin)) * plotH; }

  function render() {
    var method = METHODS.filter(function (a) { return a.id === current; })[0];
    var kf = SENS.filter(function (a) { return a.id === sens; })[0].kf;
    var flags = method.fn(kf);
    var flagSet = {}; flags.forEach(function (i) { flagSet[i] = 1; });
    var sc = score(flags);

    var svg = "";
    // axes
    svg += '<line x1="' + PAD_L + '" y1="' + (PAD_T + plotH) + '" x2="' + (W - PAD_R) + '" y2="' + (PAD_T + plotH) + '" stroke="#D1D5DB" stroke-width="1"/>';
    svg += '<line x1="' + PAD_L + '" y1="' + PAD_T + '" x2="' + PAD_L + '" y2="' + (PAD_T + plotH) + '" stroke="#D1D5DB" stroke-width="1"/>';
    for (var g = 0; g <= 2; g++) {
      var gv = yMin + (yMax - yMin) * (g / 2), gy = Y(gv);
      svg += '<line x1="' + PAD_L + '" y1="' + gy + '" x2="' + (W - PAD_R) + '" y2="' + gy + '" stroke="#E5E7EB" stroke-width="1"/>';
      svg += '<text x="' + (PAD_L - 6) + '" y="' + (gy + 4) + '" text-anchor="end" style="font:400 11px Inter,sans-serif" fill="#6B7280">' + Math.round(gv) + '</text>';
    }
    // series line (charcoal)
    var pts = "";
    for (var i = 0; i < N; i++) pts += X(i) + "," + Y(y[i]) + " ";
    svg += '<polyline points="' + pts.trim() + '" fill="none" stroke="#4B5563" stroke-width="1.6"/>';
    // points: ring the true anomalies, dot the flags in red
    for (var j = 0; j < N; j++) {
      if (truthSet[j]) svg += '<circle cx="' + X(j) + '" cy="' + Y(y[j]) + '" r="7" fill="none" stroke="#111827" stroke-width="1.6"/>';
      if (flagSet[j]) svg += '<circle cx="' + X(j) + '" cy="' + Y(y[j]) + '" r="4" fill="#DC2626"/>';
      else if (!truthSet[j]) svg += '<circle cx="' + X(j) + '" cy="' + Y(y[j]) + '" r="1.6" fill="#9CA3AF"/>';
    }
    document.getElementById("al-svg").innerHTML = svg;

    host.querySelectorAll(".al-methods .al-btn").forEach(function (b) { b.classList.toggle("al-on", b.getAttribute("data-m") === current); });
    host.querySelectorAll(".al-sens .al-btn").forEach(function (b) { b.classList.toggle("al-on", b.getAttribute("data-s") === sens); });
    function pct(x) { return Math.round(x * 100) + "%"; }
    var pEl = document.getElementById("al-p"), rEl = document.getElementById("al-r"), fEl = document.getElementById("al-f");
    pEl.textContent = pct(sc.P); rEl.textContent = pct(sc.R); fEl.textContent = pct(sc.F);
    fEl.className = "al-mval" + (sc.F >= 0.95 ? " al-good" : (sc.F < 0.6 ? " al-bad" : ""));
    document.getElementById("al-note").innerHTML = "<b>" + method.label + "</b> " + method.note +
      " <span class=\"al-h\">Caught " + sc.TP + " of " + TRUTH.length + " real anomalies; " + sc.FP + " false alarm" + (sc.FP === 1 ? "" : "s") + ".</span>";
  }

  render();
})();
