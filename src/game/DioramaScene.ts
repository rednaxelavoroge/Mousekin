import * as THREE from 'three';
import { SeasonParticles, Season } from './SeasonParticles';
import { Clock3D } from './Clock3D';
import { Character3D } from './Character3D';
import { SoundManager } from './AudioSystem';

export class DioramaScene {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private container: HTMLElement;

  // Scene Components
  public seasonParticles: SeasonParticles;
  public clock: Clock3D;
  public character: Character3D;
  public soundManager: SoundManager;

  // Lights
  private ambientLight: THREE.AmbientLight;
  private dirLight: THREE.DirectionalLight;
  private lampLight: THREE.PointLight;

  // Room Meshes
  private roomGroup: THREE.Group;
  private windowGroup: THREE.Group;
  private windowShutterLeft: THREE.Mesh;
  private windowShutterRight: THREE.Mesh;
  private isWindowOpen: boolean = true;
  private windowSkyMesh: THREE.Mesh;

  // Camera Orbit Interaction
  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraTargetRotation = { x: 0.35, y: -0.45 };
  private cameraCurrentRotation = { x: 0.35, y: -0.45 };
  private cameraDistance: number = 8.5;

  private raycaster = new THREE.Raycaster();
  private mouseVector = new THREE.Vector2();

  private onInteractionCallback?: (name: string) => void;

  constructor(container: HTMLElement, soundManager: SoundManager) {
    this.container = container;
    this.soundManager = soundManager;

    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x16132b); // Deep cozy night/fairytale indigo

    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 720;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    container.appendChild(this.renderer.domElement);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.updateCameraTransform();

