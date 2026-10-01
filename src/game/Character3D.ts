import * as THREE from 'three';

export class Character3D {
  public group: THREE.Group;
  public clickTarget: THREE.Object3D;

  private modelMesh?: THREE.Mesh;
  private shadowMesh: THREE.Mesh;

  // Jump animation state
  private isJumping: boolean = false;
  private jumpProgress: number = 0;

  // Camera tracking reference
  private cameraRef?: THREE.Camera;

  constructor(camera?: THREE.Camera) {
    this.cameraRef = camera;
    this.group = new THREE.Group();

    // 1. Soft Floor Contact Shadow
    const shadowGeom = new THREE.CircleGeometry(0.55, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x160c06,
      transparent: true,
      opacity: 0.42
    });
    this.shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.015;
    this.group.add(this.shadowMesh);

    // Initial click target placeholder
    const placeholderGeom = new THREE.CylinderGeometry(0.4, 0.4, 2.4, 16);
    const placeholderMat = new THREE.MeshBasicMaterial({ visible: false });
    this.clickTarget = new THREE.Mesh(placeholderGeom, placeholderMat);
    this.clickTarget.position.y = 1.2;
    this.group.add(this.clickTarget);

    // 2. Load Authentic Texture (Author's exact hand-painted artwork)
    const textureLoader = new THREE.TextureLoader();
    const mouseTex = textureLoader.load('/assets/characters/mouse_cutout.png');
    mouseTex.colorSpace = THREE.SRGBColorSpace;
    mouseTex.wrapS = THREE.ClampToEdgeWrapping;
    mouseTex.wrapT = THREE.ClampToEdgeWrapping;

    // 3. Load Volumetric Watertight 3D Geometry
    fetch('/assets/characters/mousekin_geometry.json')
      .then((res) => res.json())
      .then((data: { positions: number[]; uvs: number[]; indices: number[] }) => {
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(data.uvs, 2));
        geom.setIndex(data.indices);
        geom.computeVertexNormals();

        const mat = new THREE.MeshStandardMaterial({
          map: mouseTex,
          roughness: 0.52,
          metalness: 0.04,
          side: THREE.FrontSide
        });

        this.modelMesh = new THREE.Mesh(geom, mat);
        this.modelMesh.castShadow = true;
        this.modelMesh.receiveShadow = true;
        this.group.add(this.modelMesh);

        // Click target becomes the solid 3D model
        this.clickTarget = this.modelMesh;
      })
      .catch((err) => {
        console.error('Error loading mousekin volumetric geometry:', err);
      });
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
    // 1. Idle Gentle Breathing
    if (this.modelMesh) {
      const breath = Math.sin(time * 2.5) * 0.018;
      this.modelMesh.scale.set(1 + breath * 0.5, 1 + breath, 1 + breath * 0.5);
    }

    // 2. Camera Tracking Gaze
    if (this.cameraRef && this.modelMesh) {
      const camPos = this.cameraRef.position;
      const charPos = this.group.position;
      const targetAngle = Math.atan2(camPos.x - charPos.x, camPos.z - charPos.z);

      // Smooth interpolation towards camera angle
      const diff = targetAngle - this.group.rotation.y;
      const wrappedDiff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.group.rotation.y += wrappedDiff * 0.055;
    }

    // 3. Jump Animation
    if (this.isJumping) {
      this.jumpProgress += 0.06;
      const jumpHeight = Math.sin(this.jumpProgress * Math.PI) * 0.85;
      this.group.position.y = Math.max(0, jumpHeight);

      if (this.modelMesh) {
        const stretch = Math.sin(this.jumpProgress * Math.PI) * 0.12;
        this.modelMesh.scale.set(1 - stretch * 0.5, 1 + stretch, 1 - stretch * 0.5);
      }

      this.shadowMesh.scale.setScalar(1 - jumpHeight * 0.35);

      if (this.jumpProgress >= 1) {
        this.isJumping = false;
        this.group.position.y = 0;
        this.shadowMesh.scale.setScalar(1);
        if (this.modelMesh) this.modelMesh.scale.set(1, 1, 1);
      }
    }
  }
}
