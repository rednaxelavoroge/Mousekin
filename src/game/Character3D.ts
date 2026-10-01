import * as THREE from 'three';

export class Character3D {
  public group: THREE.Group;
  public clickTarget: THREE.Object3D;

  private figurineGroup: THREE.Group;
  private shadowMesh: THREE.Mesh;

  // Jump animation state
  private isJumping: boolean = false;
  private jumpProgress: number = 0;

  // Camera tracking reference
  private cameraRef?: THREE.Camera;

  constructor(camera?: THREE.Camera) {
    this.cameraRef = camera;
    this.group = new THREE.Group();

    this.figurineGroup = new THREE.Group();
    this.group.add(this.figurineGroup);

    // Height & Width based on original image aspect ratio (387 / 886 = 0.437)
    const height = 2.45;
    const width = height * 0.437; // ~1.07
    const thickness = 0.22; // Physical 3D thickness

    const textureLoader = new THREE.TextureLoader();
    const frontTex = textureLoader.load('/assets/characters/mouse_cutout.png');
    frontTex.colorSpace = THREE.SRGBColorSpace;

    const backTex = textureLoader.load('/assets/characters/mouse_back.png');
    backTex.colorSpace = THREE.SRGBColorSpace;

    // Curved geometry so the figurine has a subtle, tactile convex 3D relief
    const segmentsX = 24;
    const segmentsY = 32;

    const createCurvedGeom = (zOffset: number, curveStrength: number = 0.12) => {
      const geom = new THREE.PlaneGeometry(width, height, segmentsX, segmentsY);
      const pos = geom.getAttribute('position') as THREE.BufferAttribute;
      const array = pos.array as Float32Array;

      for (let i = 0; i < array.length / 3; i++) {
        const x = array[i * 3 + 0];
        const normX = x / (width * 0.5); // -1 to +1
        // Parabolic bulge forward in center
        const bulge = (1 - normX * normX) * curveStrength;
        array[i * 3 + 2] = zOffset + bulge;
      }
      geom.computeVertexNormals();
      return geom;
    };

    // 1. Front Plate (The Author's Authentic Hand-Painted Art)
    const frontGeom = createCurvedGeom(thickness * 0.5, 0.08);
    const frontMat = new THREE.MeshStandardMaterial({
      map: frontTex,
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.55,
      metalness: 0.05,
      side: THREE.FrontSide
    });
    const frontMesh = new THREE.Mesh(frontGeom, frontMat);
    frontMesh.castShadow = true;
    frontMesh.receiveShadow = true;
    frontMesh.position.y = height / 2;
    this.figurineGroup.add(frontMesh);

    // 2. Back Plate (Shaded rear of the figurine)
    const backGeom = createCurvedGeom(-thickness * 0.5, -0.05);
    const backMat = new THREE.MeshStandardMaterial({
      map: backTex,
      transparent: true,
      alphaTest: 0.08,
      roughness: 0.65,
      metalness: 0.05,
      side: THREE.BackSide
    });
    const backMesh = new THREE.Mesh(backGeom, backMat);
    backMesh.castShadow = true;
    backMesh.receiveShadow = true;
    backMesh.position.y = height / 2;
    this.figurineGroup.add(backMesh);

    // 3. Volumetric Core Layers (Creates solid, tactile 3D thickness from any angle)
    const layersCount = 6;
    for (let l = 1; l < layersCount; l++) {
      const t = (l / layersCount - 0.5) * thickness;
      const layerGeom = createCurvedGeom(t, 0.06);
      const layerMat = new THREE.MeshStandardMaterial({
        map: frontTex,
        transparent: true,
        alphaTest: 0.12,
        roughness: 0.8,
        color: 0xdeb89a, // Warm inner core tint
        depthWrite: false
      });
      const layerMesh = new THREE.Mesh(layerGeom, layerMat);
      layerMesh.position.y = height / 2;
      this.figurineGroup.add(layerMesh);
    }

    // 4. Soft Contact Shadow on Floor
    const shadowGeom = new THREE.CircleGeometry(0.5, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x110822,
      transparent: true,
      opacity: 0.45
    });
    this.shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.015;
    this.group.add(this.shadowMesh);

    this.clickTarget = frontMesh;
  }

  public setCamera(camera: THREE.Camera) {
    this.cameraRef = camera;
  }

  public jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    this.jumpProgress = 0;
  }

  public update(time: number) {
    // 1. Smart Camera Orientation (Ensures author's face is always gorgeously presented in 3D)
    if (this.cameraRef) {
      // Calculate angle from character to camera on XZ plane
      const camPos = this.cameraRef.position;
      const charPos = this.group.position;
      const targetAngle = Math.atan2(camPos.x - charPos.x, camPos.z - charPos.z);

      // Smoothly interpolate rotation towards camera
      const diff = targetAngle - this.group.rotation.y;
      // Normalize angle diff
      const wrappedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.group.rotation.y += wrappedDiff * 0.08;
    }

    // 2. Jump Physics Animation
    if (this.isJumping) {
      this.jumpProgress += 0.055;
      const jumpHeight = Math.sin(this.jumpProgress * Math.PI) * 0.75;
      this.figurineGroup.position.y = jumpHeight;

      // Springy rotation during jump
      this.figurineGroup.rotation.z = Math.sin(this.jumpProgress * Math.PI * 2) * 0.12;

      // Shadow scales down as mouse jumps higher
      const shadowScale = 1 - (jumpHeight / 0.75) * 0.4;
      this.shadowMesh.scale.set(shadowScale, shadowScale, 1);

      if (this.jumpProgress >= 1) {
        this.isJumping = false;
        this.figurineGroup.position.y = 0;
        this.figurineGroup.rotation.z = 0;
        this.shadowMesh.scale.set(1, 1, 1);
      }
    } else {
      // 3. Idle Living Breathing (Subtle 3D scale pulse and slight head tilt)
      const breathe = Math.sin(time * 2.2) * 0.02;
      this.figurineGroup.scale.set(1 + breathe * 0.5, 1 + breathe, 1 + breathe);
      this.figurineGroup.rotation.z = Math.sin(time * 1.2) * 0.025;
    }
  }
}
