import {createEchoDot} from './echo-dot.js';
import {
  AgXToneMapping,
  AmbientLight,
  CanvasTexture,
  BufferGeometry,
  Float32BufferAttribute,
  DynamicDrawUsage,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  Group,
  HemisphereLight,
  MathUtils,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PointLight,
  RectAreaLight,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from './vendor/three.module.js';

const CHOREOGRAPHY = [
[
      [0, 0],
      [0.2, 0.34],
      [0.42, 0.52],
      [0.62, 0.12],
      [1, 0],
    ],
[
      [0, 0],
      [0.2, 0.02],
      [0.42, 0.14],
      [0.62, 0.08],
      [1, 0],
    ],
[[0, 0], [0.2, -0.16], [0.42, 0.28], [0.62, 0.12], [1, -0.04]],
[[0, 0], [0.2, 0.28], [0.42, 0.62], [0.62, -0.28], [1, 0.08]],
[[0, 0], [0.2, -0.1], [0.42, 0.2], [0.62, -0.12], [1, 0]],
[[0, 0], [0.2, -0.28], [0.42, 0.08], [0.62, 0.2]],
[[0, -0.34], [0.2, -0.18], [0.42, 0.1], [0.62, 0.76]],
[[0, 0.04], [0.42, 0.08], [0.62, 0.04]],
[[0, 0.65], [0.2, 0.5], [0.42, 0.78], [0.62, 0.6], [1, 0.55]],
[[0, -0.08], [0.2, 0.24], [0.42, 0.5], [0.62, -0.12], [1, 0.26]],
[[0, 0], [0.2, -0.18], [0.42, 0.34], [0.62, -0.26], [1, 0.1]],
[[0, 1.18], [0.42, 1.18], [0.62, 1.05], [1, 0.85]]
];

const FRAME_INTERVAL = 1000 / 60;
const PICKUP_END = 0.16;
const GROUND_Y = -1.03;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 640;
const activeScenes = new WeakMap();

const clamp01 = (value) => MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
const smooth01 = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

function sampleKeyframes(progress, frames) {
  if (!frames?.length) return 0;
  const value = clamp01(progress);
  if (value <= frames[0][0]) return frames[0][1];
  for (let index = 1; index < frames.length; index += 1) {
    const [end, endValue] = frames[index];
    const [start, startValue] = frames[index - 1];
    if (value <= end) {
      return MathUtils.lerp(startValue, endValue, smooth01((value - start) / Math.max(0.0001, end - start)));
    }
  }
  return frames[frames.length - 1][1];
}

/**
 * Start the small editorial scene used by the Alexa Universal marketing page.
 *
 * The module can be loaded directly with `<script type="module" src="scene.js">`.
 * It also exports this function for a page shell that wants to control startup.
 */
export function startScene(options = {}) {
  if (typeof document === 'undefined' || typeof window === 'undefined') return null;

  const canvas = options.canvas || document.getElementById('relay-scene');
  const container = options.container || canvas?.closest('.hero-art') || document.querySelector('.hero-art');
  if (!canvas || !container) return null;

  const existing = activeScenes.get(canvas);
  if (existing) return existing;

  const fallback = container.querySelector('[data-scene-fallback]') || document.querySelector('[data-scene-fallback]');
  const showFallback = (visible) => {
    canvas.style.visibility = visible ? 'hidden' : 'visible';
    if (!fallback) return;
    fallback.hidden = !visible;
    // The hero owns the accessible image description; this decorative layer stays hidden from AT.
    fallback.setAttribute('aria-hidden', 'true');
    fallback.dataset.sceneFallbackVisible = visible ? 'true' : 'false';
  };

  // A missing WebGL implementation is a normal, non-fatal outcome for this enhancement.
  let renderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: false,
    });
  } catch {
    canvas.style.visibility = 'hidden';
    showFallback(true);
    const failed = { failed: true, dispose() {} };
    activeScenes.set(canvas, failed);
    return failed;
  }

  showFallback(true);
  canvas.dataset.modelStatus = 'loading';
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = AgXToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = false;

  const scene = new Scene();
  const camera = new PerspectiveCamera(35, DEFAULT_WIDTH / DEFAULT_HEIGHT, 0.1, 40);
  const stage = new Group();
  scene.add(stage);

  const ownedTextures = new Set();
  const ownedMaterials = new Set();
  const ownedGeometries = new Set();
  const registerTexture = (texture) => {
    if (texture) ownedTextures.add(texture);
    return texture;
  };
  const registerMaterial = (material) => {
    if (material) ownedMaterials.add(material);
    return material;
  };
  const registerGeometry = (geometry) => {
    if (geometry) ownedGeometries.add(geometry);
    return geometry;
  };

  const environmentTexture = registerTexture(createEnvironmentTexture());
  if (environmentTexture) {
    environmentTexture.mapping = EquirectangularReflectionMapping;
    environmentTexture.colorSpace = SRGBColorSpace;
    scene.environment = environmentTexture;
  }

  const lightRig = createLightRig();
  lightRig.lights.forEach((light) => scene.add(light));

  const speaker = createEchoDot({
    registerTexture,
    registerMaterial,
    registerGeometry,
    isDisposed: () => disposed,
    onLoad: () => {
      canvas.dataset.modelStatus = 'loaded';
      canvas.dataset.modelSource = 'echo-dot-3-marcos-silva';
      applyStoryState(storyCurrent, true);
      renderNow();
      showFallback(false);
    },
    onError: error => {
      canvas.dataset.modelStatus = 'error';
      showFallback(true);
      console.warn('Echo Dot model could not load.', error);
    },
  });
  const speakerMotion = new Group();
  speakerMotion.position.set(0, -0.34, 0.04);
  speakerMotion.add(speaker);
  stage.add(speakerMotion);

  const agentBranches = createAgentBranches({
    registerMaterial,
    registerGeometry,
    scene,
  });

  // Keep the shadow out of the rotating product group so the page reads as one grounded object.
  const groundShadow = createGroundShadow({ registerTexture, registerMaterial, registerGeometry });
  groundShadow.position.set(-0.10, -0.96, 0.12);
  scene.add(groundShadow);

  const shadowCatcher = new Mesh(
    registerGeometry(new PlaneGeometry(8, 5)),
    registerMaterial(new ShadowMaterial({ color: 0x26445c, opacity: 0.14, transparent: true, depthWrite: false })),
  );
  shadowCatcher.rotation.x = -Math.PI / 2;
  shadowCatcher.position.y = -0.965;
  shadowCatcher.receiveShadow = true;
  shadowCatcher.visible = false;
  scene.add(shadowCatcher);

  lightRig.key.castShadow = true;
  lightRig.key.shadow.mapSize.set(1024, 1024);
  lightRig.key.shadow.camera.near = 0.5;
  lightRig.key.shadow.camera.far = 16;
  lightRig.key.shadow.camera.left = -5;
  lightRig.key.shadow.camera.right = 5;
  lightRig.key.shadow.camera.top = 5;
  lightRig.key.shadow.camera.bottom = -4;

  const pointerTarget = new Vector2();
  const pointerCurrent = new Vector2();
  const storyTrack = container.closest('#relay-story') || document.getElementById('relay-story');
  const storyStage = storyTrack?.querySelector('.story-stage') || container.closest('.story-stage');
  const isStaticLayout = () => Boolean(storyTrack?.classList.contains('story-static'));
  const readInitialProgress = () => {
    const value = Number(storyStage?.dataset.progress ?? storyTrack?.dataset.progress ?? 0);
    return Number.isFinite(value) && !isStaticLayout() ? clamp01(value) : 0;
  };
  let storyTarget = readInitialProgress();
  let storyCurrent = storyTarget;
  let storyNeedsRender = true;
  let reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  let manuallyPaused = Boolean(document.body?.classList.contains('motion-paused'));
  let pageVisible = !document.hidden;
  let sceneVisible = true;
  let rafId = 0;
  let lastFrame = 0;
  let disposed = false;
  let contextLost = false;
  let size = { width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT };

  const ringCore = speaker.userData.ringCore;
  const ringGlow = speaker.userData.ringGlow;
  const speakerWorld = new Vector3();
  const branchRoot = new Vector3();
  const targetWorld = new Vector3();
  const targetLocal = new Vector3();
  const cameraPlanePoint = new Vector3();
  const cameraRay = new Vector3();
  const cameraLookAt = new Vector3();
  const agentNames = ['grok', 'muse', 'dot'];
  const agentLogoElements = agentNames.map(name => document.querySelector(`#agents [data-agent="${name}"] .agent-logo-wrap`));
  let cachedAgentTargets = null;
  let fallbackAgentTargets = [];
  const finalSpeakerTarget = new Vector3();
  const speakerAtUncoil = new Vector3(0.2, 0.76, 0.04);
  const connectorOffset = new Vector3(0.58, -0.08, 0.14);
  const agentFallbacks = [
    { x: 0.22, y: 0.65 },
    { x: 0.5, y: 0.65 },
    { x: 0.78, y: 0.65 },
  ];
  let responsiveScale = 1;

  const renderNow = () => {
    if (disposed || contextLost) return;
    renderer.render(scene, camera);
  };

  // Project DOM logo centers onto the fixed z=0 scene plane. When a logo is not
  // laid out yet, the chapter's documented 22/50/78% positions remain stable.
  const viewportWorld = (normalizedX, normalizedY, z = 0.04) => {
    cameraPlanePoint.set(normalizedX * 2 - 1, 1 - normalizedY * 2, 0.5).unproject(camera);
    cameraRay.copy(cameraPlanePoint).sub(camera.position).normalize();
    const distance = (z - camera.position.z) / cameraRay.z;
    return camera.position.clone().add(cameraRay.multiplyScalar(distance));
  };
  const resolveAgentTargets = () => {
    const rect = container.getBoundingClientRect?.();
    const width = Math.max(1, rect?.width || size.width);
    const height = Math.max(1, rect?.height || size.height);
    return agentNames.map((name, index) => {
      const logo = agentLogoElements[index];
      const logoRect = logo?.getBoundingClientRect?.();
      const visible = !isStaticLayout() && logoRect && logoRect.width > 1 && logoRect.height > 1;
      const normalizedX = visible
        ? MathUtils.clamp(((logoRect.left + logoRect.width * 0.5) - (rect?.left || 0)) / width, 0.04, 0.96)
        : agentFallbacks[index].x;
      const normalizedY = visible
        ? MathUtils.clamp(((logoRect.top + logoRect.height * 0.5) - (rect?.top || 0)) / height, 0.16, 0.9)
        : agentFallbacks[index].y;
      return viewportWorld(normalizedX, normalizedY);
    });
  };

  const applyStoryState = (progress, force = false) => {
    if (disposed || contextLost) return;
    const p = clamp01(progress);
    storyCurrent = p;
    const pickupPhase = smooth01(p / PICKUP_END);
    const speakerScale = sampleKeyframes(p, CHOREOGRAPHY[11]) * responsiveScale;
    const openingOffset = viewportWorld(0.5, 0.6, 0.04).y - viewportWorld(0.5, 0.5, 0.04).y;
    const restingGroundY = GROUND_Y + openingOffset;
    const restingY = restingGroundY + (speaker.userData.dimensions?.[1] || 0.85) * speakerScale / 2;

    stage.position.x = sampleKeyframes(p, CHOREOGRAPHY[0]);
    stage.position.y = sampleKeyframes(p, CHOREOGRAPHY[1]);
    stage.rotation.x = (sampleKeyframes(p, CHOREOGRAPHY[2]) + pointerCurrent.y * -0.038) * pickupPhase;
    stage.rotation.y = (sampleKeyframes(p, CHOREOGRAPHY[3]) + pointerCurrent.x * 0.075) * pickupPhase;
    stage.rotation.z = (sampleKeyframes(p, CHOREOGRAPHY[4]) + pointerCurrent.x * -0.012) * pickupPhase;

    if (p < 0.62) {
      speakerMotion.position.set(
        sampleKeyframes(p, CHOREOGRAPHY[5]),
        MathUtils.lerp(restingY, sampleKeyframes(p, CHOREOGRAPHY[6]), pickupPhase),
        sampleKeyframes(p, CHOREOGRAPHY[7]),
      );
    } else {
      targetWorld.copy(finalSpeakerTarget);
      stage.updateMatrixWorld(true);
      targetLocal.copy(targetWorld);
      stage.worldToLocal(targetLocal);
      speakerMotion.position.copy(speakerAtUncoil).lerp(targetLocal, smooth01((p - 0.62) / 0.38));
    }
    // The opening rests on its base; scroll lifts it into the existing choreography.
    speakerMotion.rotation.x = sampleKeyframes(p, CHOREOGRAPHY[8]) * pickupPhase;
    speakerMotion.rotation.y = sampleKeyframes(p, CHOREOGRAPHY[9]) * pickupPhase;
    speakerMotion.rotation.z = sampleKeyframes(p, CHOREOGRAPHY[10]) * pickupPhase;
    speakerMotion.scale.setScalar(speakerScale);

    const branchPhase = smooth01((p - 0.56) / 0.44);
    if (ringCore?.material) ringCore.material.opacity = MathUtils.lerp(0.92, 0.82, branchPhase);
    if (ringGlow?.material) ringGlow.material.opacity = MathUtils.lerp(0.12, 0.16, branchPhase);

    stage.updateMatrixWorld(true);
    speaker.getWorldPosition(speakerWorld);
    branchRoot.copy(speakerWorld).add(connectorOffset);
    if (p < 0.6) cachedAgentTargets = null;
    const targets = p >= 0.6 && !isStaticLayout()
      ? (cachedAgentTargets ||= resolveAgentTargets())
      : fallbackAgentTargets;
    agentBranches.update(p, branchRoot, targets, force);
    groundShadow.position.x = speakerWorld.x;
    groundShadow.position.y = MathUtils.lerp(restingGroundY, GROUND_Y, pickupPhase);
    groundShadow.scale.setScalar(MathUtils.lerp(1, 0.72, branchPhase));
    groundShadow.material.opacity = 0.2 * (1 - smooth01(p / 0.5));
    storyNeedsRender = false;
  };

  const fitCamera = () => {
    const rect = container.getBoundingClientRect?.();
    const width = Math.max(1, Math.round(rect?.width || canvas.clientWidth || DEFAULT_WIDTH));
    const height = Math.max(1, Math.round(rect?.height || canvas.clientHeight || DEFAULT_HEIGHT));
    size = { width, height };
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    responsiveScale = MathUtils.lerp(1, 1.3, MathUtils.clamp((0.78 - camera.aspect) / 0.34, 0, 1));

    // These bounds describe the whole choreography. The camera is fitted once
    // to them and only its aspect changes on resize, so animated transforms do
    // not cause the product to jump or crop at chapter boundaries.
    const safeHalfWidth = 4.25;
    const safeHalfHeight = 3.45;
    const verticalFov = MathUtils.degToRad(camera.fov);
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * camera.aspect);
    const distance = Math.max(
      safeHalfHeight / Math.tan(verticalFov / 2),
      safeHalfWidth / Math.tan(horizontalFov / 2),
    ) + 0.62;
    cameraLookAt.set(0, 0.15, 0);
    camera.position.set(0, 0.15, distance);
    camera.near = 0.1;
    camera.far = Math.max(40, distance * 4);
    camera.lookAt(cameraLookAt);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // Match the still image to the opening camera so loading does not move the product.
    if (fallback) {
      const openingScale = CHOREOGRAPHY[11][0][1] * responsiveScale;
      const groundY = GROUND_Y + viewportWorld(0.5, 0.6).y - viewportWorld(0.5, 0.5).y;
      const centerY = groundY + (speaker.userData.dimensions?.[1] || 0.85) * openingScale / 2;
      const posterCenter = new Vector3(0, centerY - 0.112 * responsiveScale, 0.04).project(camera);
      fallback.style.left = `${(posterCenter.x + 1) * width / 2}px`;
      fallback.style.top = `${(1 - posterCenter.y) * height / 2}px`;
      fallback.style.width = `${4.65 * responsiveScale * height / (2 * (distance - 0.04) * Math.tan(verticalFov / 2))}px`;
    }
    finalSpeakerTarget.copy(viewportWorld(0.5, 0.39, 0.04));
    fallbackAgentTargets = agentFallbacks.map(({x,y}) => viewportWorld(x,y));
    cachedAgentTargets = null;
    applyStoryState(storyCurrent, true);
    renderNow();
  };

  const motionPaused = () => manuallyPaused || reducedMotion;
  const canAnimate = () => !disposed && !contextLost && pageVisible && sceneVisible && !motionPaused();
  const stopLoop = () => {
    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = 0;
    }
  };
  const updateStaticFrame = () => {
    pointerTarget.set(0, 0);
    pointerCurrent.set(0, 0);
    storyCurrent = storyTarget;
    applyStoryState(storyCurrent, true);
    renderNow();
  };
  const frame = (time) => {
    rafId = 0;
    if (!canAnimate()) return;

    const elapsed = lastFrame ? Math.min(80, time - lastFrame) : FRAME_INTERVAL;
    lastFrame = time;
    const blend = 1 - Math.pow(0.001, elapsed / 1000);
    pointerCurrent.lerp(pointerTarget, blend * 0.9);
    storyCurrent = storyTarget;
    applyStoryState(storyCurrent);
    renderNow();

    const pointerDelta = pointerCurrent.distanceTo(pointerTarget);
    if (storyNeedsRender || Math.abs(storyCurrent - storyTarget) > 0.00035 || pointerDelta > 0.002) {
      rafId = window.requestAnimationFrame(frame);
    }
  };
  const ensureLoop = () => {
    if (!canAnimate() || rafId) return;
    lastFrame = 0;
    rafId = window.requestAnimationFrame(frame);
  };

  const onPointerMove = (event) => {
    if (motionPaused() || disposed) return;
    const rect = container.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    pointerTarget.set(
      MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
      MathUtils.clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1),
    );
    ensureLoop();
  };
  const onPointerLeave = () => {
    if (!motionPaused()) {
      pointerTarget.set(0, 0);
      ensureLoop();
    }
  };
  const onVisibilityChange = () => {
    pageVisible = !document.hidden;
    if (pageVisible) {
      if (motionPaused()) updateStaticFrame();
      else ensureLoop();
    } else {
      stopLoop();
    }
  };
  const onContextLost = (event) => {
    event.preventDefault();
    contextLost = true;
    stopLoop();
    canvas.style.visibility = 'hidden';
    showFallback(true);
  };
  const onContextRestored = () => {
    contextLost = false;
    fitCamera();
    showFallback(canvas.dataset.modelStatus !== 'loaded');
    if (motionPaused()) updateStaticFrame();
    else ensureLoop();
  };
  const onMotionPreferenceChange = (event) => {
    reducedMotion = event.matches;
    if (reducedMotion || isStaticLayout()) storyTarget = 0;
    if (motionPaused()) {
      stopLoop();
      updateStaticFrame();
    } else {
      storyNeedsRender = true;
      ensureLoop();
    }
  };
  const onRelayMotion = (event) => {
    if (typeof event.detail?.paused !== 'boolean') return;
    manuallyPaused = event.detail.paused;
    if (manuallyPaused || isStaticLayout()) storyTarget = 0;
    if (motionPaused()) {
      stopLoop();
      updateStaticFrame();
    } else {
      storyNeedsRender = true;
      ensureLoop();
    }
  };
  const onRelayStory = (event) => {
    const next = Number(event.detail?.progress);
    if (!Number.isFinite(next)) return;
    storyTarget = isStaticLayout() || reducedMotion || manuallyPaused ? 0 : clamp01(next);
    storyNeedsRender = true;
    if (motionPaused()) {
      updateStaticFrame();
    } else if (canAnimate()) {
      applyStoryState(storyTarget);
      renderNow();
    }
  };
  const onPageHide = (event) => {
    if (!event.persisted) controller?.dispose();
  };

  canvas.addEventListener('webglcontextlost', onContextLost, false);
  canvas.addEventListener('webglcontextrestored', onContextRestored, false);
  container.addEventListener('pointermove', onPointerMove, { passive: true });
  container.addEventListener('pointerleave', onPointerLeave, { passive: true });
  document.addEventListener('visibilitychange', onVisibilityChange, false);
  window.addEventListener('pagehide', onPageHide, false);
  window.addEventListener('relay-motion', onRelayMotion, false);
  window.addEventListener('relay-story', onRelayStory, false);

  const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  motionQuery?.addEventListener?.('change', onMotionPreferenceChange);

  let resizeObserver;
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      fitCamera();
      if (motionPaused()) updateStaticFrame();
      else ensureLoop();
    });
    resizeObserver.observe(container);
  } else {
    window.addEventListener('resize', fitCamera, { passive: true });
  }

  let intersectionObserver;
  if (typeof IntersectionObserver !== 'undefined') {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        sceneVisible = entries[0]?.isIntersecting ?? true;
        if (sceneVisible) {
          if (motionPaused()) updateStaticFrame();
          else ensureLoop();
        } else {
          stopLoop();
        }
      },
      { threshold: 0.01 },
    );
    intersectionObserver.observe(container);
  }

  fitCamera();
  if (motionPaused()) updateStaticFrame();
  else ensureLoop();

  const controller = {
    renderer,
    scene,
    camera,
    stage,
    get size() {
      return { ...size };
    },
    render: renderNow,
    dispose() {
      if (disposed) return;
      disposed = true;
      stopLoop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      motionQuery?.removeEventListener?.('change', onMotionPreferenceChange);
      canvas.removeEventListener('webglcontextlost', onContextLost, false);
      canvas.removeEventListener('webglcontextrestored', onContextRestored, false);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      window.removeEventListener('resize', fitCamera);
      document.removeEventListener('visibilitychange', onVisibilityChange, false);
      window.removeEventListener('pagehide', onPageHide, false);
      window.removeEventListener('relay-motion', onRelayMotion, false);
      window.removeEventListener('relay-story', onRelayStory, false);

      ownedGeometries.forEach((geometry) => geometry.dispose());
      ownedMaterials.forEach((material) => material.dispose());
      ownedTextures.forEach((texture) => texture.dispose());
      scene.clear();
      renderer.dispose();
      canvas.style.visibility = 'hidden';
      showFallback(true);
      if (activeScenes.get(canvas) === controller) activeScenes.delete(canvas);
    },
  };
  activeScenes.set(canvas, controller);
  return controller;
}

