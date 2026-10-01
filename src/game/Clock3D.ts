import * as THREE from 'three';

export class Clock3D {
  public group: THREE.Group;
  public clickTarget: THREE.Object3D;

  private hourHand: THREE.Mesh;
  private minuteHand: THREE.Mesh;
  private bellsGroup: THREE.Group;
  private striker: THREE.Mesh;
  private clockBody: THREE.Mesh;

  private isRinging: boolean = false;
  private ringTimer: number = 0;
  private spinSpeed: number = 1;

  constructor() {
    this.group = new THREE.Group();

    // Materials Palette (Matching authentic "Alarm.png" author's art)
    const purpleBodyMat = new THREE.MeshStandardMaterial({
      color: 0x332266, // Deep starry indigo-purple
      roughness: 0.35,
      metalness: 0.25
    });

    const brassBezelMat = new THREE.MeshStandardMaterial({
      color: 0xdda43b, // Warm antique brass / gold
      roughness: 0.25,
      metalness: 0.75
    });

    const dialFaceMat = new THREE.MeshStandardMaterial({
      color: 0xfaf6ed, // Warm ivory parchment
      roughness: 0.85
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x221a28,
      roughness: 0.5,
      metalness: 0.6
    });

    const handMat = new THREE.MeshStandardMaterial({
      color: 0x14101e,
      roughness: 0.3,
      metalness: 0.4
    });

    const dotPurpleMat = new THREE.MeshBasicMaterial({
      color: 0x9e1a8a // Vibrant magenta-purple dot markers from Alarm.png
    });

    const starGoldMat = new THREE.MeshBasicMaterial({
      color: 0xffe680 // Delicate star dots on outer casing
    });

    // ==========================================
    // 1. MAIN CLOCK DRUM / CASING
    // ==========================================
    const drumRadius = 0.55;
    const drumDepth = 0.35;
    const drumGeom = new THREE.CylinderGeometry(drumRadius, drumRadius, drumDepth, 32);
    drumGeom.rotateX(Math.PI / 2);
    this.clockBody = new THREE.Mesh(drumGeom, purpleBodyMat);
    this.clockBody.castShadow = true;
    this.clockBody.receiveShadow = true;
    this.group.add(this.clockBody);

    // Front Brass Bezel Ring
    const bezelGeom = new THREE.TorusGeometry(drumRadius + 0.02, 0.04, 16, 32);
    const bezel = new THREE.Mesh(bezelGeom, brassBezelMat);
    bezel.position.z = drumDepth * 0.5;
    this.group.add(bezel);

    // Little Gold Stars on the purple rim
    for (let s = 0; s < 8; s++) {
      const angle = (s / 8) * Math.PI * 2 + 0.2;
      const starGeom = new THREE.CircleGeometry(0.028, 5);
      const star = new THREE.Mesh(starGeom, starGoldMat);
      star.position.set(
        Math.cos(angle) * (drumRadius - 0.04),
        Math.sin(angle) * (drumRadius - 0.04),
        drumDepth * 0.5 + 0.015
      );
      this.group.add(star);
    }

    // ==========================================
    // 2. DIAL FACE & NUMERALS
    // ==========================================
    const dialGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.02, 32);
    dialGeom.rotateX(Math.PI / 2);
    const dial = new THREE.Mesh(dialGeom, dialFaceMat);
    dial.position.z = drumDepth * 0.5 + 0.01;
    this.group.add(dial);

    // Hour Dots & Main Numeral Markers (12, 3, 6, 9)
    for (let h = 1; h <= 12; h++) {
      const angle = (h / 12) * Math.PI * 2;
      const r = 0.36;
      const x = Math.sin(angle) * r;
      const y = Math.cos(angle) * r;

      if (h % 3 === 0) {
        // Main cardinal markers (12, 3, 6, 9)
        const tickGeom = new THREE.BoxGeometry(0.035, 0.07, 0.01);
        const tick = new THREE.Mesh(tickGeom, handMat);
        tick.position.set(x, y, drumDepth * 0.5 + 0.025);
        tick.rotation.z = -angle;
        this.group.add(tick);
      } else {
        // Purple dots for intermediate hours
        const dotGeom = new THREE.CircleGeometry(0.022, 12);
        const dot = new THREE.Mesh(dotGeom, dotPurpleMat);
        dot.position.set(x, y, drumDepth * 0.5 + 0.025);
        this.group.add(dot);
      }
    }

    // ==========================================
    // 3. HANDS & CENTER PIN
    // ==========================================
    // Hour Hand (Ornate teardrop shape)
    const hourGeom = new THREE.BoxGeometry(0.045, 0.22, 0.015);
    hourGeom.translate(0, 0.1, 0);
    this.hourHand = new THREE.Mesh(hourGeom, handMat);
    this.hourHand.position.set(0, 0, drumDepth * 0.5 + 0.03);
    this.hourHand.rotation.z = -Math.PI * 0.65; // ~ 10 o'clock
    this.group.add(this.hourHand);

