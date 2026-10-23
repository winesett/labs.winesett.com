import {Box3, Group, Vector3} from './vendor/three.module.js';
import {GLTFLoader} from './vendor/GLTFLoader.js';

/** Load Marcos Silva's CC-BY Echo Dot 3 model; preserve its geometry and textures. */
export function createEchoDot(options = {}) {
  const echo = new Group();
  echo.name = 'echo-dot-3-marcos-silva';
  const modelUrl = new URL('./assets/echo-dot/echo-dot-b3e185f026.glb', import.meta.url).href;
  echo.userData.ready = new GLTFLoader().loadAsync(modelUrl).then(({scene: model}) => {
    const geometries = new Set();
    const materials = new Set();
    const textures = new Set();
    model.traverse(node => {
      if (!node.isMesh) return;
      geometries.add(node.geometry);
      (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => {
        materials.add(material);
        Object.values(material).forEach(value => { if (value?.isTexture) textures.add(value); });
      });
    });
    if (options.isDisposed?.()) {
      textures.forEach(item => item.dispose());
      materials.forEach(item => item.dispose());
      geometries.forEach(item => item.dispose());
      return;
    }
    geometries.forEach(item => options.registerGeometry?.(item));
    materials.forEach(item => options.registerMaterial?.(item));
    textures.forEach(item => options.registerTexture?.(item));

    const bounds = new Box3().setFromObject(model);
    const size = bounds.getSize(new Vector3());
    const center = bounds.getCenter(new Vector3());
    const scale = 2.32 / Math.max(size.x, size.z);
    model.scale.multiplyScalar(scale);
    model.position.copy(center).multiplyScalar(-scale);
    echo.add(model);
    echo.userData.modelUrl = modelUrl;
    echo.userData.dimensions = size.multiplyScalar(scale).toArray();
    options.onLoad?.(echo);
  }).catch(error => options.onError?.(error));
  return echo;
}