function createAgentBranches({ registerMaterial, registerGeometry, scene }) {
  const group = new Group();
  group.name = 'agent-branches';
  group.visible = false;
  scene.add(group);
  const segments = 72;
  const sides = 8;
  const radius = 0.046;
  const beadGeometry = registerGeometry(new SphereGeometry(0.063, 16, 10));
  const beadMaterial = registerMaterial(new MeshBasicMaterial({color: 0x2de7ff, toneMapped: false}));
  const radial = Array.from({length: sides + 1}, (_, j) => [Math.cos(j / sides * Math.PI * 2), Math.sin(j / sides * Math.PI * 2)]);

  const branches = ['grok', 'muse', 'dot'].map(name => {
    // Allocate once. Scrolling only updates the existing vertex buffers.
    const geometry = registerGeometry(new BufferGeometry());
    const positions = new Float32BufferAttribute(new Float32Array((segments + 1) * (sides + 1) * 3), 3);
    const normals = new Float32BufferAttribute(new Float32Array(positions.array.length), 3);
    positions.setUsage(DynamicDrawUsage);
    normals.setUsage(DynamicDrawUsage);
    geometry.setAttribute('position', positions);
    geometry.setAttribute('normal', normals);
    const indices = [];
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < sides; j++) {
        const a = i * (sides + 1) + j;
        const b = a + sides + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    }
    geometry.setIndex(indices);
    geometry.setDrawRange(0, 0);
    const material = registerMaterial(new MeshStandardMaterial({color: 0x05a0d1, roughness: 0.45, metalness: 0.025, transparent: true, opacity: 0}));
    const core = new Mesh(geometry, material);
    core.frustumCulled = false;
    const bead = new Mesh(beadGeometry, beadMaterial);
    bead.visible = false;
    group.add(core, bead);
    return {name, geometry, positions, normals, core, bead, lastRoot: new Vector3(Infinity,Infinity,Infinity), lastTarget: new Vector3(Infinity,Infinity,Infinity)};
  });

  const updatePath = (branch, root, target) => {
    const dx = target.x - root.x, dy = target.y - root.y, dz = target.z - root.z;
    const position = branch.positions.array, normal = branch.normals.array;
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const eased = t * t * (3 - 2 * t);
      const arch = Math.sin(Math.PI * t);
      const x = root.x + dx * eased;
      const y = root.y + dy * t + 0.32 * arch;
      const z = root.z + dz * t + 0.1 * arch;
      let tx = dx * 6 * t * (1 - t), ty = dy + 0.32 * Math.PI * Math.cos(Math.PI * t), tz = dz + 0.1 * Math.PI * Math.cos(Math.PI * t);
      const tangentLength = Math.hypot(tx,ty,tz) || 1;
      tx /= tangentLength; ty /= tangentLength; tz /= tangentLength;
      const normalLength = Math.hypot(tx,ty) || 1;
      const nx = ty / normalLength, ny = -tx / normalLength;
      const bx = -tz * ny, by = tz * nx, bz = tx * ny - ty * nx;
      for (let j = 0; j <= sides; j++) {
        const [c, sn] = radial[j];
        const vx = nx * c + bx * sn, vy = ny * c + by * sn, vz = bz * sn;
        const offset = (i * (sides + 1) + j) * 3;
        position[offset] = x + radius * vx;
        position[offset + 1] = y + radius * vy;
        position[offset + 2] = z + radius * vz;
        normal[offset] = vx; normal[offset + 1] = vy; normal[offset + 2] = vz;
      }
    }
    branch.positions.needsUpdate = true;
    branch.normals.needsUpdate = true;
    branch.lastRoot.copy(root);
    branch.lastTarget.copy(target);
  };

  return {group, update(progress, root, targets, force = false) {
    group.visible = progress > 0.56;
    branches.forEach((branch, index) => {
      const target = targets[index] || root;
      const growth = smooth01((progress - (0.6 + index * 0.12)) / 0.1);
      branch.core.visible = growth > 0;
      branch.bead.visible = growth > 0 && growth < 0.998;
      if (!growth) return;
      if (force || branch.lastRoot.distanceToSquared(root) > 0.0000001 || branch.lastTarget.distanceToSquared(target) > 0.0000001) updatePath(branch, root, target);
      const ringCount = Math.ceil(segments * growth);
      branch.geometry.setDrawRange(0, ringCount * sides * 6);
      branch.core.material.opacity = 0.96 * smooth01((progress - 0.56) / 0.12);
      if (branch.bead.visible) {
        const t = ringCount / segments;
        const eased = t * t * (3 - 2 * t), arch = Math.sin(Math.PI * t);
        branch.bead.position.set(root.x + (target.x-root.x)*eased, root.y + (target.y-root.y)*t + .32*arch, root.z + (target.z-root.z)*t + .1*arch);
      }
    });
  }};
}

