import * as THREE from 'three';

export class Character3D {
  public group: THREE.Group;
  public clickTarget: THREE.Object3D;

  // Body parts for animation
  private headGroup: THREE.Group;
  private earLeft: THREE.Group;
  private earRight: THREE.Group;
  private armLeft: THREE.Group;
  private armRight: THREE.Group;
  private tail: THREE.Group;
  private bodyGroup: THREE.Group;

  // Jump animation state
  private isJumping: boolean = false;
  private jumpProgress: number = 0;

  constructor() {
    this.group = new THREE.Group();

    // Palette matching the author's illustration
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0xf0d6c2, // Light warm mouse fur
      roughness: 0.6,
      metalness: 0.05
    });

    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xf5aeb8, // Soft rosy pink
      roughness: 0.7
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xee5e23, // Orange polo shirt
      roughness: 0.5
    });

    const shortsMat = new THREE.MeshStandardMaterial({
      color: 0x76c4be, // Turquoise / cyan shorts
      roughness: 0.6
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x111111,
      roughness: 0.1,
      metalness: 0.3
    });

    const eyeShineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x221111, roughness: 0.3 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x6e2c14, roughness: 0.4 });
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });

    // --- 1. Root Body Group ---
    this.bodyGroup = new THREE.Group();
    this.group.add(this.bodyGroup);

    // Torso (Shirt)
    const torsoGeom = new THREE.CylinderGeometry(0.38, 0.44, 0.9, 16);
    const torso = new THREE.Mesh(torsoGeom, shirtMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    torso.receiveShadow = true;
    this.bodyGroup.add(torso);

    // Collar
    const collarGeom = new THREE.TorusGeometry(0.32, 0.06, 8, 16);
    const collar = new THREE.Mesh(collarGeom, shirtMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(0, 1.58, 0);
    this.bodyGroup.add(collar);

    // Tiny shirt buttons
    for (let i = 0; i < 3; i++) {
      const btnGeom = new THREE.SphereGeometry(0.025, 8, 8);
      const btnMat = new THREE.MeshStandardMaterial({ color: 0xaa2211 });
      const btn = new THREE.Mesh(btnGeom, btnMat);
      btn.position.set(0, 1.45 - i * 0.14, 0.42);
      this.bodyGroup.add(btn);
    }

    // Shorts / Hips
    const hipsGeom = new THREE.CylinderGeometry(0.44, 0.46, 0.45, 16);
    const hips = new THREE.Mesh(hipsGeom, shortsMat);
    hips.position.y = 0.75;
    hips.castShadow = true;
    this.bodyGroup.add(hips);

    // Left & Right Short Legs
    const shortLegGeom = new THREE.CylinderGeometry(0.2, 0.22, 0.35, 12);
    const leftShortLeg = new THREE.Mesh(shortLegGeom, shortsMat);
    leftShortLeg.position.set(-0.2, 0.45, 0);
    this.bodyGroup.add(leftShortLeg);

    const rightShortLeg = new THREE.Mesh(shortLegGeom, shortsMat);
    rightShortLeg.position.set(0.2, 0.45, 0);
    this.bodyGroup.add(rightShortLeg);

    // Legs (Fur / Skin)
    const legGeom = new THREE.CylinderGeometry(0.08, 0.08, 0.3, 10);
    const leftLeg = new THREE.Mesh(legGeom, skinMat);
    leftLeg.position.set(-0.2, 0.2, 0);
    leftLeg.castShadow = true;
    this.bodyGroup.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeom, skinMat);
    rightLeg.position.set(0.2, 0.2, 0);
    rightLeg.castShadow = true;
    this.bodyGroup.add(rightLeg);

    // Socks (White)
    const sockGeom = new THREE.CylinderGeometry(0.09, 0.09, 0.1, 10);
    const leftSock = new THREE.Mesh(sockGeom, sockMat);
    leftSock.position.set(-0.2, 0.1, 0);
    this.bodyGroup.add(leftSock);

    const rightSock = new THREE.Mesh(sockGeom, sockMat);
    rightSock.position.set(0.2, 0.1, 0);
    this.bodyGroup.add(rightSock);

    // Shoes (Brown Leather)
    const shoeGeom = new THREE.BoxGeometry(0.18, 0.12, 0.28);
    shoeGeom.translate(0, 0, 0.05);
    const leftShoe = new THREE.Mesh(shoeGeom, shoeMat);
    leftShoe.position.set(-0.2, 0.06, 0);
    leftShoe.castShadow = true;
    this.bodyGroup.add(leftShoe);

    const rightShoe = new THREE.Mesh(shoeGeom, shoeMat);
    rightShoe.position.set(0.2, 0.06, 0);
    rightShoe.castShadow = true;
    this.bodyGroup.add(rightShoe);

    // --- 2. Arms & Paws ---
    // Left Arm
    this.armLeft = new THREE.Group();
    this.armLeft.position.set(-0.46, 1.45, 0);
    const sleeveGeom = new THREE.CylinderGeometry(0.14, 0.14, 0.3, 10);
    const sleeveLeft = new THREE.Mesh(sleeveGeom, shirtMat);
    sleeveLeft.position.y = -0.15;
    this.armLeft.add(sleeveLeft);

    const armGeom = new THREE.CylinderGeometry(0.08, 0.07, 0.45, 10);
    armGeom.translate(0, -0.22, 0);
    const armL = new THREE.Mesh(armGeom, skinMat);
    armL.position.y = -0.25;
    this.armLeft.add(armL);
    this.bodyGroup.add(this.armLeft);

    // Right Arm
    this.armRight = new THREE.Group();
    this.armRight.position.set(0.46, 1.45, 0);
    const sleeveRight = new THREE.Mesh(sleeveGeom, shirtMat);
    sleeveRight.position.y = -0.15;
    this.armRight.add(sleeveRight);

    const armR = new THREE.Mesh(armGeom, skinMat);
    armR.position.y = -0.25;
    this.armRight.add(armR);
    this.bodyGroup.add(this.armRight);

    // --- 3. Tail ---
    this.tail = new THREE.Group();
    this.tail.position.set(0, 0.65, -0.35);
    const tailCurve = new THREE.CylinderGeometry(0.04, 0.015, 0.9, 8);
    tailCurve.translate(0, 0.35, -0.2);
    tailCurve.rotateX(-0.5);
    const tailMesh = new THREE.Mesh(tailCurve, skinMat);
    this.tail.add(tailMesh);
    this.bodyGroup.add(this.tail);

    // --- 4. Head Group ---
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.85, 0);
    this.bodyGroup.add(this.headGroup);

    // Head Base (Egg / Sphere shaped)
    const headGeom = new THREE.SphereGeometry(0.55, 32, 24);
    headGeom.scale(1, 1.15, 0.95);
    const head = new THREE.Mesh(headGeom, skinMat);
    head.castShadow = true;
    this.headGroup.add(head);

    // Snout / Muzzle
    const muzzleGeom = new THREE.ConeGeometry(0.28, 0.35, 16);
    muzzleGeom.rotateX(Math.PI / 2);
    const muzzle = new THREE.Mesh(muzzleGeom, skinMat);
    muzzle.position.set(0, -0.1, 0.45);
    this.headGroup.add(muzzle);

    // Cute Black Nose
    const noseGeom = new THREE.SphereGeometry(0.07, 12, 12);
    noseGeom.scale(1.2, 0.9, 1);
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.set(0, -0.05, 0.65);
    this.headGroup.add(nose);

    // Big Anime / Cartoon Mouse Eyes (Left & Right)
    const eyeGeom = new THREE.SphereGeometry(0.18, 24, 16);
    eyeGeom.scale(0.85, 1.25, 0.4);

    const leftEye = new THREE.Mesh(eyeGeom, eyeMat);
    leftEye.position.set(-0.22, 0.12, 0.45);
    leftEye.rotation.y = -0.25;
    leftEye.rotation.z = -0.08;
    this.headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeom, eyeMat);
    rightEye.position.set(0.22, 0.12, 0.45);
    rightEye.rotation.y = 0.25;
    rightEye.rotation.z = 0.08;
    this.headGroup.add(rightEye);

    // Eye Highlights (The signature twin sparkle in author's art)
    const addShine = (parent: THREE.Object3D, ox: number, oy: number, sz: number) => {
      const shineGeom = new THREE.CircleGeometry(sz, 12);
      const shine = new THREE.Mesh(shineGeom, eyeShineMat);
      shine.position.set(ox, oy, 0.15);
      parent.add(shine);
    };
    addShine(leftEye, -0.03, 0.06, 0.045);
    addShine(leftEye, 0.04, -0.04, 0.025);
    addShine(rightEye, -0.03, 0.06, 0.045);
    addShine(rightEye, 0.04, -0.04, 0.025);

    // Blushing Rosy Cheeks
    const cheekGeom = new THREE.CircleGeometry(0.11, 16);
    const cheekMat = new THREE.MeshBasicMaterial({ color: 0xf59898, transparent: true, opacity: 0.5 });

    const leftCheek = new THREE.Mesh(cheekGeom, cheekMat);
    leftCheek.position.set(-0.35, -0.08, 0.42);
    leftCheek.rotation.y = -0.45;
    this.headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeom, cheekMat);
    rightCheek.position.set(0.35, -0.08, 0.42);
    rightCheek.rotation.y = 0.45;
    this.headGroup.add(rightCheek);

    // --- 5. Big Expressive Mouse Ears ---
    // Left Ear
    this.earLeft = new THREE.Group();
    this.earLeft.position.set(-0.55, 0.55, 0);

    const earOuterGeom = new THREE.CylinderGeometry(0.48, 0.48, 0.08, 24);
    earOuterGeom.rotateX(Math.PI / 2);
    const earOuterL = new THREE.Mesh(earOuterGeom, skinMat);
    earOuterL.castShadow = true;
    this.earLeft.add(earOuterL);

    const earInnerGeom = new THREE.CylinderGeometry(0.36, 0.36, 0.09, 24);
    earInnerGeom.rotateX(Math.PI / 2);
    const earInnerL = new THREE.Mesh(earInnerGeom, innerEarMat);
    earInnerL.position.z = 0.01;
    this.earLeft.add(earInnerL);

    this.earLeft.rotation.z = 0.35;
    this.earLeft.rotation.y = -0.25;
    this.headGroup.add(this.earLeft);

    // Right Ear
    this.earRight = new THREE.Group();
    this.earRight.position.set(0.55, 0.55, 0);

    const earOuterR = new THREE.Mesh(earOuterGeom, skinMat);
    earOuterR.castShadow = true;
    this.earRight.add(earOuterR);

    const earInnerR = new THREE.Mesh(earInnerGeom, innerEarMat);
    earInnerR.position.z = 0.01;
    this.earRight.add(earInnerR);

    this.earRight.rotation.z = -0.35;
    this.earRight.rotation.y = 0.25;
    this.headGroup.add(this.earRight);

    // 6. Floor Contact Shadow
    const shadowGeom = new THREE.CircleGeometry(0.55, 24);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x110822,
      transparent: true,
      opacity: 0.4
    });
    const shadow = new THREE.Mesh(shadowGeom, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.015;
    this.group.add(shadow);

    // Raycast click target (torso + head)
    this.clickTarget = torso;
  }

  public jump() {
    if (this.isJumping) return;
    this.isJumping = true;
    this.jumpProgress = 0;
  }

  public update(time: number) {
    if (this.isJumping) {
      this.jumpProgress += 0.06;
      const jumpHeight = Math.sin(this.jumpProgress * Math.PI) * 0.7;
      this.bodyGroup.position.y = jumpHeight;

      // Happy spin & arm wave during jump
      this.bodyGroup.rotation.y = Math.sin(this.jumpProgress * Math.PI) * 0.4;
      this.armLeft.rotation.z = 0.5 + Math.sin(this.jumpProgress * Math.PI * 4) * 0.5;
      this.armRight.rotation.z = -0.5 - Math.sin(this.jumpProgress * Math.PI * 4) * 0.5;

      if (this.jumpProgress >= 1) {
        this.isJumping = false;
        this.bodyGroup.position.y = 0;
        this.bodyGroup.rotation.y = 0;
        this.armLeft.rotation.z = 0;
        this.armRight.rotation.z = 0;
      }
    } else {
      // 1. Idle breathing
      const breathe = Math.sin(time * 2.2) * 0.025;
      this.bodyGroup.scale.set(1 + breathe * 0.4, 1 + breathe, 1 + breathe * 0.4);

      // 2. Head curious tilt
      this.headGroup.rotation.z = Math.sin(time * 1.1) * 0.04;
      this.headGroup.rotation.y = Math.cos(time * 0.8) * 0.06;

      // 3. Ear twitches
      this.earLeft.rotation.x = Math.sin(time * 3) * 0.05;
      this.earRight.rotation.x = Math.cos(time * 3) * 0.05;

      // 4. Tail sway in 3D
      this.tail.rotation.y = Math.sin(time * 2.5) * 0.35;
      this.tail.rotation.z = Math.cos(time * 1.8) * 0.15;

      // 5. Gentle arm sway
      this.armLeft.rotation.x = Math.sin(time * 1.5) * 0.08;
      this.armRight.rotation.x = -Math.sin(time * 1.5) * 0.08;
    }
  }
}
