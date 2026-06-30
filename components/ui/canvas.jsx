'use client';

// Color dynamic step value
var eVal = 0;

// Represents a point wave phase tracker
function n(e) {
  this.init(e || {});
}

n.prototype = {
  init: function (e) {
    this.phase = e.phase || 0;
    this.offset = e.offset || 0;
    this.frequency = e.frequency || 0.001;
    this.amplitude = e.amplitude || 1;
  },
  update: function () {
    this.phase += this.frequency;
    eVal = this.offset + Math.sin(this.phase) * this.amplitude;
    return eVal;
  },
  value: function () {
    return eVal;
  },
};

function Node() {
  this.x = 0;
  this.y = 0;
  this.vy = 0;
  this.vx = 0;
}

function Line(e) {
  this.init(e || {});
}

Line.prototype = {
  init: function (e) {
    this.spring = e.spring + 0.1 * Math.random() - 0.05;
    this.friction = E.friction + 0.01 * Math.random() - 0.005;
    this.nodes = [];
    for (var t, n = 0; n < E.size; n++) {
      t = new Node();
      t.x = pos.x || 0;
      t.y = pos.y || 0;
      this.nodes.push(t);
    }
  },
  update: function () {
    let e = this.spring,
      t = this.nodes[0];
    t.vx += (pos.x - t.x) * e;
    t.vy += (pos.y - t.y) * e;
    for (var n, i = 0, a = this.nodes.length; i < a; i++) {
      t = this.nodes[i];
      if (0 < i) {
        n = this.nodes[i - 1];
        t.vx += (n.x - t.x) * e;
        t.vy += (n.y - t.y) * e;
        t.vx += n.vx * E.dampening;
        t.vy += n.vy * E.dampening;
      }
      t.vx *= this.friction;
      t.vy *= this.friction;
      t.x += t.vx;
      t.y += t.vy;
      e *= E.tension;
    }
  },
  draw: function () {
    let e,
      t,
      n = this.nodes[0].x,
      i = this.nodes[0].y;
    ctx.beginPath();
    ctx.moveTo(n, i);
    for (var a = 1, o = this.nodes.length - 2; a < o; a++) {
      e = this.nodes[a];
      t = this.nodes[a + 1];
      n = 0.5 * (e.x + t.x);
      i = 0.5 * (e.y + t.y);
      ctx.quadraticCurveTo(e.x, e.y, n, i);
    }
    e = this.nodes[a];
    t = this.nodes[a + 1];
    ctx.quadraticCurveTo(e.x, e.y, t.x, t.y);
    ctx.stroke();
    ctx.closePath();
  },
};

function o() {
  lines = [];
  for (let e = 0; e < E.trails; e++) {
    lines.push(new Line({ spring: 0.45 + (e / E.trails) * 0.025 }));
  }
}

// Mouse/touch coordinates callbacks (module scope)
function c(e) {
  if (e.touches) {
    pos.x = e.touches[0].pageX;
    pos.y = e.touches[0].pageY;
  } else {
    pos.x = e.clientX;
    pos.y = e.clientY;
  }
}

function l(e) {
  if (e.touches && e.touches.length === 1) {
    pos.x = e.touches[0].pageX;
    pos.y = e.touches[0].pageY;
  }
}

function onMousemove(e) {
  document.removeEventListener("mousemove", onMousemove);
  document.removeEventListener("touchstart", onMousemove);
  document.addEventListener("mousemove", c);
  document.addEventListener("touchmove", c);
  document.addEventListener("touchstart", l);
  c(e);
  o();
  render();
}

function render() {
  if (ctx && ctx.running) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    if (isDark) {
      ctx.globalCompositeOperation = "lighter";
      ctx.strokeStyle = "hsla(" + Math.round(f.update()) + ",100%,50%,0.035)";
      ctx.lineWidth = 9;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "hsla(" + Math.round(f.update()) + ",65%,45%,0.12)";
      ctx.lineWidth = 5.5;
    }
    
    for (var e, t = 0; t < E.trails; t++) {
      (e = lines[t]).update();
      e.draw();
    }
    ctx.frame++;
    window.requestAnimationFrame(render);
  }
}

function resizeCanvas() {
  if (ctx && ctx.canvas) {
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
  }
}

// State variables in module scope
var ctx,
  f,
  pos = { x: 0, y: 0 },
  lines = [],
  E = {
    debug: true,
    friction: 0.5,
    trails: 80,
    size: 50,
    dampening: 0.025,
    tension: 0.99,
  };

export const renderCanvas = function () {
  const canvasEl = document.getElementById("canvas");
  if (!canvasEl) return;
  
  ctx = canvasEl.getContext("2d");
  ctx.running = true;
  ctx.frame = 1;
  
  f = new n({
    phase: Math.random() * 2 * Math.PI,
    amplitude: 30,
    frequency: 0.0015,
    offset: 220,
  });

  // Set initial position to center to prevent NaNs
  pos.x = window.innerWidth / 2;
  pos.y = window.innerHeight / 2;

  document.addEventListener("mousemove", onMousemove);
  document.addEventListener("touchstart", onMousemove);
  document.body.addEventListener("orientationchange", resizeCanvas);
  window.addEventListener("resize", resizeCanvas);
  
  const handleFocus = () => {
    if (!ctx.running) {
      ctx.running = true;
      render();
    }
  };
  
  const handleBlur = () => {
    ctx.running = false;
  };

  window.addEventListener("focus", handleFocus);
  window.addEventListener("blur", handleBlur);
  
  resizeCanvas();
};

export const cleanUpCanvas = function () {
  if (ctx) {
    ctx.running = false;
  }
  document.removeEventListener("mousemove", onMousemove);
  document.removeEventListener("touchstart", onMousemove);
  document.removeEventListener("mousemove", c);
  document.removeEventListener("touchmove", c);
  document.removeEventListener("touchstart", l);
  document.body.removeEventListener("orientationchange", resizeCanvas);
  window.removeEventListener("resize", resizeCanvas);
};
