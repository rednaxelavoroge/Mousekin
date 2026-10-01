import * as THREE from 'three';

export class Character3D {
  public group: THREE.Group;
  public mesh: THREE.Mesh;
  private isJumping: boolean = false;
  private jumpProgress: number = 0;
  private baseY: number = 0;

  constructor() {
    this.group = new THREE.Group();

    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('/assets/characters/mouse_cutout.png');
    texture.colorSpace = THREE.SRGBColorSpace;

    // The mouse aspect ratio is roughly 387 / 886 = 0.437
    const height = 2.4;
    const width = height * 0.437;

    const geom = new THREE.PlaneGeometry(width, height);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      roughness: 0.8,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geom, mat);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.position.y = height / 2;

    this.group.add(this.mesh);

    // Subtle drop shadow plane on floor
    const shadowGeom = new THREE.CircleGeometry(0.4, 16);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x110822,
      transparent: true,
      opacity: 0.35
    });
    const shadow = new THREE.Mesh(shadowGeom, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.group.add(shadow);
  }

  public jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    this.jumpProgress = 0;
  }

  public update(time: number) {
    if (this.isJumping) {
      this.jumpProgress += 0.07;
      const jumpHeight = Math.sin(this.jumpProgress * Math.PI) * 0.6;
      this.mesh.position.y = (2.4 / 2) + jumpHeight;
      this.mesh.rotation.z = Math.sin(this.jumpProgress * Math.PI * 2) * 0.15;

      if (this.jumpProgress >= 1) {
        this.isJumping = false;
        this.mesh.position.y = 2.4 / 2;
        this.mesh.rotation.z = 0;
      }
    } else {
      // Gentle breathing & idle sway
      const breathe = Math.sin(time * 2.5) * 0.02;
      this.mesh.scale.set(1 + breathe * 0.5, 1 + breathe, 1);
      this.mesh.rotation.z = Math.sin(time * 1.2) * 0.03;
    }
  }
}
