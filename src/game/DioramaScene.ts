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

  // Room Meshes
  private roomGroup: THREE.Group;
  private windowGroup: THREE.Group;
  private windowShutterLeft: THREE.Mesh;
  private windowShutterRight: THREE.Mesh;
  private isWindowOpen: boolean = true;
  private windowSkyMesh: THREE.Mesh;

  // Dust motes inside room
  private dustPoints?: THREE.Points;

  // Camera Orbit Interaction
  private isDragging: boolean = false;
  private previousMousePosition = { x: 0, y: 0 };
  private cameraTargetRotation = { x: 0.35, y: -0.42 };
  private cameraCurrentRotation = { x: 0.35, y: -0.42 };
  private cameraDistance: number = 8.6;

  private raycaster = new THREE.Raycaster();
  private mouseVector = new THREE.Vector2();

  private onInteractionCallback?: (name: string) => void;

  constructor(container: HTMLElement, soundManager: SoundManager) {
    this.container = container;
    this.soundManager = soundManager;

    // 1. Scene & Renderer
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x191438); // Deep magical night sky

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

    // 3. Cinematic Lighting (Cozy storybook palette)
    this.ambientLight = new THREE.AmbientLight(0xffeed8, 0.85);
    this.scene.add(this.ambientLight);

    // Main Sunlight/Moonlight streaming in
    this.dirLight = new THREE.DirectionalLight(0xfffae8, 1.35);
    this.dirLight.position.set(4, 9, 5);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;
    this.dirLight.shadow.bias = -0.0008;
    this.dirLight.shadow.camera.near = 1;
    this.dirLight.shadow.camera.far = 20;
    this.dirLight.shadow.camera.left = -5;
    this.dirLight.shadow.camera.right = 5;
    this.dirLight.shadow.camera.top = 5;
    this.dirLight.shadow.camera.bottom = -5;
    this.scene.add(this.dirLight);

    // Cozy Bedside Lamp PointLight
    this.lampLight = new THREE.PointLight(0xffaa44, 2.2, 7);
    this.lampLight.position.set(2.1, 1.45, 0.65);
    this.lampLight.castShadow = true;
    this.scene.add(this.lampLight);

    // Window light beam
    this.windowSpotLight = new THREE.SpotLight(0xfff3d6, 1.8, 14, Math.PI / 5, 0.5, 1);
    this.windowSpotLight.position.set(-0.4, 4.5, -4.5);
    this.windowSpotLight.target.position.set(0, 0, 0);
    this.scene.add(this.windowSpotLight);
    this.scene.add(this.windowSpotLight.target);

    // 4. Build Authentic Attic Mansard Room
    this.roomGroup = new THREE.Group();
    this.scene.add(this.roomGroup);

    this.windowGroup = new THREE.Group();
    this.windowShutterLeft = new THREE.Mesh();
    this.windowShutterRight = new THREE.Mesh();
    this.windowSkyMesh = new THREE.Mesh();

    this.buildMansardRoom();

    // 5. Add Authentic Purple Cosmic Alarm Clock (on the bedside nightstand)
    this.clock = new Clock3D();
    this.clock.group.position.set(2.1, 1.32, 0.65);
    this.clock.group.rotation.y = -Math.PI / 3.5;
    this.clock.group.scale.setScalar(0.78);
    this.scene.add(this.clock.group);

    // 6. Add True 3D Volumetric Mousekin
    this.character = new Character3D(this.camera);
    this.character.group.position.set(-0.25, 0, 0.35);
    this.character.group.rotation.y = -0.15;
    this.scene.add(this.character.group);

    // 7. Add Floating Dust Motes
    this.buildDustMotes();

    // 8. Add Seasonal Particles
    this.seasonParticles = new SeasonParticles();
    this.scene.add(this.seasonParticles.group);

    // 9. Event Listeners
    this.setupInteractions();
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  public setInteractionCallback(cb: (name: string) => void) {
    this.onInteractionCallback = cb;
  }

  private buildMansardRoom() {
    // Shared authentic materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0xb3763f, // Warm honey oak parquet planks
      roughness: 0.55,
      metalness: 0.05
    });

    const floorTrimMat = new THREE.MeshStandardMaterial({
      color: 0x54280f,
      roughness: 0.6
    });

    const wallWarmMat = new THREE.MeshStandardMaterial({
      color: 0xeedcb8, // Cozy storybook ochre-cream plaster (from theRoom.jpg)
      roughness: 0.85
    });

    const wainscotMat = new THREE.MeshStandardMaterial({
      color: 0xd6ad78, // Wooden bottom wainscoting paneling
      roughness: 0.65
    });

    const timberBeamMat = new THREE.MeshStandardMaterial({
      color: 0x6e3c15, // Heavy dark timber roof beams
      roughness: 0.5
    });

    // ==========================================
    // A. FLOOR
    // ==========================================
    const floorGeom = new THREE.BoxGeometry(6.6, 0.3, 6.6);
    const floor = new THREE.Mesh(floorGeom, floorMat);
    floor.position.y = -0.15;
    floor.receiveShadow = true;
    this.roomGroup.add(floor);

    // Planks seam grooves (visual tactile relief)
    for (let p = -3; p <= 3; p += 0.8) {
      const seamGeom = new THREE.BoxGeometry(6.5, 0.01, 0.02);
      const seamMat = new THREE.MeshBasicMaterial({ color: 0x8a5426 });
      const seam = new THREE.Mesh(seamGeom, seamMat);
      seam.position.set(0, 0.005, p);
      this.roomGroup.add(seam);
    }

    // Floor edge trim
    const trimGeom = new THREE.BoxGeometry(6.8, 0.12, 6.8);
    const trim = new THREE.Mesh(trimGeom, floorTrimMat);
    trim.position.y = -0.22;
    this.roomGroup.add(trim);

    // ==========================================
    // B. BACK WALL WITH WINDOW & WAINSCOTING
    // ==========================================
    // Upper Wall (Plaster)
    const backWallTopGeom = new THREE.BoxGeometry(6.4, 2.6, 0.25);
    const backWallTop = new THREE.Mesh(backWallTopGeom, wallWarmMat);
    backWallTop.position.set(0, 3.2, -3.1);
    backWallTop.receiveShadow = true;
    backWallTop.castShadow = true;
    this.roomGroup.add(backWallTop);

    // Lower Wainscoting Paneling
    const backWainscotGeom = new THREE.BoxGeometry(6.4, 1.9, 0.28);
    const backWainscot = new THREE.Mesh(backWainscotGeom, wainscotMat);
    backWainscot.position.set(0, 0.95, -3.08);
    backWainscot.receiveShadow = true;
    this.roomGroup.add(backWainscot);

    // Decorative Molded Strip / Chair Rail (from theRoom.jpg)
    const chairRailGeom = new THREE.BoxGeometry(6.42, 0.12, 0.1);
    const chairRail = new THREE.Mesh(chairRailGeom, timberBeamMat);
    chairRail.position.set(0, 1.9, -2.98);
    this.roomGroup.add(chairRail);

    // Baseboard trim at bottom of wall
    const baseboardGeom = new THREE.BoxGeometry(6.42, 0.18, 0.08);
    const baseboard = new THREE.Mesh(baseboardGeom, timberBeamMat);
    baseboard.position.set(0, 0.09, -2.98);
    this.roomGroup.add(baseboard);

    // ==========================================
    // C. ATTIC MANSARD SLOPED CEILING & BEAMS (theRoom.jpg)
    // ==========================================
    // Sloped roof plane on the left
    const roofGeom = new THREE.BoxGeometry(0.25, 5.2, 6.4);
    const roofWall = new THREE.Mesh(roofGeom, wallWarmMat);
    roofWall.position.set(-3.1, 2.4, 0);
    roofWall.receiveShadow = true;
    this.roomGroup.add(roofWall);

    // Sloped Diagonal Ceiling Rafter (Mansard timber slope)
    const slopedCeilingGeom = new THREE.BoxGeometry(3.6, 0.2, 6.4);
    const slopedCeiling = new THREE.Mesh(slopedCeilingGeom, wallWarmMat);
    slopedCeiling.position.set(-1.8, 4.1, 0);
    slopedCeiling.rotation.z = Math.PI * 0.18;
    slopedCeiling.receiveShadow = true;
    this.roomGroup.add(slopedCeiling);

    // Exposed Timber Rafter Beams
    for (let b = -2.2; b <= 2.2; b += 2.2) {
      const beamGeom = new THREE.BoxGeometry(3.8, 0.25, 0.25);
      const beam = new THREE.Mesh(beamGeom, timberBeamMat);
      beam.position.set(-1.8, 4.02, b);
      beam.rotation.z = Math.PI * 0.18;
      beam.castShadow = true;
      this.roomGroup.add(beam);
    }

    // ==========================================
    // D. WALL PROPS FROM theRoom.jpg
    // ==========================================
    // 1. Hanging Umbrella on the sloped wall
    const umbrellaGroup = new THREE.Group();
    umbrellaGroup.position.set(-2.6, 2.8, -1.2);
    umbrellaGroup.rotation.z = -0.45;

    // Curved wooden J-handle
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(-0.06, 0.08, 0),
      new THREE.Vector3(-0.12, 0.04, 0),
      new THREE.Vector3(-0.14, -0.04, 0),
      new THREE.Vector3(-0.1, -0.1, 0)
    ]);
    const handleGeom = new THREE.TubeGeometry(handleCurve, 12, 0.022, 8, false);
    const handle = new THREE.Mesh(handleGeom, timberBeamMat);
    umbrellaGroup.add(handle);

    // Umbrella cane shaft
    const caneGeom = new THREE.CylinderGeometry(0.02, 0.02, 1.3, 10);
    const cane = new THREE.Mesh(caneGeom, timberBeamMat);
    cane.position.y = -0.65;
    umbrellaGroup.add(cane);

    // Rolled umbrella fabric cone
    const fabricGeom = new THREE.ConeGeometry(0.12, 1.0, 12);
    const fabricMat = new THREE.MeshStandardMaterial({ color: 0x8a6d58, roughness: 0.7 });
    const fabric = new THREE.Mesh(fabricGeom, fabricMat);
    fabric.position.y = -0.65;
    fabric.castShadow = true;
    umbrellaGroup.add(fabric);

    // Strap & silver tip
    const tipGeom = new THREE.CylinderGeometry(0.015, 0.005, 0.12, 8);
    const tip = new THREE.Mesh(tipGeom, new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8 }));
    tip.position.y = -1.2;
    umbrellaGroup.add(tip);

    this.roomGroup.add(umbrellaGroup);

    // 2. Wooden Wall Shelf with Books and Scroll (from theRoom.jpg)
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(-1.8, 2.3, -2.92);

    // Shelf board
    const shelfBoard = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.35), timberBeamMat);
    shelfBoard.castShadow = true;
    shelfGroup.add(shelfBoard);

    // 2 Support Brackets
    for (const sx of [-0.45, 0.45]) {
      const bracketGeom = new THREE.BoxGeometry(0.05, 0.22, 0.22);
      const bracket = new THREE.Mesh(bracketGeom, timberBeamMat);
      bracket.position.set(sx, -0.11, -0.05);
      shelfGroup.add(bracket);
    }

    // Books on the shelf
    const bookColors = [0x992222, 0x245538, 0x283b6b, 0xba7722];
    let bookX = -0.42;
    bookColors.forEach((col, idx) => {
      const bw = 0.065 + idx * 0.01;
      const bh = 0.38 - idx * 0.04;
      const bGeom = new THREE.BoxGeometry(bw, bh, 0.24);
      const bMat = new THREE.MeshStandardMaterial({ color: col, roughness: 0.6 });
      const book = new THREE.Mesh(bGeom, bMat);
      book.position.set(bookX, bh * 0.5 + 0.03, 0.02);
      book.rotation.y = (idx % 2 === 0 ? 0.04 : -0.03);
      book.castShadow = true;
      shelfGroup.add(book);
      bookX += bw + 0.02;
    });

    // Rolled Parchment Scroll
    const scrollGeom = new THREE.CylinderGeometry(0.045, 0.045, 0.32, 16);
    scrollGeom.rotateZ(Math.PI / 2);
    const scrollMat = new THREE.MeshStandardMaterial({ color: 0xf5ebd6, roughness: 0.8 });
    const scroll = new THREE.Mesh(scrollGeom, scrollMat);
    scroll.position.set(0.28, 0.06, 0.02);
    scroll.castShadow = true;
    shelfGroup.add(scroll);

    // Red ribbon around scroll
    const ribbonGeom = new THREE.CylinderGeometry(0.048, 0.048, 0.04, 16);
    ribbonGeom.rotateZ(Math.PI / 2);
    const ribbon = new THREE.Mesh(ribbonGeom, new THREE.MeshBasicMaterial({ color: 0xc42b2b }));
    ribbon.position.set(0.28, 0.06, 0.02);
    shelfGroup.add(ribbon);

    this.roomGroup.add(shelfGroup);

    // ==========================================
    // E. WARM LIGHT-POOL RUG ON FLOOR (from theRoom.jpg)
    // ==========================================
    const rugGeom = new THREE.CircleGeometry(1.65, 36);
    rugGeom.scale(1.2, 0.9, 1.0);
    const rugMat = new THREE.MeshStandardMaterial({
      color: 0xf5ebd2, // Soft warm moonlight/sunlight glow puddle
      roughness: 0.92
    });
    const rug = new THREE.Mesh(rugGeom, rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-0.2, 0.012, 0.4);
    rug.receiveShadow = true;
    this.roomGroup.add(rug);

    // ==========================================
    // F. AUTHENTIC 3D FAIRY-TALE BED (Matching Bed.png)
    // ==========================================
    const bedGroup = new THREE.Group();
    bedGroup.position.set(1.5, 0, -0.9);
    bedGroup.rotation.y = -0.22;

    const rusticWoodMat = new THREE.MeshStandardMaterial({
      color: 0x73431e, // Natural rustic wood post
      roughness: 0.55
    });

    const lavenderQuiltMat = new THREE.MeshStandardMaterial({
      color: 0x646996, // Authentic lilac-blue quilt from Bed.png
      roughness: 0.72
    });

    const sheetWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf5f2e8,
      roughness: 0.8
    });

    const starMat = new THREE.MeshStandardMaterial({
      color: 0xffd215, // Golden Star from Bed.png
      emissive: 0x664400,
      roughness: 0.3,
      metalness: 0.6
    });

    const planetMat = new THREE.MeshStandardMaterial({
      color: 0x796696, // Saturn Planet from Bed.png
      roughness: 0.4,
      metalness: 0.3
    });

    // 4 Corner Wooden Posts
    for (const x of [-1.15, 1.15]) {
      for (const z of [-0.68, 0.68]) {
        const postH = (x < 0) ? 1.55 : 0.95;
        const postGeom = new THREE.CylinderGeometry(0.065, 0.075, postH, 14);
        postGeom.translate(0, postH / 2, 0);
        const post = new THREE.Mesh(postGeom, rusticWoodMat);
        post.position.set(x, 0, z);
        post.castShadow = true;
        bedGroup.add(post);

        // Specific props on posts from Bed.png!
        if (x < 0 && z < 0) {
          // Front-left post: GOLDEN 5-POINTED STAR on top!
          const star5Geom = new THREE.ConeGeometry(0.14, 0.26, 5);
          star5Geom.scale(1.2, 1.2, 0.5);
          const star = new THREE.Mesh(star5Geom, starMat);
          star.position.set(x, postH + 0.12, z);
          star.rotation.z = Math.PI;
          star.castShadow = true;
          bedGroup.add(star);
        } else if (x < 0 && z > 0) {
          // Side post: SATURN PLANET WITH RING!
          const planetGroup = new THREE.Group();
          planetGroup.position.set(x - 0.06, postH - 0.15, z);

          const planetSphere = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 14), planetMat);
          planetGroup.add(planetSphere);

          const ringGeom = new THREE.RingGeometry(0.1, 0.16, 24);
          const ringMat = new THREE.MeshStandardMaterial({ color: 0xcca880, side: THREE.DoubleSide });
          const ring = new THREE.Mesh(ringGeom, ringMat);
          ring.rotation.x = Math.PI / 2.8;
          planetGroup.add(ring);

          bedGroup.add(planetGroup);
        } else {
          // Rounded wooden finial
          const finial = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), rusticWoodMat);
          finial.position.set(x, postH + 0.06, z);
          bedGroup.add(finial);
        }
      }
    }

    // Headboard slats
    const headboardGeom = new THREE.BoxGeometry(0.08, 0.75, 1.28);
    const headboard = new THREE.Mesh(headboardGeom, rusticWoodMat);
    headboard.position.set(-1.15, 0.85, 0);
    bedGroup.add(headboard);

    // Bed Frame base
    const baseGeom = new THREE.BoxGeometry(2.2, 0.2, 1.3);
    const base = new THREE.Mesh(baseGeom, rusticWoodMat);
    base.position.set(0, 0.36, 0);
    base.castShadow = true;
    base.receiveShadow = true;
    bedGroup.add(base);

    // Soft Mattress
    const mattressGeom = new THREE.BoxGeometry(2.1, 0.3, 1.24);
    const mattress = new THREE.Mesh(mattressGeom, sheetWhiteMat);
    mattress.position.set(0, 0.54, 0);
    mattress.castShadow = true;
    mattress.receiveShadow = true;
    bedGroup.add(mattress);

    // Fluffy Pillow
    const pillowGeom = new THREE.SphereGeometry(0.32, 18, 16);
    pillowGeom.scale(1.2, 0.45, 1.8);
    const pillow = new THREE.Mesh(pillowGeom, sheetWhiteMat);
    pillow.position.set(-0.72, 0.76, 0);
    pillow.rotation.z = -0.15;
    pillow.castShadow = true;
    bedGroup.add(pillow);

    // Cozy Quilt with Dotted Edge & Plaid Patch (Bed.png)
    const quiltGeom = new THREE.BoxGeometry(1.48, 0.34, 1.26);
    const quilt = new THREE.Mesh(quiltGeom, lavenderQuiltMat);
    quilt.position.set(0.32, 0.56, 0);
    quilt.castShadow = true;
    quilt.receiveShadow = true;
    bedGroup.add(quilt);

    // Folded white sheet brim
    const brimGeom = new THREE.BoxGeometry(0.18, 0.35, 1.25);
    const brim = new THREE.Mesh(brimGeom, sheetWhiteMat);
    brim.position.set(-0.38, 0.57, 0);
    bedGroup.add(brim);

    // Little checkered plaid patch on the quilt corner (from Bed.png!)
    const patchGeom = new THREE.PlaneGeometry(0.18, 0.18);
    const patchMat = new THREE.MeshStandardMaterial({
      color: 0xb53c52, // Warm reddish plaid patch
      roughness: 0.8,
      side: THREE.DoubleSide
    });
    const patch = new THREE.Mesh(patchGeom, patchMat);
    patch.rotation.x = -Math.PI / 2;
    patch.position.set(0.85, 0.74, 0.42);
    bedGroup.add(patch);

    this.roomGroup.add(bedGroup);

    // ==========================================
    // G. RUSTIC NIGHTSTAND & WARM LANTERN
    // ==========================================
    const standGroup = new THREE.Group();
    standGroup.position.set(2.1, 0, 0.65);

    // Round wooden table top
    const topGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24);
    const tableTop = new THREE.Mesh(topGeom, rusticWoodMat);
    tableTop.position.y = 0.88;
    tableTop.castShadow = true;
    standGroup.add(tableTop);

    // Center Pedestal & 3 Curved Legs
    const pillarGeom = new THREE.CylinderGeometry(0.1, 0.12, 0.84, 16);
    const pillar = new THREE.Mesh(pillarGeom, rusticWoodMat);
    pillar.position.y = 0.44;
    standGroup.add(pillar);

    const baseDisk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.08, 20), rusticWoodMat);
    baseDisk.position.y = 0.04;
    standGroup.add(baseDisk);

    // Glowing Lantern on the nightstand
    const lanternGeom = new THREE.CylinderGeometry(0.14, 0.18, 0.35, 10);
    const lanternMat = new THREE.MeshStandardMaterial({
      color: 0xffea9f,
      emissive: 0xffaa22,
      emissiveIntensity: 1.1,
      roughness: 0.2
    });
    const lantern = new THREE.Mesh(lanternGeom, lanternMat);
    lantern.position.set(0.18, 1.08, 0.2);
    standGroup.add(lantern);

    // Brass handle ring on lantern
    const lanternHandle = new THREE.Mesh(
      new THREE.TorusGeometry(0.08, 0.015, 8, 16),
      new THREE.MeshStandardMaterial({ color: 0x5a3210 })
    );
    lanternHandle.position.set(0.18, 1.32, 0.2);
    standGroup.add(lanternHandle);

    this.roomGroup.add(standGroup);

    // ==========================================
    // H. FAIRY-TALE 3D WINDOW & SKY VIEW (ios111.jpg)
    // ==========================================
    this.buildWindow();
  }

  private buildWindow() {
    this.windowGroup.position.set(-0.4, 2.5, -3.0);

    const frameMat = new THREE.MeshStandardMaterial({ color: 0x6e3c15, roughness: 0.5 });

    // Outer Frame
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

    // Transparent Glass Pane
    const glassGeom = new THREE.PlaneGeometry(2.2, 2.6);
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0xa0d8ef,
      transparent: true,
      opacity: 0.2,
      roughness: 0.1,
      metalness: 0.1,
      side: THREE.DoubleSide
    });
    const glass = new THREE.Mesh(glassGeom, glassMat);
    this.windowGroup.add(glass);

    // Sills
    const intSill = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.12, 0.35), frameMat);
    intSill.position.set(0, -1.35, 0.15);
    this.windowGroup.add(intSill);

    // Cross bars
    const barV = new THREE.Mesh(new THREE.BoxGeometry(0.06, 2.5, 0.06), frameMat);
    barV.position.set(0, 0, 0.08);
    this.windowGroup.add(barV);

    const barH = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.06, 0.06), frameMat);
    barH.position.set(0, 0.2, 0.08);
    this.windowGroup.add(barH);

    // Shutters
    const shutterGeom = new THREE.BoxGeometry(1.0, 2.5, 0.08);
    shutterGeom.translate(0.5, 0, 0);
    const shutterMat = new THREE.MeshStandardMaterial({ color: 0x8b5226, roughness: 0.6 });

    this.windowShutterLeft = new THREE.Mesh(shutterGeom, shutterMat);
    this.windowShutterLeft.position.set(-1.05, 0, 0.12);
    this.windowShutterLeft.rotation.y = Math.PI * 0.48; // Open
    this.windowGroup.add(this.windowShutterLeft);

    const shutterRightGeom = new THREE.BoxGeometry(1.0, 2.5, 0.08);
    shutterRightGeom.translate(-0.5, 0, 0);
    this.windowShutterRight = new THREE.Mesh(shutterRightGeom, shutterMat);
    this.windowShutterRight.position.set(1.05, 0, 0.12);
    this.windowShutterRight.rotation.y = -Math.PI * 0.48; // Open
    this.windowGroup.add(this.windowShutterRight);

    // Sky Backdrop: Panoramic Town of Clocks (ios111.jpg)
    const skyTex = new THREE.TextureLoader().load('/assets/images/ios111.jpg');
    skyTex.colorSpace = THREE.SRGBColorSpace;
    const skyGeom = new THREE.PlaneGeometry(18, 12);
    const skyMat = new THREE.MeshBasicMaterial({
      map: skyTex,
      side: THREE.DoubleSide
    });
    this.windowSkyMesh = new THREE.Mesh(skyGeom, skyMat);
    this.windowSkyMesh.position.set(-0.4, 3.0, -7.5);
    this.scene.add(this.windowSkyMesh);

    this.roomGroup.add(this.windowGroup);
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

  public toggleWindow() {
    this.isWindowOpen = !this.isWindowOpen;
    const targetAngle = this.isWindowOpen ? Math.PI * 0.48 : 0;
    this.windowShutterLeft.rotation.y = targetAngle;
    this.windowShutterRight.rotation.y = -targetAngle;
  }

  public setSeason(season: Season) {
    this.seasonParticles.setSeason(season);

    // Dynamically adjust lighting and room mood based on season
    if (season === 'winter') {
      this.scene.background = new THREE.Color(0x0e172a);
      this.ambientLight.color.setHex(0xaad5f5);
      this.ambientLight.intensity = 0.65;
      this.dirLight.color.setHex(0xc2e2fa);
      this.dirLight.intensity = 1.0;
      this.lampLight.intensity = 2.4;
      this.windowSpotLight.color.setHex(0xb5daf5);
    } else if (season === 'summer') {
      this.scene.background = new THREE.Color(0x191438);
      this.ambientLight.color.setHex(0xffeed8);
      this.ambientLight.intensity = 0.85;
      this.dirLight.color.setHex(0xfffae8);
      this.dirLight.intensity = 1.35;
      this.lampLight.intensity = 1.8;
      this.windowSpotLight.color.setHex(0xfff3d6);
    } else if (season === 'autumn') {
      this.scene.background = new THREE.Color(0x24141d);
      this.ambientLight.color.setHex(0xfad3aa);
      this.ambientLight.intensity = 0.75;
      this.dirLight.color.setHex(0xffb877);
      this.dirLight.intensity = 1.2;
      this.lampLight.intensity = 2.2;
      this.windowSpotLight.color.setHex(0xffcf99);
    } else if (season === 'spring') {
      this.scene.background = new THREE.Color(0x1a1d30);
      this.ambientLight.color.setHex(0xfce8ee);
      this.ambientLight.intensity = 0.8;
      this.dirLight.color.setHex(0xffe6b0);
      this.dirLight.intensity = 1.25;
      this.lampLight.intensity = 1.8;
      this.windowSpotLight.color.setHex(0xffe2c4);
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

      // Keep camera in comfortable viewing arc so room is always open and visible
      this.cameraTargetRotation.y = Math.max(-1.15, Math.min(0.35, this.cameraTargetRotation.y + deltaX * 0.006));
      this.cameraTargetRotation.x = Math.max(0.12, Math.min(0.65, this.cameraTargetRotation.x + deltaY * 0.006));

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

    // Animate subtle floating dust motes
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

    this.clock.update(time);
    this.character.update(time);
    this.seasonParticles.update(time);
    this.renderer.render(this.scene, this.camera);
  }
}
