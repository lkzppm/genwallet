// The population on the map: one small disc per individual (an instanced
// quad), and a ring around the champion. Alpha-blended over the terrain.
struct Params {
  texel: vec2f,      // 1 / resolution (device pixels)
  radius: f32,       // disc radius in device pixels
  intensity: f32,
  dot_color: vec4f,  // sRGB
  champion: vec4f,   // sRGB
  dots: array<vec4f, 96>, // x, y (uv), alpha, 1 for the champion
}
@group(0) @binding(0) var<uniform> params: Params;

struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,  // position inside the quad, in device pixels from the centre
  @location(1) alpha: f32,
  @location(2) champion: f32,
}

@vertex fn vs_main(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> VsOut {
  var corners = array<vec2f, 6>(vec2f(-1, -1), vec2f(1, -1), vec2f(-1, 1), vec2f(-1, 1), vec2f(1, -1), vec2f(1, 1));
  let d = params.dots[ii];
  let champion = d.w;
  // The champion's quad is larger, to fit its ring.
  let extent = params.radius * (1.0 + 2.6 * champion) + 2.0;
  let corner = corners[vi];
  let uv = d.xy + corner * extent * params.texel;
  var out: VsOut;
  out.position = vec4f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0, 0.0, 1.0);
  out.local = corner * extent;
  out.alpha = d.z;
  out.champion = champion;
  return out;
}

@fragment fn fs_main(frag: VsOut) -> @location(0) vec4f {
  let r = length(frag.local);
  let disc = 1.0 - smoothstep(params.radius - 0.75, params.radius + 0.75, r);
  let ring_r = params.radius * 3.0;
  let ring = frag.champion * (1.0 - smoothstep(0.6, 1.6, abs(r - ring_r)));
  let color = mix(params.dot_color.rgb, params.champion.rgb, frag.champion);
  let a = max(disc * 0.8, ring) * frag.alpha * params.intensity;
  if (a <= 0.001) {
    discard;
  }
  return vec4f(color, a);
}
