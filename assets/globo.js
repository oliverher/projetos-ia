/* Globo terrestre decorativo do cabeçalho. Sem bibliotecas: projeta uma textura
   equiretangular (globo-terra.jpg) sobre uma esfera em canvas 2D, com luz fixa,
   inclinação do eixo (23,44°), crepúsculo e brilho atmosférico. */
(function () {
  var cv = document.getElementById("globo-terra");
  if (!cv || !cv.getContext) return;
  var src = new URL("globo-terra.jpg", document.currentScript.src).href;
  var reduzir = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TW = 1024, TH = 512;
  var tex = null, ctx = cv.getContext("2d"), frame = null;
  var P = null, shift = 0, rodando = false, visivel = true, ultimo = 0;
  var lonInicial = -0.96, velocidade = 0.085; // rad/s: uma volta a cada ~74 s

  function montar() {
    var css = cv.clientWidth;
    if (!css || !tex) return false;
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = Math.round(css * dpr);
    if (P && P.W === W) return true;
    cv.width = W; cv.height = W;
    frame = ctx.createImageData(W, W);
    var R = W / 2 - 1, c = W / 2;
    var T = 23.44 * Math.PI / 180, cT = Math.cos(T), sT = Math.sin(T);
    var sx = 0.75, sy = 0.25, sz = 0.6, sl = Math.sqrt(sx * sx + sy * sy + sz * sz);
    sx /= sl; sy /= sl; sz /= sl;
    var n = 0, pos = new Int32Array(W * W), col = new Float32Array(W * W), row = new Int32Array(W * W);
    var mul = new Float32Array(W * W), ar = new Float32Array(W * W), ag = new Float32Array(W * W), ab = new Float32Array(W * W), al = new Uint8Array(W * W);
    function smooth(a, b, x) { var t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
    for (var py = 0; py < W; py++) {
      for (var px = 0; px < W; px++) {
        var nx = (px + 0.5 - c) / R, ny = (c - py - 0.5) / R, r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        var nz = Math.sqrt(1 - r2);
        var xp = nx * cT + ny * sT, yp = -nx * sT + ny * cT;
        var lat = Math.asin(Math.max(-1, Math.min(1, yp)));
        var lon = Math.atan2(xp, nz);
        pos[n] = (py * W + px) * 4;
        col[n] = (lon + Math.PI) / (2 * Math.PI) * TW;
        row[n] = Math.min(TH - 1, Math.floor((Math.PI / 2 - lat) / Math.PI * TH)) * TW;
        var d = nx * sx + ny * sy + nz * sz;
        var dia = smooth(-0.10, 0.22, d);
        var lit = 0.06 + 1.12 * Math.max(0, d);
        mul[n] = dia * lit + (1 - dia) * 0.05;
        var twi = Math.exp(-Math.pow((d - 0.02) * 9.5, 2)) * 0.24;
        var fr = Math.pow(1 - nz, 3.6) * (0.15 + 0.85 * dia);
        ar[n] = (0.95 * twi + 0.24 * fr) * 255;
        ag[n] = (0.45 * twi + 0.64 * fr + 0.012 * (1 - dia)) * 255;
        ab[n] = (0.18 * twi + 0.98 * fr + 0.03 * (1 - dia)) * 255;
        al[n] = Math.round(Math.max(0, Math.min(1, (1 - Math.sqrt(r2)) * R)) * 255);
        n++;
      }
    }
    P = { W: W, n: n, pos: pos, col: col, row: row, mul: mul, ar: ar, ag: ag, ab: ab, al: al };
    return true;
  }

  function desenhar() {
    if (!P) return;
    var d = frame.data, t = tex, k, i, c, o, v;
    for (k = 0; k < P.n; k++) {
      c = (((P.col[k] + shift) | 0) % TW + TW) % TW;
      i = (P.row[k] + c) * 4;
      o = P.pos[k];
      v = P.mul[k];
      d[o] = Math.min(255, t[i] * v + P.ar[k]);
      d[o + 1] = Math.min(255, t[i + 1] * v + P.ag[k]);
      d[o + 2] = Math.min(255, t[i + 2] * v + P.ab[k]);
      d[o + 3] = P.al[k];
    }
    ctx.putImageData(frame, 0, 0);
  }

  function laco(ts) {
    rodando = false;
    if (!visivel || document.hidden || reduzir) return;
    if (ts - ultimo >= 33) { // ~30 quadros por segundo bastam para um globo pequeno
      var dt = Math.min(0.1, (ts - (ultimo || ts)) / 1000);
      ultimo = ts;
      shift -= velocidade * dt / (2 * Math.PI) * TW; // a superfície passa da esquerda para a direita
      desenhar();
    }
    iniciar();
  }
  function iniciar() { if (!rodando && !reduzir) { rodando = true; requestAnimationFrame(laco); } }

  function preparar() {
    if (!montar()) return;
    shift = lonInicial / (2 * Math.PI) * TW; // posição inicial: América do Sul à vista
    desenhar();
    iniciar();
  }

  var img = new Image();
  img.onload = function () {
    var oc = document.createElement("canvas");
    oc.width = TW; oc.height = TH;
    var x = oc.getContext("2d");
    x.drawImage(img, 0, 0, TW, TH);
    tex = x.getImageData(0, 0, TW, TH).data;
    preparar();
    if (window.ResizeObserver) new ResizeObserver(function () { if (cv.clientWidth) { P = P && P.W === Math.round(cv.clientWidth * Math.min(window.devicePixelRatio || 1, 2)) ? P : null; preparar(); } }).observe(cv);
    if (window.IntersectionObserver) new IntersectionObserver(function (e) { visivel = e[0].isIntersecting; if (visivel) iniciar(); }).observe(cv);
    document.addEventListener("visibilitychange", iniciar);
  };
  img.src = src;
})();
