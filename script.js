// Copyright (c) 2017 Joost van Zwieten
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

'use strict';

// (COMPLEX) ARITHMETIC //

function sqr(x)
{
  return Math.pow(x, 2);
}

function cabs_sqr(x)
{
  if (Number.isFinite(x))
    return sqr(Math.abs(x));
  else
    return sqr(x.real)+sqr(x.imag);
}

function cabs(x)
{
  if (Number.isFinite(x))
    return Math.abs(x);
  else
    return Math.sqrt(cabs_sqr(x));
}

function cneg(x)
{
  if (Number.isFinite(x))
    return -x;
  else
    return {real: -x.real, imag: -x.imag};
}

function cadd(l, r)
{
  if (Number.isFinite(l) && Number.isFinite(r))
    return l + r;
  if (Number.isFinite(l))
    return {real: l + r.real, imag: r.imag};
  if (Number.isFinite(r))
    return {real: l.real + r, imag: l.imag};
  return {real: l.real + r.real, imag: l.imag + r.imag};
}

function csub(l, r)
{
  if (Number.isFinite(l) && Number.isFinite(r))
    return l - r;
  if (Number.isFinite(l))
    return {real: l - r.real, imag: -r.imag};
  if (Number.isFinite(r))
    return {real: l.real - r, imag: l.imag};
  return {real: l.real - r.real, imag: l.imag - r.imag};
}

function cmul(l, r)
{
  if (Number.isFinite(l) && Number.isFinite(r))
    return l * r;
  if (Number.isFinite(l))
    return {real: l * r.real, imag: l * r.imag};
  if (Number.isFinite(r))
    return {real: l.real * r, imag: l.imag * r};
  return {real: l.real * r.real - l.imag * r.imag, imag: l.real * r.imag + l.imag * r.real};
}

function cdiv(l, r)
{
  if (Number.isFinite(l) && Number.isFinite(r))
    return l / r;
  if (Number.isFinite(r))
    return {real: l.real / r, imag: l.imag / r};
  let n = cmul(l, conj(r));
  let d = cabs_sqr(r);
  return {real: n.real / d, imag: n.imag / d};
}

function conj(x)
{
  if (Number.isFinite(x))
    return x;
  else
    return {real: x.real, imag: -x.imag};
}

// OPTIMAL TAU AND J //

function opt_tau_anal(e, w, W)
{
  let r = Math.sqrt(w*W*(1+sqr(e)));
  let th = Math.atan2(-Math.sqrt(sqr(e*(W+w)) + sqr(W-w)), 2*Math.sqrt(w*W));
  return {real: r*Math.cos(th), imag: r*Math.sin(th)};
}

function J_opt(e, w, W)
{
  let tau = opt_tau_anal(e, w, W);
  let r = 0.5*Math.sqrt(1 + sqr(tau.real/tau.imag));
  let c1_im = tau.real/(2*tau.imag) - (tau.imag+e*tau.real)*w/(sqr(w-tau.real)+sqr(e*w+tau.imag));
  let R = Math.sqrt(sqr(tau.real) + sqr(tau.imag))*Math.sqrt(sqr(e)+1)/(2*Math.abs(tau.real*e+tau.imag));
  let C_im = e*(sqr(tau.real)+sqr(tau.imag))/(2*tau.imag*(tau.real*e+tau.imag));
  return Math.sqrt(sqr(r)/(sqr(R)-sqr(C_im)+2*C_im*c1_im));
}

function J(om, tau)
{
  let r = cabs(tau) / Math.abs(2*tau.imag);
  let Jval = [];
  for (let k = 0; k < om.length; k++)
  {
    let etak = cdiv(om[k], csub(om[k], tau));
    let ck = csub({real: 1/2, imag: tau.real / (2*tau.imag)}, etak);
    Jval.push(r / cabs(ck));
  }
  return Math.max.apply(null, Jval);
}

function om(freq, eps)
{
  return {real: 2*Math.PI*freq, imag: -2*Math.PI*freq*eps};
}

