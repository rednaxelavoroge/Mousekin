import * as THREE from 'three';

export class Clock3D {
  public group: THREE.Group;
  public clockMesh: THREE.Mesh;
  private hourHand: THREE.Mesh;
  private minuteHand: THREE.Mesh;
  private pendulum: THREE.Group;
  private gears: THREE.Mesh[] = [];

  private isSpinningFast: boolean = false;
  private spinSpeed: number = 1;
  private targetHourAngle: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // 1. Clock Case (Wooden Stylized)
    const caseGeom = new THREE.BoxGeometry(1.4, 2.2, 0.4);
    const caseMat = new THREE.MeshStandardMaterial({
      color: 0x8b4513,
      roughness: 0.5,
      metalness: 0.1
    });
    const clockCase = new THREE.Mesh(caseGeom, caseMat);
    clockCase.castShadow = true;
    clockCase.receiveShadow = true;
    this.group.add(clockCase);

    // 2. Gold Rim / Face Base
    const rimGeom = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 32);
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      roughness: 0.3,
      metalness: 0.8
    });
    const rim = new THREE.Mesh(rimGeom, goldMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(0, 0.4, 0.2);
    this.group.add(rim);

    // 3. Dial Face (Ivory white)
    const dialGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.11, 32);
    const dialMat = new THREE.MeshStandardMaterial({
      color: 0xfffaea,
      roughness: 0.8
    });
    this.clockMesh = new THREE.Mesh(dialGeom, dialMat);
    this.clockMesh.rotation.x = Math.PI / 2;
    this.clockMesh.position.set(0, 0.4, 0.21);
    this.group.add(this.clockMesh);

    // Dial markings (12 hour ticks)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const tickGeom = new THREE.BoxGeometry(0.04, 0.1, 0.02);
      const tickMat = new THREE.MeshBasicMaterial({ color: 0x221100 });
      const tick = new THREE.Mesh(tickGeom, tickMat);
      tick.position.set(Math.sin(angle) * 0.4, 0.4 + Math.cos(angle) * 0.4, 0.27);
      tick.rotation.z = -angle;
      this.group.add(tick);
    }

    // 4. Hour Hand
    const hourGeom = new THREE.BoxGeometry(0.05, 0.28, 0.02);
    hourGeom.translate(0, 0.14, 0);
    const handMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.7 });
    this.hourHand = new THREE.Mesh(hourGeom, handMat);
    this.hourHand.position.set(0, 0.4, 0.28);
    this.group.add(this.hourHand);

    // 5. Minute Hand
    const minGeom = new THREE.BoxGeometry(0.035, 0.38, 0.02);
    minGeom.translate(0, 0.19, 0);
    this.minuteHand = new THREE.Mesh(minGeom, handMat);
    this.minuteHand.position.set(0, 0.4, 0.29);
    this.group.add(this.minuteHand);

    // 6. Center Pin
    const pinGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.04, 16);
    const pin = new THREE.Mesh(pinGeom, goldMat);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(0, 0.4, 0.3);
    this.group.add(pin);

    // 7. Pendulum
    this.pendulum = new THREE.Group();
    this.pendulum.position.set(0, -0.1, 0.05);

    const rodGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.7, 12);
    rodGeom.translate(0, -0.35, 0);
    const rod = new THREE.Mesh(rodGeom, goldMat);
    this.pendulum.add(rod);

    const bobGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.05, 24);
    bobGeom.translate(0, -0.7, 0);
    bobGeom.rotateX(Math.PI / 2);
    const bob = new THREE.Mesh(bobGeom, goldMat);
    this.pendulum.add(bob);

    this.group.add(this.pendulum);

    // 8. Little gears on top
    const gearGeom = new THREE.CylinderGeometry(0.2, 0.2, 0.05, 8);
    const gear1 = new THREE.Mesh(gearGeom, goldMat);
    gear1.position.set(0.35, 1.25, 0);
    gear1.rotation.x = Math.PI / 2;
    this.gears.push(gear1);
    this.group.add(gear1);

    const gear2 = new THREE.Mesh(gearGeom, goldMat);
    gear2.position.set(-0.35, 1.25, 0);
    gear2.rotation.x = Math.PI / 2;
    gear2.scale.set(0.7, 0.7, 0.7);
    this.gears.push(gear2);
    this.group.add(gear2);
  }

  public spinFast(durationMs: number = 2000) {
    this.isSpinningFast = true;
    this.spinSpeed = 15;
    setTimeout(() => {
      this.isSpinningFast = false;
      this.spinSpeed = 1;
    }, durationMs);
  }

  public update(time: number) {
    // Normal ticking or crazy time-warp spin
    if (this.isSpinningFast) {
      this.minuteHand.rotation.z -= this.spinSpeed * 0.1;
      this.hourHand.rotation.z -= this.spinSpeed * 0.015;
    } else {
      this.minuteHand.rotation.z = -time * 0.5;
      this.hourHand.rotation.z = -time * 0.04;
    }

    // Pendulum swing
    this.pendulum.rotation.z = Math.sin(time * 3) * 0.25;

    // Small decorative gears
    if (this.gears[0]) this.gears[0].rotation.z = time * 0.8;
    if (this.gears[1]) this.gears[1].rotation.z = -time * 1.2;
  }
}