    // Minute Hand (Pointed slender hand)
    const minGeom = new THREE.BoxGeometry(0.03, 0.32, 0.015);
    minGeom.translate(0, 0.15, 0);
    this.minuteHand = new THREE.Mesh(minGeom, handMat);
    this.minuteHand.position.set(0, 0, drumDepth * 0.5 + 0.035);
    this.minuteHand.rotation.z = -Math.PI * 0.1; // ~ 1 o'clock
    this.group.add(this.minuteHand);

    // Center brass cap
    const pinGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.04, 16);
    pinGeom.rotateX(Math.PI / 2);
    const pin = new THREE.Mesh(pinGeom, brassBezelMat);
    pin.position.set(0, 0, drumDepth * 0.5 + 0.04);
    this.group.add(pin);

    // ==========================================
    // 4. RETRO ALARM BELLS & STRIKER
    // ==========================================
    this.bellsGroup = new THREE.Group();

    const buildBell = (isLeft: boolean) => {
      const bellSub = new THREE.Group();
      const dir = isLeft ? -1 : 1;
      bellSub.position.set(dir * 0.42, drumRadius + 0.18, 0);
      bellSub.rotation.z = dir * -0.4;

      // Stem post
      const stemGeom = new THREE.CylinderGeometry(0.03, 0.03, 0.18, 10);
      const stem = new THREE.Mesh(stemGeom, darkMetalMat);
      stem.position.y = -0.09;
      bellSub.add(stem);

      // Curved dome bell
      const domeGeom = new THREE.SphereGeometry(0.24, 20, 16, 0, Math.PI * 2, 0, Math.PI * 0.5);
      domeGeom.scale(1.0, 0.65, 1.0);
      const dome = new THREE.Mesh(domeGeom, purpleBodyMat);
      dome.castShadow = true;
      bellSub.add(dome);

      // Star on top of bell
      const bellStar = new THREE.Mesh(new THREE.CircleGeometry(0.03, 5), starGoldMat);
      bellStar.rotation.x = -Math.PI / 2;
      bellStar.position.y = 0.16;
      bellSub.add(bellStar);

      return bellSub;
    };

    this.bellsGroup.add(buildBell(true));
    this.bellsGroup.add(buildBell(false));

    // Striker hammer in center
    const strikerStemGeom = new THREE.CylinderGeometry(0.02, 0.02, 0.16, 8);
    const strikerStem = new THREE.Mesh(strikerStemGeom, darkMetalMat);
    strikerStem.position.set(0, drumRadius + 0.08, 0);
    this.bellsGroup.add(strikerStem);

    const hammerGeom = new THREE.SphereGeometry(0.05, 12, 10);
    this.striker = new THREE.Mesh(hammerGeom, brassBezelMat);
    this.striker.position.set(0, drumRadius + 0.17, 0);
    this.bellsGroup.add(this.striker);

    this.group.add(this.bellsGroup);

    // ==========================================
    // 5. METAL FEET
    // ==========================================
    const footGeom = new THREE.CylinderGeometry(0.03, 0.05, 0.22, 10);
    const footMat = darkMetalMat;

    const leftFoot = new THREE.Mesh(footGeom, footMat);
    leftFoot.position.set(-0.35, -drumRadius - 0.05, 0);
    leftFoot.rotation.z = 0.35;
    this.group.add(leftFoot);

    const rightFoot = new THREE.Mesh(footGeom, footMat);
    rightFoot.position.set(0.35, -drumRadius - 0.05, 0);
    rightFoot.rotation.z = -0.35;
    this.group.add(rightFoot);

    // Rear kickstand
    const standGeom = new THREE.CylinderGeometry(0.025, 0.035, 0.32, 8);
    const stand = new THREE.Mesh(standGeom, footMat);
    stand.position.set(0, -drumRadius * 0.5, -0.22);
    stand.rotation.x = -0.6;
    this.group.add(stand);

    this.clickTarget = this.clockBody;
  }

  public spinFast(durationMs: number = 2400) {
    this.isRinging = true;
    this.spinSpeed = 22;
    this.ringTimer = durationMs / 1000;
  }

  public update(time: number) {
    if (this.isRinging) {
      this.ringTimer -= 0.016;

      // Wild hand rotation!
      this.minuteHand.rotation.z -= this.spinSpeed * 0.14;
      this.hourHand.rotation.z -= this.spinSpeed * 0.018;

      // Jiggling hammer and vibrating bells
      this.striker.position.x = Math.sin(time * 65) * 0.07;
      this.bellsGroup.rotation.z = Math.sin(time * 50) * 0.05;
      this.clockBody.position.y = Math.sin(time * 70) * 0.015;

      if (this.ringTimer <= 0) {
        this.isRinging = false;
        this.spinSpeed = 1;
        this.striker.position.x = 0;
        this.bellsGroup.rotation.z = 0;
        this.clockBody.position.y = 0;
      }
    } else {
      // Normal ticking
      this.minuteHand.rotation.z = -time * 0.35;
      this.hourHand.rotation.z = -time * 0.03;
    }
  }
}
