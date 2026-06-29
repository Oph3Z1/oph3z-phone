import {
  OrthographicCamera, Scene, WebGLRenderTarget, LinearFilter, NearestFilter,
  RGBAFormat, UnsignedByteType, CfxTexture, ShaderMaterial, PlaneBufferGeometry,
  Mesh, WebGLRenderer,
} from './module/Three.js';

let isAnimated = false;

class GameRender {
  constructor() {
    this.aspect = 9 / 19.5; // phone-ish portrait until a target is attached
    this.shift = 0; // horizontal crop shift as a fraction of width (- = left)

    const cameraRTT = new OrthographicCamera(
      window.innerWidth / -2, window.innerWidth / 2,
      window.innerHeight / 2, window.innerHeight / -2, -10000, 10000
    );
    cameraRTT.position.z = 0;
    cameraRTT.setViewOffset(window.innerWidth, window.innerHeight, 0, 0, window.innerWidth, window.innerHeight);

    const sceneRTT = new Scene();

    const rtTexture = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: LinearFilter, magFilter: NearestFilter, format: RGBAFormat, type: UnsignedByteType,
    });

    const gameTexture = new CfxTexture();
    gameTexture.needsUpdate = true;

    const material = new ShaderMaterial({
      uniforms: { tDiffuse: { value: gameTexture } },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = vec2(uv.x, 1.0 - uv.y);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        void main() {
          gl_FragColor = texture2D(tDiffuse, vUv);
        }
      `,
    });
    this.material = material;

    const plane = new PlaneBufferGeometry(window.innerWidth, window.innerHeight);
    const quad = new Mesh(plane, material);
    quad.position.z = -100;
    sceneRTT.add(quad);

    const renderer = new WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;

    // Offscreen host for the WebGL canvas (we only read pixels out of it).
    const host = document.createElement('div');
    host.id = 'three-game-render';
    host.style.display = 'none';
    document.body.append(host);
    host.appendChild(renderer.domElement);

    this.renderer = renderer;
    this.rtTexture = rtTexture;
    this.sceneRTT = sceneRTT;
    this.cameraRTT = cameraRTT;
    this.gameTexture = gameTexture;
    this.canvas = null;

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // Rebuild the scene/RT to render the full game frame.
  fullFrame() {
    const cameraRTT = new OrthographicCamera(
      window.innerWidth / -2, window.innerWidth / 2,
      window.innerHeight / 2, window.innerHeight / -2, -10000, 10000
    );
    cameraRTT.setViewOffset(window.innerWidth, window.innerHeight, 0, 0, window.innerWidth, window.innerHeight);
    this.cameraRTT = cameraRTT;

    const sceneRTT = new Scene();
    const plane = new PlaneBufferGeometry(window.innerWidth, window.innerHeight);
    const quad = new Mesh(plane, this.material);
    quad.position.z = -100;
    sceneRTT.add(quad);
    this.sceneRTT = sceneRTT;

    this.rtTexture = new WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      minFilter: LinearFilter, magFilter: NearestFilter, format: RGBAFormat, type: UnsignedByteType,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  animate() {
    requestAnimationFrame(this.animate);
    if (!isAnimated || !this.canvas) return;

    this.renderer.clear();
    this.renderer.render(this.sceneRTT, this.cameraRTT, this.rtTexture, true);

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Centered portrait strip matching the phone screen aspect (with optional
    // horizontal shift, e.g. to frame the character in selfie mode).
    let cw = Math.round(H * this.aspect);
    if (cw > W) cw = W;
    let sx = Math.floor((W - cw) / 2 + this.shift * W);
    if (sx < 0) sx = 0;
    if (sx > W - cw) sx = W - cw;

    const read = new Uint8Array(cw * H * 4);
    this.renderer.readRenderTargetPixels(this.rtTexture, sx, 0, cw, H, read);

    if (this.canvas.width !== cw) this.canvas.width = cw;
    if (this.canvas.height !== H) this.canvas.height = H;
    const ctx = this.canvas.getContext('2d');
    ctx.putImageData(new ImageData(new Uint8ClampedArray(read.buffer), cw, H), 0, 0);
  }

  // Start drawing the live game view into `element` (a <canvas>), cropped to the
  // element's aspect ratio (the phone screen).
  renderToTarget(element) {
    this.fullFrame();
    const w = element.clientWidth || 0;
    const h = element.clientHeight || 0;
    if (w > 0 && h > 0) this.aspect = w / h;
    this.shift = 0; // rear camera starts centered
    this.canvas = element;
    isAnimated = true;
  }

  // Shift the crop horizontally (fraction of width; negative = reveal the left).
  setShift(s) {
    this.shift = s || 0;
  }

  stop() {
    isAnimated = false;
    this.canvas = null;
  }
}

// CfxTexture needs the game render to be live; give the page a beat to settle.
setTimeout(() => {
  window.MainRender = new GameRender();
}, 800);
