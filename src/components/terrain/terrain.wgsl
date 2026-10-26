// The fitness landscape as a topographic map: thin contour lines of a sum of
// Gaussian bumps, red in the pits, green on the peaks, grey on the plain in
// between, over a faint wash of the same colours. Every fifth line is an
// index contour, a little stronger. Around the pointer the lines brighten,
// like a lamp held over the map. Colours are sRGB and written as they are
// (the surface format is not sRGB), so they match the same CSS colours.
struct Params {
  texel: vec2f,      // 1 / resolution (device pixels)
  pointer: vec2f,    // eased pointer in uv, x < 0 when there is none
  aspect: f32,       // width / height
  levels: f32,       // contour lines per unit of height
  line: f32,         // line width in device pixels
  intensity: f32,    // overall strength, 0..1
  up: vec4f,         // sRGB, the peaks
  down: vec4f,       // sRGB, the pits
  background: vec4f, // sRGB, the page
  foreground: vec4f, // sRGB, the text colour: the plain between
  bumps: array<vec4f, 8>, // x, y (uv), width, signed amplitude
}
@group(0) @binding(0) var<uniform> params: Params;

fn height(p: vec2f) -> f32 {
  var h = 0.0;
  for (var i = 0u; i < 8u; i++) {
    let b = params.bumps[i];
    let d = vec2f((p.x - b.x) * params.aspect, p.y - b.y);
    h += b.w * exp(-dot(d, d) / (2.0 * b.z * b.z));
  }
  return h;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let h = height(uv);

  // Distance to the nearest contour, in pixels: fwidth turns the height's
  // slope into a screen-space width, so lines stay one width on steep and
  // gentle ground alike.
  let v = h * params.levels;
  let fw = max(fwidth(v), 1e-4);
  let dist = abs(fract(v + 0.5) - 0.5) / fw;
  let index_line = 1.0 - step(0.5, abs(round(v) % 5.0));
  let width = params.line * (1.0 + 0.6 * index_line);
  let on_line = 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.0, dist);

  // -1 (deepest pit) .. 1 (highest peak) -> colour of the ground.
  let t = tanh(h * 1.3);
  let side = select(params.down.rgb, params.up.rgb, t >= 0.0);
  let plain = mix(params.background.rgb, params.foreground.rgb, 0.4);
  let k = smoothstep(0.0, 1.0, abs(t));
  let color = mix(plain, side, k);

  var lamp = 0.0;
  if (params.pointer.x >= 0.0) {
    let d = vec2f((uv.x - params.pointer.x) * params.aspect, uv.y - params.pointer.y);
    lamp = exp(-dot(d, d) / 0.018);
  }

  let line_alpha = on_line * (0.16 + 0.14 * index_line + 0.22 * k + 0.4 * lamp) * params.intensity;
  let wash = 0.055 * k * params.intensity;
  var rgb = mix(params.background.rgb, color, wash);
  rgb = mix(rgb, color, line_alpha);
  return vec4f(rgb, 1.0);
}
