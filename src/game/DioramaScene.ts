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
  private windowSpotLight: THREE.SpotLight;

  // Stages Groups
  private roomGroup: THREE.Group;
  private skyStageGroup: THREE.Group;
  private clocktownStageGroup: THREE.Group;
  private charactersStageGroup: THREE.Group;

  // Room Components
  private windowGroup: THREE.Group;
  private windowShutterLeft: THREE.Mesh;
  private windowShutterRight: THREE.Mesh;
  private isWindowOpen: boolean = true;
  private windowSkyMesh: THREE.Mesh;
  private dustPoints?: THREE.Points;

  // Cloud Flight Stage Objects
  private flightCloud?: THREE.Mesh;
  private parallaxClouds: THREE.Mesh[] = [];
  private goldenGears: THREE.Mesh[] = [];

  // Clocktown Stage Objects
  private timecycleGroup: THREE.Group;
  private catMesh?: THREE.Mesh;
  private snailMesh?: THREE.Mesh;
  private flyingPapers: THREE.Mesh[] = [];

  // Current Story Chapter (0 to 5)
  private currentChapter: number = 0;

  // Camera Orbit Interaction
  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraTargetRotation = { x: 0.32, y: -0.38 };
  private cameraCurrentRotation = { x: 0.32, y: -0.38 };
  private cameraDistance: number = 8.5;

  private raycaster = new THREE.Raycaster();
  private mouseVector = new THREE.Vector2();

  private onInteractionCallback?: (name: string) => void;

  constructor(container: HTMLElement, soundManager: SoundManager) {
    this.container = container;
    this.soundManager = soundManager;

    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x191438);

    const width = container.clientWidth || window.innerWidth || 1280;
    const height = container.clientHeight || window.innerHeight || 720;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    container.appendChild(this.renderer.domElement);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    this.updateCameraTransform();

    // 3. Lighting
    this.ambientLight = new THREE.AmbientLight(0xffeed8, 0.85);
    this.scene.add(this.ambientLight);

    this.dirLight = new THREE.DirectionalLight(0xfffae8, 1.35);
    this.dirLight.position.set(4, 9, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.scene.add(this.dirLight);

    this.lampLight = new THREE.PointLight(0xffaa44, 2.2, 7);
    this.lampLight.position.set(2.1, 1.45, 0.65);
    this.lampLight.castShadow = true;
    this.scene.add(this.lampLight);

    this.windowSpotLight = new THREE.SpotLight(0xfff3d6, 1.8, 14, Math.PI / 5, 0.5, 1);
    this.windowSpotLight.position.set(-0.4, 4.5, -4.5);
    this.windowSpotLight.target.position.set(0, 0, 0);
    this.scene.add(this.windowSpotLight);
    this.scene.add(this.windowSpotLight.target);

    // 4. Initialize Stage Groups
    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    this.skyStageGroup = new THREE.Group();
    this.skyStageGroup.position.y = -50; // Hidden initially
    this.scene.add(this.skyStageGroup);

    this.clocktownStageGroup = new THREE.Group();
    this.clocktownStageGroup.position.y = -50; // Hidden initially
    this.scene.add(this.clocktownStageGroup);

    this.charactersStageGroup = new THREE.Group();
    this.charactersStageGroup.position.y = -50; // Hidden initially
    this.scene.add(this.charactersStageGroup);

    this.timecycleGroup = new THREE.Group();

    this.windowGroup = new THREE.Group();
    this.windowShutterLeft = new THREE.Mesh();
    this.windowShutterRight = new THREE.Mesh();
    this.windowSkyMesh = new THREE.Mesh();

    // 5. Build Stages
    this.buildMansardRoom();
    this.buildSkyStage();
    this.buildClocktownStage();
    this.buildCharactersStage();

    // 6. Alarm Clock on Nightstand
    this.clock = new Clock3D();
    this.clock.group.position.set(2.1, 1.32, 0.65);
    this.clock.group.rotation.y = -Math.PI / 3.5;
    this.clock.group.scale.setScalar(0.78);
    this.scene.add(this.clock.group);

    // 7. Mousekin 3D Character
    this.character = new Character3D(this.camera);
    this.character.group.position.set(-0.25, 0, 0.35);
    this.character.group.rotation.y = -0.15;
    this.scene.add(this.character.group);

    // 8. Particles & Dust
    this.buildDustMotes();
    this.seasonParticles = new SeasonParticles();
    this.scene.add(this.seasonParticles.group);

    // 9. Interactions
    this.setupInteractions();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public setInteractionCallback(cb: (name: string) => void) {
    this.onInteractionCallback = cb;
  }

  // ==========================================
  // STAGE 1: MANSARD BEDROOM
  // ==========================================
  private buildMansardRoom() {
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xb3763f,
      roughness: 0.55,
      metalness: 0.05
    });

    const floorTrimMat = new THREE.MeshStandardMaterial({ color: 0x54280f });
    const wallWarmMat = new THREE.MeshStandardMaterial({ color: 0xeedcb8, roughness: 0.85 });
    const wainscotMat = new THREE.MeshStandardMaterial({ color: 0xd6ad78, roughness: 0.65 });
    const timberBeamMat = new THREE.MeshStandardMaterial({ color: 0x6e3c15, roughness: 0.5 });

    // Floor
    const floor = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.3, 6.6), floorMat);
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Planks grooves
    for (let p = -3; p <= 3; p += 0.8) {
      const seam = new THREE.Mesh(new THREE.BoxGeometry(6.5, 0.01, 0.02), new THREE.MeshBasicMaterial({ color: 0x8a5426 }));
      seam.position.set(0, 0.005, p);
      this.roomGroup.add(seam);
    }

    const trim = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.12, 6.8), floorTrimMat);
    trim.position.y = -0.22;
    this.roomGroup.add(trim);

    // Back Wall
    const backWallTop = new THREE.Mesh(new THREE.BoxGeometry(6.4, 2.6, 0.25), wallWarmMat);
    backWallTop.position.set(0, 3.2, -3.1);
    backWallTop.receiveShadow = true;
    this.roomGroup.add(backWallTop);

    const backWainscot = new THREE.Mesh(new THREE.BoxGeometry(6.4, 1.9, 0.28), wainscotMat);
    backWainscot.position.set(0, 0.95, -3.08);
    backWainscot.receiveShadow = true;
    this.roomGroup.add(backWainscot);

    const chairRail = new THREE.Mesh(new THREE.BoxGeometry(6.42, 0.12, 0.1), timberBeamMat);
    chairRail.position.set(0, 1.9, -2.98);
    this.roomGroup.add(chairRail);

    // Sloped Roof & Beams (theRoom.jpg)
    const roofWall = new THREE.Mesh(new THREE.BoxGeometry(0.25, 5.2, 6.4), wallWarmMat);
    roofWall.position.set(-3.1, 2.4, 0);
    roofWall.receiveShadow = true;
    this.roomGroup.add(roofWall);

    const slopedCeiling = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.2, 6.4), wallWarmMat);
    slopedCeiling.position.set(-1.8, 4.1, 0);
    slopedCeiling.rotation.z = Math.PI * 0.18;
    this.roomGroup.add(slopedCeiling);

    for (let b = -2.2; b <= 2.2; b += 2.2) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.25, 0.25), timberBeamMat);
      beam.position.set(-1.8, 4.02, b);
      beam.rotation.z = Math.PI * 0.18;
      beam.castShadow = true;
      this.roomGroup.add(beam);
    }

    // Wall Props: Umbrella
    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.position.set(-2.6, 2.8, -1.2);
    umbrellaGroup.rotation.z = -0.45;

    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.02, 8, 12, Math.PI),
      timberBeamMat
    );
    umbrellaGroup.add(handle);

    const fabric = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 1.0, 12),
      new THREE.MeshStandardMaterial({ color: 0x8a6d58, roughness: 0.7 })
    );
    fabric.position.y = -0.65;
    umbrellaGroup.add(fabric);
    this.roomGroup.add(umbrellaGroup);

    // Wall Props: Shelf with Books
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(-1.8, 2.3, -2.92);
    const shelfBoard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.35), timberBeamMat);
    shelfGroup.add(shelfBoard);

    const bookColors = [0x992222, 0x245538, 0x283b6b, 0xba7722];
    let bookX = -0.42;
    bookColors.forEach((col, idx) => {
      const bw = 0.065 + idx * 0.01;
      const bh = 0.38 - idx * 0.04;
      const book = new THREE.Mesh(
        new THREE.BoxGeometry(bw, bh, 0.24),
        new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 })
      );
      book.position.set(bookX, bh * 0.5 + 0.03, 0.02);
      shelfGroup.add(book);
      bookX += bw + 0.02;
    });

    const scroll = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.32, 16),
      new THREE.MeshStandardMaterial({ color: 0xf5ebd6, roughness: 0.8 })
    );
    scroll.rotation.z = Math.PI / 2;
    scroll.position.set(0.28, 0.06, 0.02);
    shelfGroup.add(scroll);
    this.roomGroup.add(shelfGroup);

    // Light-Pool Rug
    const rug = new THREE.Mesh(
      new THREE.CircleGeometry(1.65, 36),
      new THREE.MeshStandardMaterial({ color: 0xf5ebd2, roughness: 0.92 })
    );
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.2, 0.012, 0.4);
    rug.receiveShadow = true;
    this.roomGroup.add(rug);

    // Authentic Fairy-Tale Bed (Bed.png)
    const bedGroup = new THREE.Group();
    bedGroup.position.set(1.5, 0, -0.9);
    bedGroup.rotation.y = -0.22;

    const rusticWoodMat = new THREE.MeshStandardMaterial({ color: 0x73431e, roughness: 0.55 });
    const lavenderQuiltMat = new THREE.MeshStandardMaterial({ color: 0x646996, roughness: 0.72 });
    const sheetWhiteMat = new THREE.MeshStandardMaterial({ color: 0xf5f2e8, roughness: 0.8 });
    const starMat = new THREE.MeshStandardMaterial({ color: 0xffd215, emissive: 0x664400, roughness: 0.3, metalness: 0.6 });
    const planetMat = new THREE.MeshStandardMaterial({ color: 0x796696, roughness: 0.4, metalness: 0.3 });

    for (const x of [-1.15, 1.15]) {
      for (const z of [-0.68, 0.68]) {
        const postH = (x < 0) ? 1.55 : 0.95;
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, postH, 14), rusticWoodMat);
        post.position.set(x, postH / 2, z);
        post.castShadow = true;
        bedGroup.add(post);

        if (x < 0 && z < 0) {
          const star = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.26, 5), starMat);
          star.position.set(x, postH + 0.12, z);
          star.rotation.z = Math.PI;
          bedGroup.add(star);
        } else if (x < 0 && z > 0) {
          const planetGroup = new THREE.Group();
          planetGroup.position.set(x - 0.06, postH - 0.15, z);
          planetGroup.add(new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 14), planetMat));
          const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.16, 24), new THREE.MeshStandardMaterial({ color: 0xcca880, side: THREE.DoubleSide }));
          ring.rotation.x = Math.PI / 2.8;
          planetGroup.add(ring);
          bedGroup.add(planetGroup);
        }
      }
    }

    const mattress = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.3, 1.24), sheetWhiteMat);
    mattress.position.set(0, 0.54, 0);
    bedGroup.add(mattress);

    const pillow = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 16), sheetWhiteMat);
    pillow.scale.set(1.2, 0.45, 1.8);
    pillow.position.set(-0.72, 0.76, 0);
    bedGroup.add(pillow);

    const quilt = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.34, 1.26), lavenderQuiltMat);
    quilt.position.set(0.32, 0.56, 0);
    bedGroup.add(quilt);

    const patch = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.18), new THREE.MeshStandardMaterial({ color: 0xb53c52, side: THREE.DoubleSide }));
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(0.85, 0.74, 0.42);
    bedGroup.add(patch);

    this.roomGroup.add(bedGroup);

    // Rustic Nightstand
    const standGroup = new THREE.Group();
    standGroup.position.set(2.1, 0, 0.65);
    const tableTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24), rusticWoodMat);
    tableTop.position.y = 0.88;
    standGroup.add(tableTop);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.84, 16), rusticWoodMat);
    pillar.position.y = 0.44;
    standGroup.add(pillar);

    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 0.35, 10),
      new THREE.MeshStandardMaterial({ color: 0xffea9f, emissive: 0xffaa22, emissiveIntensity: 1.1 })
    );
    lantern.position.set(0.18, 1.08, 0.2);
    standGroup.add(lantern);

    this.roomGroup.add(standGroup);

    // Fairy-Tale Window
    this.buildWindow();
  }

  private buildWindow() {
    this.windowGroup.position.set(-0.4, 2.5, -3.0);
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

    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 2.6),
      new THREE.MeshStandardMaterial({ color: 0xa0d8ef, transparent: true, opacity: 0.2, side: THREE.DoubleSide })
    );
    this.windowGroup.add(glass);

    // Shutters
    const shutterGeom = new THREE.BoxGeometry(1.0, 2.5, 0.08);
    shutterGeom.translate(0.5, 0, 0);
    this.windowShutterLeft = new THREE.Mesh(shutterGeom, frameMat);
    this.windowShutterLeft.position.set(-1.05, 0, 0.12);
    this.windowShutterLeft.rotation.y = Math.PI * 0.48;
    this.windowGroup.add(this.windowShutterLeft);

    const shutterRightGeom = new THREE.BoxGeometry(1.0, 2.5, 0.08);
    shutterRightGeom.translate(-0.5, 0, 0);
    this.windowShutterRight = new THREE.Mesh(shutterRightGeom, frameMat);
    this.windowShutterRight.position.set(1.05, 0, 0.12);
    this.windowShutterRight.rotation.y = -Math.PI * 0.48;
    this.windowGroup.add(this.windowShutterRight);

    // Sky Backdrop: Panoramic Town of Clocks
    const skyTex = new THREE.TextureLoader().load('/assets/images/ios111.jpg');
    skyTex.colorSpace = THREE.SRGBColorSpace;
    this.windowSkyMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 12),
      new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.DoubleSide })
    );
    this.windowSkyMesh.position.set(-0.4, 3.0, -7.5);
    this.scene.add(this.windowSkyMesh);

    this.roomGroup.add(this.windowGroup);
  }

  // ==========================================
  // STAGE 2: CLOUD FLIGHT TO CLOCKTOWN
  // ==========================================
  private buildSkyStage() {
    const texLoader = new THREE.TextureLoader();

    // Flight Cloud under Mousekin
    const cloudTex = texLoader.load('/assets/images/Cloud1.png');
    cloudTex.colorSpace = THREE.SRGBColorSpace;
    const cloudMat = new THREE.MeshStandardMaterial({
      map: cloudTex,
      transparent: true,
      roughness: 0.9,
      emissive: 0xffeebb,
      emissiveIntensity: 0.25
    });
    this.flightCloud = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.2), cloudMat);
    this.flightCloud.rotation.x = -Math.PI / 2.5;
    this.flightCloud.position.set(-0.25, 0.05, 0.35);
    this.skyStageGroup.add(this.flightCloud);

    // Big Panoramic Clocktown Backdrop in Sky
    const townSkyTex = texLoader.load('/assets/images/ios111.jpg');
    townSkyTex.colorSpace = THREE.SRGBColorSpace;
    const townBackdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 16),
      new THREE.MeshBasicMaterial({ map: townSkyTex, side: THREE.DoubleSide })
    );
    townBackdrop.position.set(0, 4.5, -8.5);
    this.skyStageGroup.add(townBackdrop);

    // Parallax Clouds Drifting By
    const cloudImages = ['/assets/images/Cloud2.png', '/assets/images/Cloud3.png', '/assets/images/Cloud4.png'];
    for (let i = 0; i < 6; i++) {
      const cTex = texLoader.load(cloudImages[i % cloudImages.length]);
      cTex.colorSpace = THREE.SRGBColorSpace;
      const cMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(4.2, 2.6),
        new THREE.MeshBasicMaterial({ map: cTex, transparent: true, opacity: 0.85 })
      );
      cMesh.position.set(
        (Math.random() - 0.5) * 14,
        Math.random() * 4.5 + 0.5,
        (Math.random() - 0.5) * 6 - 2
      );
      this.parallaxClouds.push(cMesh);
      this.skyStageGroup.add(cMesh);
    }

    // Collectible Golden Gears in the Air
    const gearGeom = new THREE.TorusGeometry(0.28, 0.07, 12, 24);
    const goldGearMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.85,
      roughness: 0.2,
      emissive: 0x553300
    });
    for (let g = 0; g < 4; g++) {
      const gear = new THREE.Mesh(gearGeom, goldGearMat);
      gear.position.set(
        (g - 1.5) * 1.8,
        1.5 + (g % 2) * 0.8,
        (Math.random() - 0.5) * 2
      );
      this.goldenGears.push(gear);
      this.skyStageGroup.add(gear);
    }
  }

  // ==========================================
  // STAGE 3: CLOCKTOWN TIMECYCLE
  // ==========================================
  private buildClocktownStage() {
    const texLoader = new THREE.TextureLoader();

    // Clocktown Street Backdrop
    const townStreetTex = texLoader.load('/assets/images/Town_20.png');
    townStreetTex.colorSpace = THREE.SRGBColorSpace;
    const townStreetMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 10),
      new THREE.MeshBasicMaterial({ map: townStreetTex, transparent: true })
    );
    townStreetMesh.position.set(0, 3.8, -4.5);
    this.clocktownStageGroup.add(townStreetMesh);

    // Stone Pavement Ground
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x5c5064, roughness: 0.8 });
    const road = new THREE.Mesh(new THREE.BoxGeometry(12, 0.3, 6), roadMat);
    road.position.y = -0.15;
    road.receiveShadow = true;
    this.clocktownStageGroup.add(road);

    // Authentic Timecycle (Two-wheeled clockwork vehicle)
    this.timecycleGroup.position.set(-0.25, 0, 0.35);

    const brassMat = new THREE.MeshStandardMaterial({ color: 0xdda43b, metalness: 0.8, roughness: 0.3 });
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x241d24, roughness: 0.7 });

    // 2 Wheels with Clock Faces
    for (const wx of [-0.65, 0.65]) {
      const wheelSub = new THREE.Group();
      wheelSub.position.set(wx, 0.45, 0);

      const tire = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.06, 12, 28), tireMat);
      wheelSub.add(tire);

      const spokes = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 12), brassMat);
      spokes.rotation.x = Math.PI / 2;
      wheelSub.add(spokes);

      this.timecycleGroup.add(wheelSub);
    }

    // Frame & Handlebars
    const frameBar = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 8), brassMat);
    frameBar.rotation.z = Math.PI / 2;
    frameBar.position.set(0, 0.55, 0);
    this.timecycleGroup.add(frameBar);

    const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.75, 8), brassMat);
    fork.position.set(0.65, 0.82, 0);
    this.timecycleGroup.add(fork);

    const handlebar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.75), brassMat);
    handlebar.position.set(0.65, 1.15, 0);
    this.timecycleGroup.add(handlebar);

    this.clocktownStageGroup.add(this.timecycleGroup);
  }

  // ==========================================
  // STAGE 4 & 5: SNAIL OF PERFECTION & CAT MARTIN
  // ==========================================
  private buildCharactersStage() {
    const texLoader = new THREE.TextureLoader();

    // Snail of Perfection
    const snailTex = texLoader.load('/assets/images/leftsnail.png');
    snailTex.colorSpace = THREE.SRGBColorSpace;
    this.snailMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(2.4, 2.2),
      new THREE.MeshStandardMaterial({ map: snailTex, transparent: true, roughness: 0.6 })
    );
    this.snailMesh.position.set(-1.8, 1.1, 0);
    this.charactersStageGroup.add(this.snailMesh);

    // Woolly Cat Martin in Archive
    const catTex = texLoader.load('/assets/images/WoolCat1.png');
    catTex.colorSpace = THREE.SRGBColorSpace;
    this.catMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(3.0, 2.4),
      new THREE.MeshStandardMaterial({ map: catTex, transparent: true, roughness: 0.7 })
    );
    this.catMesh.position.set(1.9, 1.2, 0);
    this.charactersStageGroup.add(this.catMesh);

    // Swirling Flying Papers from the Fax Machine
    const paperTex = texLoader.load('/assets/images/pergament.png');
    paperTex.colorSpace = THREE.SRGBColorSpace;
    const paperMat = new THREE.MeshBasicMaterial({ map: paperTex, transparent: true, side: THREE.DoubleSide });

    for (let p = 0; p < 8; p++) {
      const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.65), paperMat);
      paper.position.set(
        (Math.random() - 0.5) * 5,
        Math.random() * 3 + 0.5,
        (Math.random() - 0.5) * 3
      );
      paper.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      this.flyingPapers.push(paper);
      this.charactersStageGroup.add(paper);
    }
  }

  private buildDustMotes() {
    const count = 90;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 5.5;
      positions[i * 3 + 1] = Math.random() * 3.8 + 0.2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5.5;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffea9f,
      size: 0.06,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.dustPoints = new THREE.Points(geom, mat);
    this.scene.add(this.dustPoints);
  }

  // ==========================================
  // STORY CHAPTER SWITCHER
  // ==========================================
  public setChapter(chapterIndex: number) {
    this.currentChapter = chapterIndex;

    // Reset visibility of stages
    this.roomGroup.position.y = -50;
    this.skyStageGroup.position.y = -50;
    this.clocktownStageGroup.position.y = -50;
    this.charactersStageGroup.position.y = -50;
    this.clock.group.visible = false;

    if (chapterIndex <= 2) {
      // Chapter 0, 1, 2: Mansard Bedroom
      this.roomGroup.position.y = 0;
      this.clock.group.visible = true;
      this.character.group.position.set(-0.25, 0, 0.35);

      if (chapterIndex === 0) {
        this.setSeason('summer');
      } else if (chapterIndex === 1) {
        this.setSeason('winter');
      } else if (chapterIndex === 2) {
        this.setSeason('autumn');
      }
    } else if (chapterIndex === 3) {
      // Chapter 3: Cloud Flight into the Sky!
      this.skyStageGroup.position.y = 0;
      this.character.group.position.set(-0.25, 0.65, 0.35); // Floating high on cloud
      this.scene.background = new THREE.Color(0x38558a);
      this.ambientLight.color.setHex(0xffffff);
      this.ambientLight.intensity = 1.1;
      this.dirLight.color.setHex(0xfffae8);
      this.dirLight.intensity = 1.4;
      this.seasonParticles.setSeason('summer');
    } else if (chapterIndex === 4) {
      // Chapter 4: Timecycle in Clocktown
      this.clocktownStageGroup.position.y = 0;
      this.character.group.position.set(-0.25, 0.55, 0.35); // Riding the Timecycle
      this.scene.background = new THREE.Color(0x281d3e);
      this.ambientLight.color.setHex(0xfad3aa);
      this.ambientLight.intensity = 0.95;
      this.dirLight.intensity = 1.25;
      this.seasonParticles.setSeason('autumn');
    } else if (chapterIndex === 5) {
      // Chapter 5: Snail, Cat Martin & Grand Finale!
      this.charactersStageGroup.position.y = 0;
      this.character.group.position.set(0, 0, 0.5);
      this.clock.group.visible = true;
      this.clock.group.position.set(0, 1.2, -1.2);
      this.scene.background = new THREE.Color(0x1a1532);
      this.ambientLight.color.setHex(0xffeed8);
      this.ambientLight.intensity = 1.05;
      this.seasonParticles.setSeason('spring');
    }
  }

  public toggleWindow() {
    this.isWindowOpen = !this.isWindowOpen;
    const targetAngle = this.isWindowOpen ? Math.PI * 0.48 : 0;
    this.windowShutterLeft.rotation.y = targetAngle;
    this.windowShutterRight.rotation.y = -targetAngle;
  }

  public setSeason(season: Season) {
    this.seasonParticles.setSeason(season);

    if (season === 'winter') {
      this.scene.background = new THREE.Color(0x0e172a);
      this.ambientLight.color.setHex(0xaad5f5);
      this.ambientLight.intensity = 0.65;
      this.dirLight.color.setHex(0xc2e2fa);
      this.dirLight.intensity = 1.0;
      this.lampLight.intensity = 2.4;
    } else if (season === 'summer') {
      this.scene.background = new THREE.Color(0x191438);
      this.ambientLight.color.setHex(0xffeed8);
      this.ambientLight.intensity = 0.85;
      this.dirLight.color.setHex(0xfffae8);
      this.dirLight.intensity = 1.35;
      this.lampLight.intensity = 1.8;
    } else if (season === 'autumn') {
      this.scene.background = new THREE.Color(0x24141d);
      this.ambientLight.color.setHex(0xfad3aa);
      this.ambientLight.intensity = 0.75;
      this.dirLight.color.setHex(0xffb877);
      this.dirLight.intensity = 1.2;
      this.lampLight.intensity = 2.2;
    } else if (season === 'spring') {
      this.scene.background = new THREE.Color(0x1a1d30);
      this.ambientLight.color.setHex(0xfce8ee);
      this.ambientLight.intensity = 0.8;
      this.dirLight.color.setHex(0xffe6b0);
      this.dirLight.intensity = 1.25;
      this.lampLight.intensity = 1.8;
    }
  }

  private setupInteractions() {
    const el = this.renderer.domElement;

    const onStart = (clientX: number, clientY: number) => {
      this.isDragging = true;
      this.previousMousePosition = { x: clientX, y: clientY };
    };

    const onMove = (clientX: number, clientY: number) => {
      if (!this.isDragging) return;
      const deltaX = clientX - this.previousMousePosition.x;
      const deltaY = clientY - this.previousMousePosition.y;

      // Free, continuous 360-degree rotation without any blocking or stalling
      this.cameraTargetRotation.y += deltaX * 0.007;
      this.cameraTargetRotation.x = Math.max(0.06, Math.min(0.72, this.cameraTargetRotation.x + deltaY * 0.006));

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

    // Click Raycasting
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

      // Check click on Alarm Clock
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

      // Check click on Cat Martin
      if (this.catMesh) {
        const catHits = this.raycaster.intersectObject(this.catMesh, true);
        if (catHits.length > 0) {
          this.soundManager.playPurr();
          if (this.onInteractionCallback) this.onInteractionCallback('cat');
          return;
        }
      }

      // Check click on Golden Gears
      for (const gear of this.goldenGears) {
        const gearHits = this.raycaster.intersectObject(gear, true);
        if (gearHits.length > 0) {
          this.soundManager.playSpringWinding();
          gear.scale.set(1.4, 1.4, 1.4);
          setTimeout(() => gear.scale.set(1, 1, 1), 300);
          if (this.onInteractionCallback) this.onInteractionCallback('gear');
          return;
        }
      }
    });
  }

  private updateCameraTransform() {
    this.cameraCurrentRotation.x += (this.cameraTargetRotation.x - this.cameraCurrentRotation.x) * 0.1;
    this.cameraCurrentRotation.y += (this.cameraTargetRotation.y - this.cameraCurrentRotation.y) * 0.1;

    const rotX = this.cameraCurrentRotation.x;
    const rotY = this.cameraCurrentRotation.y;

    const posX = Math.sin(rotY) * Math.cos(rotX) * this.cameraDistance;
    const posY = Math.sin(rotX) * this.cameraDistance + 1.2;
    const posZ = Math.cos(rotY) * Math.cos(rotX) * this.cameraDistance;

    this.camera.position.set(posX, posY, posZ);
    this.camera.lookAt(0, 1.35, 0);
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

    if (this.windowSkyMesh) {
      this.windowSkyMesh.visible = this.camera.position.z >= -3.5;
    }

    // Animate Dust Motes
    if (this.dustPoints) {
      const pos = this.dustPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length / 3; i++) {
        arr[i * 3 + 1] -= 0.003;
        arr[i * 3 + 0] += Math.sin(time + i) * 0.0015;
        if (arr[i * 3 + 1] < 0.1) arr[i * 3 + 1] = 4.0;
      }
      pos.needsUpdate = true;
    }

    // Animate Chapter 3 Clouds & Gears
    if (this.currentChapter === 3) {
      if (this.flightCloud) {
        this.flightCloud.position.y = 0.05 + Math.sin(time * 2) * 0.08;
      }
      this.parallaxClouds.forEach((c, idx) => {
        c.position.x += Math.sin(time * 0.5 + idx) * 0.006;
      });
      this.goldenGears.forEach((g, idx) => {
        g.rotation.z += (idx % 2 === 0 ? 0.02 : -0.02);
      });
    }

    // Animate Chapter 4 Timecycle
    if (this.currentChapter === 4) {
      this.timecycleGroup.position.y = Math.sin(time * 6) * 0.02;
    }

    // Animate Chapter 5 Flying Papers
    if (this.currentChapter === 5) {
      this.flyingPapers.forEach((paper, idx) => {
        paper.position.y += Math.sin(time * 2 + idx) * 0.006;
        paper.rotation.z += 0.01;
      });
    }

    this.clock.update(time);
    this.character.update(time);
    this.seasonParticles.update(time);
    this.renderer.render(this.scene, this.camera);
  }
}