// DRAWING //

function linspace(start, stop, n)
{
  let values = [];
  for (let k = 0; k < n; k++)
    values.push(start+k*(stop-start)/(n-1));
  return values;
}

function argmin(arr)
{
  if (!(arr.length > 0))
    throw 'cannot apply argmin to array of length zero';
  let i_min = 0;
  let min_val = arr[0];
  for (let i = 1; i < arr.length; i++)
    if (arr[i] < min_val)
    {
      i_min = i;
      min_val = arr[i];
    }
  return i_min;
}

function round_pow10(x)
{
  return Math.pow(10, Math.round(Math.log(x)/Math.log(10)));
}

function draw_circle(ctx, dpr, offset, scale, c, r, color)
{
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.round(2*dpr);

  ctx.beginPath();
  ctx.arc((c.real-offset.x)*scale+0.5, (c.imag-offset.y)*scale+0.5, r*scale, 0, 2*Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc((c.real-offset.x)*scale+0.5, (c.imag-offset.y)*scale+0.5, 3*dpr, 0, 2*Math.PI);
  ctx.fill();

  ctx.restore();
}

function fmt_float(value, ndecimals)
{
  if (ndecimals <= 0)
    return '' + Math.round(value);
  value = '' + Math.round(value*Math.pow(10, ndecimals));
  let head = value.substring(0, value.length-ndecimals);
  if (head.length == 0 || head == '-')
    head = head + '0';
  let tail = value.substring(value.length-ndecimals, value.length);
  return head + '.' + value.substring(value.length-ndecimals, value.length);
}

function redraw()
{
  let dpr = window.devicePixelRatio;
  if (window.matchMedia('print').matches)
    dpr = 300 / 96;

  let tau = {real: window.settings.tau_real, imag: window.settings.tau_imag};
  let fmin = window.settings.fmin;
  let fmax = window.settings.fmax;
  let n_freqs = window.settings.n_freqs;
  let eps = window.settings.eps;

  let freqs = linspace(fmin, fmax, n_freqs);

  let drawing = document.getElementById('drawing');
  if (window.resize_drawing)
  {
    let rect = drawing.getBoundingClientRect();
    drawing.width = Math.round(dpr*rect.width);
    drawing.height = Math.round(dpr*rect.height);
    window.resize_drawing = false;
  }
  let ctx = drawing.getContext('2d');
  ctx.clearRect(0, 0, drawing.width, drawing.height);
  ctx.save();

  let margin = {left: Math.round(50*dpr), right: Math.round(50*dpr), top: Math.round(75*dpr), bottom: Math.round(50*dpr)};

  ctx.translate(0, drawing.height);
  ctx.scale(1, -1);

  // Compute main circle.
  let C = {real: 0, imag: eps*cabs_sqr(tau)/(2*tau.imag*(tau.imag+eps*tau.real))};
  let R = Math.sqrt(cabs_sqr(tau)*(sqr(eps)+1)/(4*sqr(tau.imag+eps*tau.real)));
  let r = cabs(tau) / Math.abs(2*tau.imag);

  // Draw axes.
  let scale; // device pixels per unit
  let drawing_radius = (R+r)*1.05;
  if (drawing.width-margin.left-margin.right > drawing.height-margin.top-margin.bottom)
    scale = (drawing.height-margin.top-margin.bottom) / (2*drawing_radius);
  else
    scale = (drawing.width-margin.left-margin.right) / (2*drawing_radius);
  let offset = {// position of lower left corner
    x: -(drawing.width-margin.left-margin.right) / (2*scale) - margin.left/scale + C.real,
    y: -(drawing.height-margin.top-margin.bottom) / (2*scale) - margin.bottom/scale + C.imag};

  // Draw axes.  Major lines when `i` is a multiple of ten.
  ctx.save();
  ctx.lineWidth = Math.max(1, Math.round(dpr/2));

  // Determine `i_scale`, `i_step`, such that `i_step*i_scale*scale` is close
  // to 25 with `i_step` being 2, 5 or 10 and `i_scale` is a power of 10.
  let goal = 25*dpr;
  let steps = [2, 5, 10];
  let i_step = steps[argmin(steps.map(k => Math.abs(k*round_pow10(goal/(k*scale))*scale-goal)))];
  let i_scale_power = Math.round(Math.log(goal/(i_step*scale))/Math.log(10));
  let i_scale = Math.pow(10, i_scale_power);

  let minor = [];
  let major = [];

  let ix_min = Math.floor(offset.x / (i_scale*i_step)) * i_step;
  let ix_max = Math.ceil((offset.x+drawing.width/scale) / (i_scale*i_step)) * i_step;
  for (let i = ix_min; i <= ix_max; i += i_step)
    (i % 10 ? minor : major).push({x: Math.round((i*i_scale-offset.x)*scale)+0.5});
  let iy_min = Math.floor(offset.y / (i_scale*i_step)) * i_step;
  let iy_max = Math.ceil((offset.y+drawing.height/scale) / (i_scale*i_step)) * i_step;
  for (let i = iy_min; i <= iy_max; i += i_step)
    (i % 10 ? minor : major).push({y: Math.round((i*i_scale-offset.y)*scale)+0.5});

  for (let item of [{lines: minor, color: '#eee'}, {lines: major, color: '#bbb'}])
  {
    ctx.strokeStyle = item.color;
    for (let line of item.lines)
    {
      ctx.beginPath();
      if (line.x !== undefined)
      {
        ctx.moveTo(line.x, 0);
        ctx.lineTo(line.x, drawing.height);
      }
      else
      {
        ctx.moveTo(0, line.y);
        ctx.lineTo(drawing.width, line.y);
      }
      ctx.stroke();
    }
  }

  ctx.restore();

  // Draw main circle.
  draw_circle(ctx, dpr, offset, scale, C, R, '#888');

  // Draw frequency circles.
  for (let i = 0; i < n_freqs; i++)
  {
    let freq = freqs[i];
    let omega = {real: 2*Math.PI*freq, imag: -2*Math.PI*freq*eps};
    let eta = cdiv(omega, csub(omega, tau));
    let c = csub({real: 1/2, imag: tau.real / (2*tau.imag)}, eta);
    draw_circle(ctx, dpr, offset, scale, c, r, `hsl(${i*360/n_freqs},50%,50%)`);
  }

  ctx.restore();

  ctx.save();
  ctx.clearRect(0, 0, margin.left, drawing.height);
  ctx.clearRect(drawing.width-margin.right, 0, margin.right, drawing.height);
  ctx.clearRect(0, drawing.height-margin.bottom, drawing.width, margin.bottom);
  ctx.clearRect(0, 0, drawing.width, margin.top);
  ctx.strokeStyle = 'black';
  ctx.lineWidth = Math.max(1, Math.round(dpr/2));
  ctx.beginPath(); ctx.moveTo(margin.left+0.5, margin.top); ctx.lineTo(margin.left+0.5, drawing.height-margin.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(margin.left, margin.top+0.5); ctx.lineTo(drawing.width-margin.right, margin.top+0.5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(drawing.width-margin.right+0.5-1, margin.top); ctx.lineTo(drawing.width-margin.right+0.5-1, drawing.height-margin.bottom); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(margin.left, drawing.height-margin.bottom+0.5-1); ctx.lineTo(drawing.width-margin.left, drawing.height-margin.bottom+0.5-1); ctx.stroke();

  let i_step_label = 10;
  if (i_step_label*i_scale*scale < 50*dpr)
    i_step_label = 20;
  if (i_step_label*i_scale*scale < 50*dpr)
    i_step_label = 50;
  ctx.font = `${Math.round(12*dpr)}px 'Fira Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (let i = Math.ceil(ix_min/i_step_label)*i_step_label; i <= Math.floor(ix_max/i_step_label)*i_step_label; i += i_step_label)
    if (Math.round((i*i_scale-offset.x)*scale) >= margin.left && Math.round((i*i_scale-offset.x)*scale) <= drawing.width-margin.right)
      ctx.fillText(fmt_float(i*i_scale, -1-i_scale_power), Math.round((i*i_scale-offset.x)*scale), Math.round(drawing.height-margin.bottom+10));
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = Math.ceil(iy_min/i_step_label)*i_step_label; i <= Math.floor(iy_max/i_step_label)*i_step_label; i += i_step_label)
    if (drawing.height-Math.round((i*i_scale-offset.y)*scale) >= margin.top && drawing.height-Math.round((i*i_scale-offset.y)*scale) <= drawing.height-margin.bottom)
      ctx.fillText(fmt_float(i*i_scale, -1-i_scale_power), Math.round(margin.left-10), drawing.height-Math.round((i*i_scale-offset.y)*scale));

//ctx.font = `${Math.round(32*dpr)}px 'Noto Serif', serif`;
//ctx.textAlign = 'center';
//ctx.textBaseline = 'middle';
//ctx.fillText('Optimal τ', Math.round(drawing.width/2), Math.round(margin.top/2))

  ctx.restore();

  window.redraw_pending = false;
}

function request_redraw()
{
  if (!window.redraw_pending)
  {
    window.redraw_pending = true;
    window.requestAnimationFrame(redraw);
  }
}

function resize_drawing()
{
  window.resize_drawing = true;
  request_redraw();
}

// CONTROLS //

function ignore_event_wrapper(func)
{
  return function(ev) { return func(); }
}

function append_control(container, row, label, parser, key, affects_optimality)
{
  let el_background = document.createElement('div');
  el_background.id = 'background_'+key;
  el_background.classList.add('background');
  el_background.style.gridColumn = '1 / 3';
  el_background.style.gridRow = row;
  el_background.addEventListener('pointerdown', select_control.bind(null, key, affects_optimality));

  let el_label = document.createElement('div');
  el_label.id = 'label_'+key;
  el_label.classList.add('label');
  el_label.innerText = label;
  el_label.style.gridColumn = 1;
  el_label.style.gridRow = row;
  el_label.addEventListener('pointerdown', select_control.bind(null, key, affects_optimality));

  let el_control = document.createElement('input');
  el_control.id = 'control_'+key;
  el_control.type = 'number';
  el_control.step = parser == parseFloat ? 'any' : 1;
  el_control.value = window.settings[key];
  el_control.style.gridColumn = 2;
  el_control.style.gridRow = row;
  el_control.addEventListener('change', update_settings.bind(null, parser, key, affects_optimality));
  el_control.addEventListener('focus', ignore_event_wrapper(deselect_controls));

  container.appendChild(el_background);
  container.appendChild(el_label);
  container.appendChild(el_control);

  return row + 1;
}

function update_settings(parser, key, affects_optimality, e)
{
  if (affects_optimality)
    document.getElementById('optimal').classList.add('not');
  try
  {
    window.settings[key] = parser(e.target.value);
  }
  catch (exc)
  {
    document.getElementById('background_'+key).classList.add('error');
    return;
  }
  document.getElementById('background_'+key).classList.remove('error');
  update_optimal_tau();
  redraw();
}

function select_control(key, affects_optimality, e)
{
  if (affects_optimality)
    document.getElementById('optimal').classList.add('not');
  for (let el of document.querySelectorAll('#controls .selected'))
    if (el.id != 'background_'+key)
      el.classList.remove('selected');
  let el = document.getElementById('background_'+key);
  el.classList.toggle('selected');
  window.slide_key = el.classList.contains('selected') ? key : undefined;
  e.stopPropagation();
  e.preventDefault();
}

function deselect_controls()
{
  for (let el of document.querySelectorAll('#controls .selected'))
    el.classList.remove('selected');
  window.slide_key = undefined;
}

function start_slide(e)
{
  if (!window.slide_key)
    return;
  window.start_value = window.settings[window.slide_key];
  window.slide_start = e.clientX;
  document.body.addEventListener('pointermove', slide);
  e.preventDefault();
  e.stopPropagation();
}

function stop_slide(e)
{
  document.body.removeEventListener('pointermove', slide);
  window.slide_start = undefined;
}

function slide(e)
{
  let control = document.getElementById('control_'+window.slide_key);
  let value = window.start_value + (e.clientX - window.slide_start) / 100;
  if (control.step == '1')
    value = Math.round(value);
  if (window.settings[window.slide_key] != value)
  {
    window.settings[window.slide_key] = value;
    control.value = value;
    update_optimal_tau();
    request_redraw();
  }
  e.stopPropagation();
  e.preventDefault();
}

function toggle_optimality()
{
  let optimal = document.getElementById('optimal');
  optimal.classList.toggle('not');
  deselect_controls();
  update_optimal_tau();
  redraw();
}

function update_optimal_tau()
{
  if (document.getElementById('optimal').classList.contains('not'))
    return;
  let tau = opt_tau_anal(window.settings.eps, 2*Math.PI*window.settings.fmin, 2*Math.PI*window.settings.fmax);
  window.settings.tau_real = tau.real;
  window.settings.tau_imag = tau.imag;
  document.getElementById('control_tau_real').value = tau.real;
  document.getElementById('control_tau_imag').value = tau.imag;
}

// INIT //

window.addEventListener('load', function()
{
  window.settings = {fmin: 1, fmax: 9, eps: 0.7, n_freqs: 7};
  let tau = opt_tau_anal(window.settings.eps, 2*Math.PI*window.settings.fmin, 2*Math.PI*window.settings.fmax);
  window.settings.tau_real = tau.real;
  window.settings.tau_imag = tau.imag;

  let drawing = document.createElement('canvas');
  drawing.id = 'drawing';
  document.body.appendChild(drawing);
  window.addEventListener('resize', resize_drawing);
  window.resize_drawing = true;
  redraw();

  let title = document.createElement('div');
  title.id = 'title';
  let optimal = document.createElement('span');
  optimal.id = 'optimal';
  optimal.innerText = 'Optimal';
  optimal.addEventListener('click', toggle_optimality);
  title.appendChild(optimal)
  title.appendChild(document.createTextNode(' τ'));
  document.body.appendChild(title);

  let controls = document.createElement('div');
  controls.id = 'controls';
  let row = 1;
  row = append_control(controls, row, 'τ real', parseFloat, 'tau_real', true);
  row = append_control(controls, row, 'τ imag', parseFloat, 'tau_imag', true);
  row = append_control(controls, row, 'fmin', parseFloat, 'fmin', false);
  row = append_control(controls, row, 'fmax', parseFloat, 'fmax', false);
  row = append_control(controls, row, 'n_freqs', parseInt, 'n_freqs', false);
  row = append_control(controls, row, 'eps', parseFloat, 'eps', false);
  document.body.appendChild(controls);

  document.body.addEventListener('pointerdown', start_slide);
  document.body.addEventListener('pointerup', stop_slide);

  let footer = document.createElement('div');
  footer.id = 'footer';
  footer.appendChild(document.createTextNode('details: '));
  let footer_link = document.createElement('a');
  // TODO: replace with 'https://doi.org/...' as soon as the official paper has been published
  footer_link.href = 'http://ta.twi.tudelft.nl/nw/users/mmbaumann/projects/tech_rep4a.pdf';
  footer_link.appendChild(document.createTextNode('Baumann and Van Gijzen (2017)'));
  footer.appendChild(footer_link);
  document.body.appendChild(footer);

  window.matchMedia('print').addListener(function(mql)
  {
    // `mql.matches` is true if the media changed to print
    window.resize_drawing = true;
    redraw();
  });
});

// vim: sts=2:sw=2:et