    // 3. Lighting
    this.ambientLight = new THREE.AmbientLight(0xffeedd, 0.7);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffae0, 1.2);
    this.dirLight.position.set(5, 10, 6);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.001;
    this.scene.add(this.dirLight);

    // Cozy Bedside Lamp PointLight
    this.lampLight = new THREE.PointLight(0xff9933, 1.8, 6);
    this.lampLight.position.set(2.2, 1.6, -1.2);
    this.lampLight.castShadow = true;
    this.scene.add(this.lampLight);

    // 4. Build Room & Environment
    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    this.windowGroup = new THREE.Group();
    this.windowShutterLeft = new THREE.Mesh();
    this.windowShutterRight = new THREE.Mesh();
    this.windowSkyMesh = new THREE.Mesh();

    this.buildRoom();

    // 5. Add 3D Clock
    this.clock = new Clock3D();
    this.clock.group.position.set(-2.8, 2.2, -0.5);
    this.clock.group.rotation.y = Math.PI / 4;
    this.scene.add(this.clock.group);

    // 6. Add 3D Character (Little Mouse)
    this.character = new Character3D();
    this.character.group.position.set(-0.2, 0, 0.5);
    this.character.group.rotation.y = -0.15;
    this.scene.add(this.character.group);

    // 7. Add Seasonal Particles
    this.seasonParticles = new SeasonParticles();
    this.scene.add(this.seasonParticles.group);

    // 8. Event Listeners
    this.setupInteractions();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public setInteractionCallback(cb: (name: string) => void) {
    this.onInteractionCallback = cb;
  }

  private buildRoom() {
    // A. Floor (Warm wooden parquet planks)
    const floorGeom = new THREE.BoxGeometry(6.4, 0.3, 6.4);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xb57843,
      roughness: 0.65,
      metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Floor edge trim (dark wood)
    const trimGeom = new THREE.BoxGeometry(6.6, 0.1, 6.6);
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x5a2d10 });
    const trim = new THREE.Mesh(trimGeom, trimMat);
    trim.position.y = -0.22;
    this.roomGroup.add(trim);

    // B. Back Wall (Soft warm wallpaper)
    const backWallGeom = new THREE.BoxGeometry(6.4, 4.5, 0.25);
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0xf4ecd8,
      roughness: 0.8
    });
    const backWall = new THREE.Mesh(backWallGeom, wallMat);
    backWall.position.set(0, 2.1, -3.1);
    backWall.receiveShadow = true;
    this.roomGroup.add(backWall);

    // C. Left Wall (with wallpaper)
    const leftWallGeom = new THREE.BoxGeometry(0.25, 4.5, 6.4);
    const leftWall = new THREE.Mesh(leftWallGeom, wallMat);
    leftWall.position.set(-3.1, 2.1, 0);
    leftWall.receiveShadow = true;
    this.roomGroup.add(leftWall);

    // D. True 3D Fairy-tale Bed
    const bedGroup = new THREE.Group();
    bedGroup.position.set(1.5, 0, -1.8);
    bedGroup.rotation.y = -0.2;

    const woodBedMat = new THREE.MeshStandardMaterial({ color: 0x6e3c15, roughness: 0.5 });
    const sheetMat = new THREE.MeshStandardMaterial({ color: 0xf2ebdc, roughness: 0.8 });
    const quiltMat = new THREE.MeshStandardMaterial({ color: 0x33446b, roughness: 0.7 });
    const pillowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });

    // 4 Corner Wooden Posts
    for (const x of [-1.1, 1.1]) {
      for (const z of [-0.65, 0.65]) {
        const postH = (x < 0) ? 1.4 : 0.85;
        const postGeom = new THREE.CylinderGeometry(0.06, 0.06, postH, 12);
        postGeom.translate(0, postH / 2, 0);
        const post = new THREE.Mesh(postGeom, woodBedMat);
        post.position.set(x, 0, z);
        post.castShadow = true;
        bedGroup.add(post);

        const finialGeom = new THREE.SphereGeometry(0.08, 12, 12);
        const finial = new THREE.Mesh(finialGeom, new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.3 }));
        finial.position.set(x, postH, z);
        bedGroup.add(finial);
      }
    }

    // Headboard slats
    const headboardGeom = new THREE.BoxGeometry(0.08, 0.7, 1.2);
    const headboard = new THREE.Mesh(headboardGeom, woodBedMat);
    headboard.position.set(-1.1, 0.8, 0);
    bedGroup.add(headboard);

    // Bed Frame base
    const baseGeom = new THREE.BoxGeometry(2.1, 0.18, 1.25);
    const base = new THREE.Mesh(baseGeom, woodBedMat);
    base.position.set(0, 0.35, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    bedGroup.add(base);

    // Soft Mattress
    const mattressGeom = new THREE.BoxGeometry(2.0, 0.28, 1.2);
    const mattress = new THREE.Mesh(mattressGeom, sheetMat);
    mattress.position.set(0, 0.52, 0);
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    bedGroup.add(mattress);

    // Fluffy Pillow
    const pillowGeom = new THREE.BoxGeometry(0.45, 0.16, 0.85);
    pillowGeom.scale(1, 0.8, 1);
    const pillow = new THREE.Mesh(pillowGeom, pillowMat);
    pillow.position.set(-0.7, 0.72, 0);
    pillow.rotation.z = -0.15;
    pillow.castShadow = true;
    bedGroup.add(pillow);

    // Cozy Quilt / Blanket
    const quiltGeom = new THREE.BoxGeometry(1.4, 0.31, 1.22);
    const quilt = new THREE.Mesh(quiltGeom, quiltMat);
    quilt.position.set(0.3, 0.54, 0);
    quilt.castShadow = true;
    quilt.receiveShadow = true;
    bedGroup.add(quilt);

    this.roomGroup.add(bedGroup);

    // E. Nightstand + Glowing Lantern
    const standGeom = new THREE.CylinderGeometry(0.4, 0.45, 0.9, 16);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x7c4722, roughness: 0.6 });
    const stand = new THREE.Mesh(standGeom, standMat);
    stand.position.set(2.2, 0.45, -0.6);
    stand.castShadow = true;
    stand.receiveShadow = true;
    this.roomGroup.add(stand);

    // Lantern
    const lanternGeom = new THREE.CylinderGeometry(0.18, 0.22, 0.4, 8);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffdd88,
      emissive: 0xffaa33,
      emissiveIntensity: 0.9,
      roughness: 0.2
    });
    const lantern = new THREE.Mesh(lanternGeom, lanternMat);
    lantern.position.set(2.2, 1.1, -0.6);
    this.roomGroup.add(lantern);

    // F. Fairy-Tale 3D Window
    this.buildWindow();

    // G. Starry Rug on the Floor
    const rugGeom = new THREE.CircleGeometry(1.6, 32);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0x2b3456,
      roughness: 0.9
    });
    const rug = new THREE.Mesh(rugGeom, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.2, 0.01, 0.5);
    rug.receiveShadow = true;
    this.roomGroup.add(rug);
  }

  private buildWindow() {
    this.windowGroup.position.set(-0.4, 2.5, -3.0);

    // Window Outer Frame (4 Border Bars)
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6e3c15, roughness: 0.5 });
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.2), frameMat);
    topBar.position.set(0, 1.35, 0);
    this.windowGroup.add(topBar);

    const btmBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.15, 0.2), frameMat);
    btmBar.position.set(0, -1.35, 0);
    this.windowGroup.add(btmBar);

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.7, 0.2), frameMat);
    leftBar.position.set(-1.15, 0, 0);
    this.windowGroup.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2.7, 0.2), frameMat);
    rightBar.position.set(1.15, 0, 0);
    this.windowGroup.add(rightBar);

    // Window Viewport / Sky (Parallax view into the world)
    const skyTex = new THREE.TextureLoader().load('/assets/images/ios111.jpg');
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyGeom = new THREE.PlaneGeometry(2.2, 2.6);
    const skyMat = new THREE.MeshBasicMaterial({ map: skyTex });
    this.windowSkyMesh = new THREE.Mesh(skyGeom, skyMat);
    this.windowSkyMesh.position.set(0, 0, 0.04);
    this.windowGroup.add(this.windowSkyMesh);

    // Cross mullion bars
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 0.06), frameMat);
    barV.position.set(0, 0, 0.08);
    this.windowGroup.add(barV);

    const barH = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), frameMat);
    barH.position.set(0, 0.2, 0.08);
    this.windowGroup.add(barH);

    // Window Shutters (Left & Right)
    const shutterGeom = new THREE.BoxGeometry(1.0, 2.5, 0.08);
    shutterGeom.translate(0.5, 0, 0); // Pivot on edge
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x8b5226, roughness: 0.6 });

    this.windowShutterLeft = new THREE.Mesh(shutterGeom, shutterMat);
    this.windowShutterLeft.position.set(-1.05, 0, 0.12);
    this.windowShutterLeft.rotation.y = Math.PI * 0.5; // open
    this.windowGroup.add(this.windowShutterLeft);

    const shutterRightGeom = new THREE.BoxGeometry(1.0, 2.5, 0.08);
    shutterRightGeom.translate(-0.5, 0, 0); // Pivot on edge
    this.windowShutterRight = new THREE.Mesh(shutterRightGeom, shutterMat);
    this.windowShutterRight.position.set(1.05, 0, 0.12);
    this.windowShutterRight.rotation.y = -Math.PI * 0.5; // open
    this.windowGroup.add(this.windowShutterRight);

    this.roomGroup.add(this.windowGroup);
  }

  public toggleWindow() {
    this.isWindowOpen = !this.isWindowOpen;
    const targetAngle = this.isWindowOpen ? Math.PI * 0.5 : 0;
    this.windowShutterLeft.rotation.y = targetAngle;
    this.windowShutterRight.rotation.y = -targetAngle;
  }

  public setSeason(season: Season) {
    this.seasonParticles.setSeason(season);

    // Dynamically adjust lighting and room mood based on season
    if (season === 'winter') {
      this.scene.background = new THREE.Color(0x0e172a);
      this.ambientLight.color.setHex(0xaad5f5);
      this.ambientLight.intensity = 0.55;
      this.dirLight.color.setHex(0xc2e2fa);
      this.dirLight.intensity = 0.9;
      this.lampLight.intensity = 2.2;
    } else if (season === 'summer') {
      this.scene.background = new THREE.Color(0x191438);
      this.ambientLight.color.setHex(0xffeedd);
      this.ambientLight.intensity = 0.75;
      this.dirLight.color.setHex(0xfffae0);
      this.dirLight.intensity = 1.3;
      this.lampLight.intensity = 1.5;
    } else if (season === 'autumn') {
      this.scene.background = new THREE.Color(0x24141d);
      this.ambientLight.color.setHex(0xfad3aa);
      this.ambientLight.intensity = 0.65;
      this.dirLight.color.setHex(0xffb877);
      this.dirLight.intensity = 1.1;
      this.lampLight.intensity = 2.0;
    } else if (season === 'spring') {
      this.scene.background = new THREE.Color(0x1a1d30);
      this.ambientLight.color.setHex(0xfce8ee);
      this.ambientLight.intensity = 0.7;
      this.dirLight.color.setHex(0xffe6b0);
      this.dirLight.intensity = 1.2;
      this.lampLight.intensity = 1.6;
    }
  }

  private setupInteractions() {
    const el = this.renderer.domElement;

    // Mouse / Touch Drag for 3D Camera Orbit
    const onStart = (clientX: number, clientY: number) => {
      this.isDragging = true;
      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.isDragging) return;
      const deltaX = clientX - this.previousMousePosition.x;
      const deltaY = clientY - this.previousMousePosition.y;

      this.cameraTargetRotation.y += deltaX * 0.006;
      this.cameraTargetRotation.x = Math.max(0.1, Math.min(0.7, this.cameraTargetRotation.x + deltaY * 0.006));

      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onEnd = () => {
      this.isDragging = false;
    };

    el.addEventListener('mousedown', (e) => onStart(e.clientX, e.clientY));
    window.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', onEnd);

    el.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) onStart(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: true });

    window.addEventListener('touchend', onEnd);

    // Click / Tap Raycasting for Props
    el.addEventListener('click', (e) => {
      const rect = el.getBoundingClientRect();
      this.mouseVector.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseVector.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouseVector, this.camera);

      // Check click on Mouse
      const charHits = this.raycaster.intersectObject(this.character.group, true);
      if (charHits.length > 0) {
        this.character.jump();
        this.soundManager.playPurr();
        if (this.onInteractionCallback) this.onInteractionCallback('mouse');
        return;
      }

      // Check click on Clock
      const clockHits = this.raycaster.intersectObject(this.clock.group, true);
      if (clockHits.length > 0) {
        this.clock.spinFast();
        this.soundManager.playSpringWinding();
        if (this.onInteractionCallback) this.onInteractionCallback('clock');
        return;
      }

      // Check click on Window
      const windowHits = this.raycaster.intersectObject(this.windowGroup, true);
      if (windowHits.length > 0) {
        this.toggleWindow();
        if (this.onInteractionCallback) this.onInteractionCallback('window');
        return;
      }
    });
  }

  private updateCameraTransform() {
    // Smooth camera inertia
    this.cameraCurrentRotation.x += (this.cameraTargetRotation.x - this.cameraCurrentRotation.x) * 0.1;
    this.cameraCurrentRotation.y += (this.cameraTargetRotation.y - this.cameraCurrentRotation.y) * 0.1;

    const rotX = this.cameraCurrentRotation.x;
    const rotY = this.cameraCurrentRotation.y;

    const posX = Math.sin(rotY) * Math.cos(rotX) * this.cameraDistance;
    const posY = Math.sin(rotX) * this.cameraDistance + 1.2;
    const posZ = Math.cos(rotY) * Math.cos(rotX) * this.cameraDistance;

    this.camera.position.set(posX, posY, posZ);
    this.camera.lookAt(0, 1.4, 0);
  }

  public onWindowResize() {
    if (!this.container) return;
    const width = this.container.clientWidth || window.innerWidth || 1280;
    const height = this.container.clientHeight || window.innerHeight || 720;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public render(time: number) {
    this.updateCameraTransform();
    this.clock.update(time);
    this.character.update(time);
    this.seasonParticles.update(time);
    this.renderer.render(this.scene, this.camera);
  }
}
