import * as THREE from 'three';

export type Season = 'summer' | 'winter' | 'autumn' | 'spring';

export class SeasonParticles {
  public group: THREE.Group;
  private currentSeason: Season = 'summer';
  
  // Particle Systems
  private snowParticles: THREE.Points;
  private leafParticles: THREE.Points;
  private blossomParticles: THREE.Points;
  private fireflyParticles: THREE.Points;

  private snowGeom: THREE.BufferGeometry;
  private leafGeom: THREE.BufferGeometry;
  private blossomGeom: THREE.BufferGeometry;
  private fireflyGeom: THREE.BufferGeometry;

  private count: number = 350;

  private createCircleTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
  }

  constructor() {
    this.group = new THREE.Group();
    const particleTex = this.createCircleTexture();

    // 1. Snowflakes
    this.snowGeom = this.createParticleGeometry(this.count, 14, 10, 14);
    const snowMat = new THREE.PointsMaterial({
      color: 0xe6f7ff,
      size: 0.22,
      map: particleTex,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.snowParticles = new THREE.Points(this.snowGeom, snowMat);
    this.snowParticles.visible = false;
    this.group.add(this.snowParticles);

    // 2. Autumn Leaves
    this.leafGeom = this.createParticleGeometry(this.count, 14, 10, 14);
    const leafMat = new THREE.PointsMaterial({
      color: 0xee7722,
      size: 0.28,
      map: particleTex,
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    this.leafParticles = new THREE.Points(this.leafGeom, leafMat);
    this.leafParticles.visible = false;
    this.group.add(this.leafParticles);

    // 3. Spring Blossoms
    this.blossomGeom = this.createParticleGeometry(this.count, 14, 10, 14);
    const blossomMat = new THREE.PointsMaterial({
      color: 0xffb7d5,
      size: 0.24,
      map: particleTex,
      transparent: true,
      opacity: 0.85,
      depthWrite: false
    });
    this.blossomParticles = new THREE.Points(this.blossomGeom, blossomMat);
    this.blossomParticles.visible = false;
    this.group.add(this.blossomParticles);

    // 4. Summer Fireflies
    this.fireflyGeom = this.createParticleGeometry(120, 10, 8, 10);
    const fireflyMat = new THREE.PointsMaterial({
      color: 0xffea77,
      size: 0.25,
      map: particleTex,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.fireflyParticles = new THREE.Points(this.fireflyGeom, fireflyMat);
    this.fireflyParticles.visible = true;
    this.group.add(this.fireflyParticles);
  }

  private createParticleGeometry(num: number, rx: number, ry: number, rz: number): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(num * 3);
    const velocities = new Float32Array(num * 3);

    for (let i = 0; i < num; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * rx;
      positions[i * 3 + 1] = Math.random() * ry - 1;
      positions[i * 3 + 2] = (Math.random() - 0.5) * rz;

      velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = 0.01 + Math.random() * 0.03;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    return geom;
  }

  public setSeason(season: Season) {
    this.currentSeason = season;
    this.snowParticles.visible = season === 'winter';
    this.leafParticles.visible = season === 'autumn';
    this.blossomParticles.visible = season === 'spring';
    this.fireflyParticles.visible = season === 'summer';
  }

  public getSeason(): Season {
    return this.currentSeason;
  }

  public update(time: number) {
    if (this.currentSeason === 'winter') {
      this.animateFalling(this.snowGeom, 0.025, 0.01, 10, time);
    } else if (this.currentSeason === 'autumn') {
      this.animateFalling(this.leafGeom, 0.035, 0.03, 10, time);
    } else if (this.currentSeason === 'spring') {
      this.animateFalling(this.blossomGeom, 0.02, 0.015, 10, time);
    } else if (this.currentSeason === 'summer') {
      this.animateFloating(this.fireflyGeom, time);
    }
  }

  private animateFalling(geom: THREE.BufferGeometry, speedY: number, swayX: number, height: number, time: number) {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const array = pos.array as Float32Array;

    for (let i = 0; i < array.length / 3; i++) {
      array[i * 3 + 1] -= speedY;
      array[i * 3 + 0] += Math.sin(time * 2 + i) * swayX * 0.1;

      if (array[i * 3 + 1] < -2) {
        array[i * 3 + 1] = height - 1;
        array[i * 3 + 0] = (Math.random() - 0.5) * 12;
        array[i * 3 + 2] = (Math.random() - 0.5) * 12;
      }
    }
    pos.needsUpdate = true;
  }

  private animateFloating(geom: THREE.BufferGeometry, time: number) {
    const pos = geom.getAttribute('position') as THREE.BufferAttribute;
    const array = pos.array as Float32Array;

    for (let i = 0; i < array.length / 3; i++) {
      array[i * 3 + 0] += Math.sin(time + i * 0.5) * 0.005;
      array[i * 3 + 1] += Math.cos(time * 1.5 + i * 0.7) * 0.004;
      array[i * 3 + 2] += Math.sin(time * 0.8 + i) * 0.005;
    }
    pos.needsUpdate = true;
  }
}
