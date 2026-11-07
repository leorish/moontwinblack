import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MoonPhase } from '../garden/types';
import { ambientMusic } from '../utils/ambientAudio';

interface Gothic3DSceneProps {
  moonPhase?: MoonPhase | 'auto';
  onClose?: () => void;
}

export const Gothic3DScene: React.FC<Gothic3DSceneProps> = ({ moonPhase = 'full', onClose }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [detachedCount, setDetachedCount] = useState<number>(0);
  const [isControlsCollapsed, setIsControlsCollapsed] = useState<boolean>(false);

  const effectivePhase = moonPhase === 'auto' ? 'full' : moonPhase;

  // Check if bioluminescent low-light mode is active
  const isBioluminescentPhase =
    effectivePhase === 'new' ||
    effectivePhase === 'waxing-crescent' ||
    effectivePhase === 'waning-crescent';

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // 1. Software-WebGL Detection Guard (per Three.js skill constitution)
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 2. Renderer & Color Pipeline
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 3. Scene, Camera & Studio Environment Reflection (RoomEnvironment)
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x050507, 0.035);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.2, 5.5);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 4. OrbitControls with Silky Damping
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = !isSoftwareGl;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.2;
    controls.maxDistance = 8.5;
    controls.maxPolarAngle = Math.PI / 2 + 0.15;
    controls.target.set(0, 1.4, 0);
    controls.update();

    // 5. Studio Lighting Rig
    // Warm Key Light with soft shadow mapping
    const keyLight = new THREE.DirectionalLight(0xffeedd, 2.8);
    keyLight.position.set(4, 6, 4);
    keyLight.castShadow = !isSoftwareGl;
    if (keyLight.castShadow) {
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.camera.near = 0.5;
      keyLight.shadow.camera.far = 15;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    scene.add(keyLight);

    // Cool fill Hemisphere Light
    const hemiLight = new THREE.HemisphereLight(0x7080a0, 0x151520, 1.2);
    scene.add(hemiLight);

    // Rim/Backlight for cold silver moonlight edge
    const rimLight = new THREE.DirectionalLight(0xc0d0f0, 2.2);
    rimLight.position.set(-4, 3, -4);
    scene.add(rimLight);

    // 5b. Celestial Gothic Moon in 3D Sky (Photorealistic Waxing Crescent)
    const textureLoader = new THREE.TextureLoader();
    const moonTexture = textureLoader.load('/assets/aistudio/realmoon_473551c2.webp');
    const moonPlane = new THREE.PlaneGeometry(3.0, 3.0);
    const moonMaterial = new THREE.MeshBasicMaterial({
      map: moonTexture,
      transparent: true,
      opacity: 0.96,
      depthWrite: false,
    });
    const moon3DMesh = new THREE.Mesh(moonPlane, moonMaterial);
    moon3DMesh.position.set(-3.4, 3.9, -5.2);
    moon3DMesh.lookAt(camera.position);
    scene.add(moon3DMesh);

    // 6. Ground Pedestal & Soft Contact Grounding Shadow
    const groundGeo = new THREE.CylinderGeometry(2.4, 2.6, 0.2, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0f,
      roughness: 0.85,
      metalness: 0.15,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.1;
    ground.receiveShadow = !isSoftwareGl;
    scene.add(ground);

    // 7. Composite Procedural Black Rose (3-12 Part THREE.Group)
    const roseGroup = new THREE.Group();
    roseGroup.position.set(0, 0, 0);

    // Materials
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x183020,
      roughness: 0.65,
      metalness: 0.08,
    });

    const thornMat = new THREE.MeshStandardMaterial({
      color: 0x3d0e18,
      roughness: 0.45,
      metalness: 0.15,
    });

    const sepalMat = new THREE.MeshStandardMaterial({
      color: 0x1f3d28,
      roughness: 0.55,
      metalness: 0.05,
    });

    // Luxury Velvet Black Petal Material (MeshPhysicalMaterial with sheen)
    const petalMaterials: THREE.MeshPhysicalMaterial[] = [];
    const createPetalMaterial = (roughnessVal: number, isInner: boolean) => {
      const mat = new THREE.MeshPhysicalMaterial({
        color: isInner ? 0x120408 : 0x09090c,
        roughness: roughnessVal,
        metalness: 0.04,
        sheen: 0.85,
        sheenColor: new THREE.Color(isInner ? 0x5a0e1c : 0x22222a),
        clearcoat: 0.12,
        clearcoatRoughness: 0.35,
        side: THREE.DoubleSide,
      });
      petalMaterials.push(mat);
      return mat;
    };

    // Part 1: Curved Stem TubeGeometry along 3D Spline
    const stemCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0.08, 0.5, -0.05),
      new THREE.Vector3(-0.06, 1.1, 0.04),
      new THREE.Vector3(0.02, 1.7, -0.02),
      new THREE.Vector3(0, 2.1, 0),
    ]);
    const stemGeo = new THREE.TubeGeometry(stemCurve, 32, 0.045, 12, false);
    const stemMesh = new THREE.Mesh(stemGeo, stemMat);
    stemMesh.castShadow = !isSoftwareGl;
    stemMesh.receiveShadow = !isSoftwareGl;
    roseGroup.add(stemMesh);

    // Part 2: Conical Thorns along Stem
    const thornGeo = new THREE.ConeGeometry(0.028, 0.09, 8);
    thornGeo.rotateZ(Math.PI / 2);
    const thornPositions = [
      { t: 0.22, angle: 0.8, side: 1 },
      { t: 0.38, angle: -1.2, side: -1 },
      { t: 0.58, angle: 2.1, side: 1 },
      { t: 0.75, angle: -0.6, side: -1 },
    ];
    thornPositions.forEach(({ t, angle }) => {
      const pt = stemCurve.getPointAt(t);
      const thorn = new THREE.Mesh(thornGeo, thornMat);
      thorn.position.copy(pt);
      thorn.rotation.y = angle;
      thorn.rotation.x = 0.25;
      roseGroup.add(thorn);
    });

    // Part 3: Stem Leaves (2 Organic curved leaves)
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, 0);
    leafShape.quadraticCurveTo(0.12, 0.25, 0, 0.5);
    leafShape.quadraticCurveTo(-0.12, 0.25, 0, 0);
    const leafGeo = new THREE.ShapeGeometry(leafShape, 12);
    leafGeo.rotateX(Math.PI / 2);

    const leaf1 = new THREE.Mesh(leafGeo, sepalMat);
    leaf1.position.copy(stemCurve.getPointAt(0.45));
    leaf1.rotation.set(0.4, 0.6, -0.4);
    leaf1.scale.set(0.9, 0.9, 0.9);
    roseGroup.add(leaf1);

    const leaf2 = new THREE.Mesh(leafGeo, sepalMat);
    leaf2.position.copy(stemCurve.getPointAt(0.68));
    leaf2.rotation.set(-0.3, -1.8, 0.3);
    leaf2.scale.set(0.8, 0.8, 0.8);
    roseGroup.add(leaf2);

    // Part 4: Sepals (5 sharp calyx leaves curving outward beneath bud)
    const sepalGroup = new THREE.Group();
    sepalGroup.position.set(0, 2.1, 0);
    for (let s = 0; s < 5; s++) {
      const sepalCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(0.12, -0.08, 0),
        new THREE.Vector3(0.24, -0.22, 0)
      );
      const sTube = new THREE.TubeGeometry(sepalCurve, 12, 0.02, 6, false);
      const sMesh = new THREE.Mesh(sTube, sepalMat);
      sMesh.rotation.y = (s * Math.PI * 2) / 5;
      sepalGroup.add(sMesh);
    }
    roseGroup.add(sepalGroup);

    // Part 5: Multi-layer Velvet Petals (5 concentric spiral whorls)
    const flowerHead = new THREE.Group();
    flowerHead.position.set(0, 2.15, 0);

    const petalLayers = [
      { count: 4, radius: 0.12, height: 0.28, tilt: 0.15, curl: 0.1, inner: true, roughness: 0.28 },
      { count: 5, radius: 0.20, height: 0.36, tilt: 0.32, curl: 0.2, inner: true, roughness: 0.32 },
      { count: 6, radius: 0.30, height: 0.44, tilt: 0.52, curl: 0.35, inner: false, roughness: 0.36 },
      { count: 7, radius: 0.42, height: 0.52, tilt: 0.75, curl: 0.55, inner: false, roughness: 0.42 },
      { count: 8, radius: 0.55, height: 0.58, tilt: 0.98, curl: 0.78, inner: false, roughness: 0.46 },
    ];

    const interactivePetals: THREE.Mesh[] = [];

    petalLayers.forEach((layer, layerIdx) => {
      const mat = createPetalMaterial(layer.roughness, layer.inner);
      for (let p = 0; p < layer.count; p++) {
        const angle = (p * Math.PI * 2) / layer.count + layerIdx * 0.42;

        // Curved Petal Geometry
        const pGeo = new THREE.SphereGeometry(
          layer.height,
          16,
          12,
          0,
          Math.PI * 0.9,
          0,
          Math.PI * 0.65
        );
        pGeo.scale(0.85, 1.1, 0.45);

        const petalMesh = new THREE.Mesh(pGeo, mat);
        petalMesh.position.set(
          Math.cos(angle) * layer.radius,
          layerIdx * 0.03,
          Math.sin(angle) * layer.radius
        );
        petalMesh.rotation.y = -angle + Math.PI / 2;
        petalMesh.rotation.x = layer.tilt;
        petalMesh.rotation.z = (Math.random() - 0.5) * 0.15;
        petalMesh.castShadow = !isSoftwareGl;
        petalMesh.receiveShadow = !isSoftwareGl;

        // Custom user data for raycasting and detach interaction
        petalMesh.userData = {
          isPetal: true,
          layerIndex: layerIdx,
          detached: false,
        };

        flowerHead.add(petalMesh);
        interactivePetals.push(petalMesh);
      }
    });

    // Part 6: Dewdrop Crystals (MeshPhysicalMaterial with transmission)
    if (!isSoftwareGl) {
      const dewMat = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transmission: 0.95,
        roughness: 0.04,
        ior: 1.45,
        transparent: true,
        opacity: 1,
      });
      const dewGeo = new THREE.SphereGeometry(0.024, 12, 12);
      const dewDrop1 = new THREE.Mesh(dewGeo, dewMat);
      dewDrop1.position.set(0.32, 2.3, 0.22);
      roseGroup.add(dewDrop1);

      const dewDrop2 = new THREE.Mesh(dewGeo, dewMat);
      dewDrop2.position.set(-0.25, 2.25, -0.28);
      roseGroup.add(dewDrop2);
    }

    roseGroup.add(flowerHead);
    scene.add(roseGroup);

    // 8. Detached 3D Petals Physics List
    interface DetachedPetal3D {
      mesh: THREE.Mesh;
      velocity: THREE.Vector3;
      rotVelocity: THREE.Vector3;
      life: number;
    }
    const detachedPetals: DetachedPetal3D[] = [];

    const detachSpecificPetal = (petalMesh: THREE.Mesh) => {
      if (petalMesh.userData.detached) return;
      petalMesh.userData.detached = true;

      // Extract world transform
      const worldPos = new THREE.Vector3();
      const worldQuat = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      petalMesh.getWorldPosition(worldPos);
      petalMesh.getWorldQuaternion(worldQuat);
      petalMesh.getWorldScale(worldScale);

      // Reparent to scene root for autonomous 3D falling
      flowerHead.remove(petalMesh);
      petalMesh.position.copy(worldPos);
      petalMesh.quaternion.copy(worldQuat);
      petalMesh.scale.copy(worldScale);
      scene.add(petalMesh);

      detachedPetals.push({
        mesh: petalMesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.8,
          -0.4 - Math.random() * 0.4,
          (Math.random() - 0.5) * 0.8
        ),
        rotVelocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.5,
          (Math.random() - 0.5) * 2.0,
          (Math.random() - 0.5) * 1.5
        ),
        life: 0,
      });

      // Play audio cue
      ambientMusic.playPetalDetachSound();
      setDetachedCount((prev) => prev + 1);
    };

    // 9. Interactive Raycasting on Click
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerDown = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(interactivePetals, false);

      if (intersects.length > 0) {
        const hit = intersects[0].object as THREE.Mesh;
        detachSpecificPetal(hit);
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    // 10. Animation Loop & Bioluminescent Pulsing Logic
    let frameId = 0;
    let clock = new THREE.Clock();

    function tick() {
      const delta = Math.min(0.05, clock.getDelta());
      const elapsedTime = clock.getElapsedTime();

      // Gentle natural breathing sway on rose head
      flowerHead.rotation.z = Math.sin(elapsedTime * 0.9) * 0.04;
      flowerHead.rotation.x = Math.cos(elapsedTime * 0.7) * 0.03;

      // Update Bioluminescent Emissive Glow when moon is new/crescent
      const isBio =
        moonPhase === 'new' ||
        moonPhase === 'waxing-crescent' ||
        moonPhase === 'waning-crescent';

      if (isBio) {
        const bioPulse = (Math.sin(elapsedTime * 1.2) + 1) * 0.5;
        const emissiveIntensity = 0.25 + 0.55 * bioPulse;
        petalMaterials.forEach((m) => {
          m.emissive.setHex(0x1ac8be);
          m.emissiveIntensity = emissiveIntensity;
        });
      } else {
        petalMaterials.forEach((m) => {
          m.emissive.setHex(0x000000);
          m.emissiveIntensity = 0;
        });
      }

      // Update Detached Falling Petals 3D Physics
      for (let i = detachedPetals.length - 1; i >= 0; i--) {
        const dp = detachedPetals[i];
        dp.life += delta;

        // Air resistance flutter
        dp.mesh.position.addScaledVector(dp.velocity, delta);
        dp.mesh.rotation.x += dp.rotVelocity.x * delta;
        dp.mesh.rotation.y += dp.rotVelocity.y * delta;
        dp.mesh.rotation.z += dp.rotVelocity.z * delta;

        dp.velocity.x += Math.sin(dp.life * 4.0) * 0.05;
        dp.velocity.z += Math.cos(dp.life * 3.5) * 0.05;

        // Ground landing
        if (dp.mesh.position.y <= 0.02) {
          dp.mesh.position.y = 0.02;
          dp.velocity.set(0, 0, 0);
          dp.rotVelocity.set(0, 0, 0);
        }

        // Fade after 12 seconds
        if (dp.life > 12) {
          scene.remove(dp.mesh);
          dp.mesh.geometry.dispose();
          detachedPetals.splice(i, 1);
        }
      }

      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(tick);
    }

    tick();

    // Resize Handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);

      controls.dispose();
      stemGeo.dispose();
      thornGeo.dispose();
      leafGeo.dispose();
      petalMaterials.forEach((m) => m.dispose());
      stemMat.dispose();
      thornMat.dispose();
      sepalMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();

      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [moonPhase]);

  return (
    <div className="relative w-full h-full select-none overflow-hidden bg-radial from-[#0e0f17] via-[#07070b] to-[#040406]">
      {/* 3D Scene Viewport Mount */}
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      {/* Zero-Occlusion Top Spec Badge */}
      <div className="absolute top-4 left-4 z-20 pointer-events-none">
        <div className="px-3 py-1.5 rounded-full bg-[#10111a]/80 border border-white/10 backdrop-blur-md flex items-center gap-2 text-xs font-mono text-[#a0a5b8]">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>THREE.JS STUDIO PBR &bull; VELVET SANCTUARY</span>
        </div>
      </div>

      {/* Bioluminescence Low-Light Indicator */}
      {isBioluminescentPhase && (
        <div className="absolute top-4 right-4 z-20 pointer-events-none">
          <div className="px-3 py-1.5 rounded-full bg-[#0d1e22]/85 border border-[#30d7cd]/30 backdrop-blur-md flex items-center gap-2 text-xs font-mono text-[#40e0d0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#40e0d0]" />
            <span>BIOLUMINESCENT NIGHT GLOW ACTIVE</span>
          </div>
        </div>
      )}

      {/* Zero-Occlusion Collapsible Bottom Dock (Consolidated controls, 100% unobstructed center) */}
      <div
        className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-30 transition-transform duration-300 pointer-events-auto ${
          isControlsCollapsed ? 'translate-y-[calc(100%-28px)]' : 'translate-y-0'
        }`}
        style={{ maxWidth: 'min(940px, 94vw)' }}
      >
        {/* Collapse / Expand Tab */}
        <div className="flex justify-center -mb-[1px]">
          <button
            onClick={() => setIsControlsCollapsed((prev) => !prev)}
            className="px-3 py-1 rounded-t-lg bg-[#141520]/90 border-t border-x border-white/15 text-[11px] font-mono text-[#9ea3b5] hover:text-white transition-colors flex items-center gap-1.5 backdrop-blur-md shadow-lg"
          >
            <span>{isControlsCollapsed ? '▴ Show 3D Dock' : '▾ Collapse Dock'}</span>
          </button>
        </div>

        {/* Dock Bar */}
        <div className="px-4 py-2.5 rounded-2xl bg-[#0f1018]/90 border border-white/15 backdrop-blur-xl shadow-2xl flex items-center gap-3 text-xs font-mono text-[#c0c4d8]">
          <div className="flex items-center gap-2 pr-2 border-r border-white/10">
            <span className="text-[#a0a5b8]">Interactive:</span>
            <span className="text-white">Click any petal to detach</span>
          </div>

          <div className="flex items-center gap-1.5 pr-2 border-r border-white/10">
            <span className="text-[#888c9f]">Detached:</span>
            <span className="px-1.5 py-0.5 rounded bg-white/10 text-white font-bold">{detachedCount}</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[#888c9f]">Orbit:</span>
            <span className="text-white/80">Drag to rotate &bull; Scroll to zoom</span>
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="ml-auto px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 text-white border border-white/15 transition-all text-xs font-mono"
            >
              Back to Garden
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
