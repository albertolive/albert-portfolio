"use client";

import { useEffect, useRef } from "react";

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time;
uniform vec3 baseColor;
uniform vec3 deepColor;
uniform vec3 sandColor;
uniform sampler2D sandTexture;
uniform vec4 ripples[8];

float hash(vec2 point) {
  return fract(sin(dot(point, vec2(127.1,311.7))) * 43758.5453);
}
float noise(vec2 point) {
  vec2 tile = floor(point);
  vec2 local = fract(point);
  vec2 blend = local * local * (3.0 - 2.0 * local);
  return mix(mix(hash(tile), hash(tile + vec2(1.0,0.0)), blend.x),
    mix(hash(tile + vec2(0.0,1.0)), hash(tile + 1.0), blend.x), blend.y);
}
vec2 waveNormal(vec2 point) {
  return vec2(0.72,0.43) * cos(dot(point,vec2(2.4,1.43)) - time * 0.62)
    + vec2(-0.29,0.46) * cos(dot(point,vec2(-3.1,4.9)) - time * 0.83)
    + vec2(0.21,0.17) * cos(dot(point,vec2(7.2,5.8)) + time * 1.12)
    + vec2(-0.11,0.15) * cos(dot(point,vec2(-11.4,15.1)) - time * 1.46);
}
float caustics(vec2 point) {
  point += waveNormal(point * 0.53) * 0.65;
  vec3 curvature = vec3(0.0);
  for (int index = 0; index < 5; index++) {
    float angle = float(index) * 2.39996;
    vec2 direction = vec2(cos(angle),sin(angle));
    float frequency = 4.0 + float(index) * 1.73;
    float phase = dot(point,direction) * frequency
      + time * (0.43 + float(index) * 0.17);
    curvature += vec3(direction.x * direction.x, direction.y * direction.y,
      direction.x * direction.y) * sin(phase) * 0.48;
  }
  float determinant = (1.0 + curvature.x) * (1.0 + curvature.y)
    - curvature.z * curvature.z;
  return exp(-abs(determinant) * 13.0);
}
void main() {
  vec2 uv = gl_FragCoord.xy / resolution;
  vec2 point = gl_FragCoord.xy / resolution.y * 5.0;
  vec2 normal = waveNormal(point);
  for (int index = 0; index < 8; index++) {
    vec4 ripple = ripples[index];
    float age = time - ripple.z;
    vec2 delta = point - ripple.xy;
    float distanceToDrop = length(delta);
    float front = distanceToDrop - age * 1.2;
    float envelope = exp(-front * front * 18.0) * exp(-age * 0.9)
      * step(0.0, age) * ripple.w;
    normal += delta / max(distanceToDrop, 0.01)
      * cos(front * 25.0) * envelope * 1.35;
  }
  float coastline = uv.x * 0.76 + (1.0 - uv.y) * 0.66 - 0.19
    + noise(point * 0.85) * 0.09 + sin(point.y * 1.3) * 0.025;
  float tide = sin(time * 0.29 + point.y * 0.75) * 0.014;
  float wet = smoothstep(-0.005,0.025,coastline + tide);
  float depth = smoothstep(0.0,0.95,max(coastline,0.0));
  vec2 refracted = point + normal * (0.025 + depth * 0.12) * wet;
  float sediment = noise(refracted * 2.2);
  float sandRidges = sin(refracted.y * 44.0 + sin(refracted.x * 3.1) * 2.5
    + noise(refracted * 3.0) * 4.0);
  float grain = noise(refracted * 260.0) - 0.5;
  vec3 sand = mix(sandColor,texture2D(sandTexture,refracted * 0.27).rgb,0.85)
    * (0.94 + sediment * 0.08 + sandRidges * 0.025 + grain * 0.035);
  vec3 transmission = exp(-vec3(2.8,0.85,0.58) * (depth * 1.9 + 0.08));
  vec3 water = sand * transmission + deepColor * (1.0 - transmission) * 0.83;
  float light = caustics(refracted * 1.25);
  light += caustics(refracted * 1.71 + vec2(12.3,7.4)) * 0.35;
  water += sandColor * light * (0.26 - depth * 0.16);
  vec3 surfaceNormal = normalize(vec3(-normal * 0.17,1.0));
  float glint = pow(max(dot(surfaceNormal,normalize(vec3(-0.32,0.28,1.0))),0.0),95.0);
  water += baseColor * glint * 0.16;
  float foam = (1.0 - smoothstep(0.0,0.012,abs(coastline + tide)))
    * smoothstep(0.27,0.76,noise(point * 34.0 + time * 0.12));
  vec3 color = mix(sand,water,wet);
  color = mix(color,baseColor,foam * 0.58);
  gl_FragColor = vec4(color, 1.0);
}
`;

export default function WaterField({ className }: { className: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl", { alpha: false, antialias: false });
    if (!gl) return;
    const shaders: WebGLShader[] = [];
    const program = gl.createProgram();
    if (!program) return;
    const sources = [
      [gl.VERTEX_SHADER, "attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }"],
      [gl.FRAGMENT_SHADER, fragmentSource],
    ] as const;
    for (const [type, source] of sources) {
      const shader = gl.createShader(type);
      if (!shader) {
        shaders.forEach((item) => gl.deleteShader(item));
        gl.deleteProgram(program);
        return;
      }
      shaders.push(shader);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        shaders.forEach((item) => gl.deleteShader(item));
        gl.deleteProgram(program);
        return;
      }
      gl.attachShader(program, shader);
    }
    gl.linkProgram(program);
    shaders.forEach((shader) => gl.deleteShader(shader));
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      gl.deleteProgram(program);
      return;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.useProgram(program);
    const position = gl.getAttribLocation(program, "position");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const uniforms = {
      resolution: gl.getUniformLocation(program, "resolution"),
      time: gl.getUniformLocation(program, "time"),
      ripples: gl.getUniformLocation(program, "ripples[0]"),
    };
    const styles = getComputedStyle(canvas);
    const base = styles.getPropertyValue("--water-base").trim();
    const sand = styles.getPropertyValue("--water-sand").trim() || "#d9c8a4";
    const deepValue = styles.getPropertyValue("--water-ripple").trim();
    const deep = deepValue.startsWith("#")
      ? [1, 3, 5].map((offset) => parseInt(deepValue.slice(offset, offset + 2), 16))
      : deepValue.match(/[\d.]+/g);
    gl.uniform3f(gl.getUniformLocation(program, "baseColor"),
      parseInt(base.slice(1,3),16)/255, parseInt(base.slice(3,5),16)/255, parseInt(base.slice(5,7),16)/255);
    gl.uniform3f(gl.getUniformLocation(program, "deepColor"),
      Number(deep?.[0] ?? 57)/255, Number(deep?.[1] ?? 151)/255, Number(deep?.[2] ?? 158)/255);
    gl.uniform3f(gl.getUniformLocation(program, "sandColor"),
      parseInt(sand.slice(1,3),16)/255, parseInt(sand.slice(3,5),16)/255, parseInt(sand.slice(5,7),16)/255);
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, 1, 1, 0, gl.RGB, gl.UNSIGNED_BYTE,
      new Uint8Array([217, 200, 164]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.uniform1i(gl.getUniformLocation(program, "sandTexture"), 0);
    let disposed = false;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ripples = new Float32Array(32);
    let nextRipple = 0;
    let animation = 0;
    let elapsed = 0;
    let lastFrame = 0;
    let lastPointer = 0;
    const render = () => {
      gl.uniform2f(uniforms.resolution, canvas.width, canvas.height);
      gl.uniform1f(uniforms.time, elapsed);
      gl.uniform4fv(uniforms.ripples, ripples);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    };
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * ratio);
      canvas.height = Math.round(canvas.clientHeight * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
      render();
    };
    const draw = (now: number) => {
      if (lastFrame) elapsed += Math.min((now - lastFrame) / 1000, 0.05);
      lastFrame = now;
      render();
      animation = requestAnimationFrame(draw);
    };
    const syncMotion = () => {
      cancelAnimationFrame(animation);
      animation = 0;
      lastFrame = 0;
      if (!motion.matches && !document.hidden && !gl.isContextLost()) {
        animation = requestAnimationFrame(draw);
      }
    };
    const onPointer = (event: PointerEvent) => {
      if (motion.matches || document.hidden) return;
      const now = performance.now();
      if (event.type === "pointermove" && now - lastPointer < 90) return;
      lastPointer = now;
      const bounds = canvas.getBoundingClientRect();
      ripples.set([(event.clientX - bounds.left) / bounds.height * 5,
        (bounds.bottom - event.clientY) / bounds.height * 5, elapsed,
        event.type === "pointerdown" ? 1 : 0.35], nextRipple * 4);
      nextRipple = (nextRipple + 1) % 8;
    };
    const onContextLost = () => {
      cancelAnimationFrame(animation);
      canvas.style.visibility = "hidden";
    };
    resize();
    syncMotion();
    const sandImage = new Image();
    sandImage.onload = () => {
      if (disposed || gl.isContextLost()) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, sandImage);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      render();
    };
    sandImage.src = "/images/coastal-sand.jpg";
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onPointer, { passive: true });
    motion.addEventListener("change", syncMotion);
    document.addEventListener("visibilitychange", syncMotion);
    canvas.addEventListener("webglcontextlost", onContextLost);
    return () => {
      disposed = true;
      sandImage.onload = null;
      cancelAnimationFrame(animation);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onPointer);
      motion.removeEventListener("change", syncMotion);
      document.removeEventListener("visibilitychange", syncMotion);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      gl.deleteBuffer(buffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