function createLightRig() {
  const key = new DirectionalLight(0xffffff, 3.1);
  key.position.set(-3.6, 5.6, 4.5);
  key.target.position.set(-0.3, 0.1, 0);

  const fill = new RectAreaLight(0xd9eaff, 4.1, 4.4, 3.5);
  fill.position.set(2.5, 2.5, 3.2);
  fill.lookAt(0.25, 0.15, 0);

  const rim = new RectAreaLight(0xe5ebf2, 3.4, 3.0, 4.4);
  rim.position.set(-2.9, 1.6, -2.4);
  rim.lookAt(-0.8, 0.1, 0);

  const hemisphere = new HemisphereLight(0xe7f1ff, 0x526070, 1.7);
  hemisphere.position.set(0, 4, 0);

  const ambient = new AmbientLight(0xc9d7e6, 0.35);
  const cyan = new PointLight(0x2de7ff, 0.55, 4.2, 2);
  cyan.position.set(-0.85, -0.72, 0.7);

  // Targets are separate Object3Ds in Three.js and must be added to the scene to update.
  return { key, lights: [key, key.target, fill, rim, hemisphere, ambient, cyan] };
}

function createGroundShadow({ registerTexture, registerMaterial, registerGeometry }) {
  const texture = registerTexture(createShadowTexture());
  const material = registerMaterial(
    new MeshBasicMaterial({
      color: 0x284c63,
      map: texture,
      transparent: true,
      opacity: 0.32,
      depthWrite: false,
      side: DoubleSide,
    }),
  );
  const shadow = new Mesh(registerGeometry(new PlaneGeometry(4.6, 1.55)), material);
  shadow.rotation.x = -Math.PI / 2;
  shadow.renderOrder = -1;
  return shadow;
}

function createEnvironmentTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (!context) return null;

  const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#b8c8d9');
  gradient.addColorStop(0.4, '#e8edf1');
  gradient.addColorStop(0.72, '#f4f6f8');
  gradient.addColorStop(1, '#c4d1df');
  context.fillStyle = gradient;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const softLight = context.createRadialGradient(110, 86, 16, 110, 86, 230);
  softLight.addColorStop(0, 'rgba(255, 255, 255, 0.92)');
  softLight.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = softLight;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const coolLight = context.createRadialGradient(420, 135, 10, 420, 135, 185);
  coolLight.addColorStop(0, 'rgba(169, 219, 241, 0.6)');
  coolLight.addColorStop(1, 'rgba(169, 219, 241, 0)');
  context.fillStyle = coolLight;
  context.fillRect(0, 0, canvas.width, canvas.height);
  return new CanvasTexture(canvas);
}

function createShadowTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const gradient = context.createRadialGradient(128, 64, 4, 128, 64, 128);
  gradient.addColorStop(0, 'rgba(29, 45, 61, 0.5)');
  gradient.addColorStop(0.52, 'rgba(29, 45, 61, 0.22)');
  gradient.addColorStop(1, 'rgba(29, 45, 61, 0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 128);
  return new CanvasTexture(canvas);
}

function boot() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => startScene(), { once: true });
  } else {
    startScene();
  }
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') boot();

export default startScene;
