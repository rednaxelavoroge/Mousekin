import * as THREE from 'three';

export class Character3D {
  public group: THREE.Group;
  public clickTarget: THREE.Object3D;

  private headGroup: THREE.Group;
  private bodyGroup: THREE.Group;
  private leftArmGroup: THREE.Group;
  private rightArmGroup: THREE.Group;
  private leftLegGroup: THREE.Group;
  private rightLegGroup: THREE.Group;
  private tailMesh?: THREE.Mesh;

  // Face elements for animation
  private leftEyelid?: THREE.Mesh;
  private rightEyelid?: THREE.Mesh;
  private leftEarGroup: THREE.Group;
  private rightEarGroup: THREE.Group;

  // Shadow
  private shadowMesh: THREE.Mesh;

  // Animation states
  private isJumping: boolean = false;
  private jumpProgress: number = 0;
  private blinkTimer: number = 0;
  private nextBlinkInterval: number = 3.2;
  private isBlinking: boolean = false;
  private blinkProgress: number = 0;

  // Camera tracking reference
  private cameraRef?: THREE.Camera;

  constructor(camera?: THREE.Camera) {
    this.cameraRef = camera;
    this.group = new THREE.Group();

    // 1. Shared Materials Palette (Accurate to Author's "Мыш.png" and "coverRU.png")
    const furMat = new THREE.MeshStandardMaterial({
      color: 0xdfc7b4, // Authentic warm soft mouse skin/fur tone
      roughness: 0.68,
      metalness: 0.02
    });

    const innerEarMat = new THREE.MeshStandardMaterial({
      color: 0xf5b5be, // Tender rosy inner ear
      roughness: 0.65,
      metalness: 0.02
    });

    const cheekBlushMat = new THREE.MeshStandardMaterial({
      color: 0xf49da1, // Rosy blush on cheeks
      transparent: true,
      opacity: 0.55,
      roughness: 0.8
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0x0f0f12, // Deep glossy black eyes
      roughness: 0.05,
      metalness: 0.12
    });

    const specularDotMat = new THREE.MeshBasicMaterial({
      color: 0xffffff
    });

    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x24140e, // Small dark chocolate button nose
      roughness: 0.25,
      metalness: 0.08
    });

    const mouthMat = new THREE.MeshBasicMaterial({
      color: 0x3d1c14
    });

    const eyebrowMat = new THREE.MeshBasicMaterial({
      color: 0x3a2216
    });

    const shirtMat = new THREE.MeshStandardMaterial({
      color: 0xf35527, // Authentic bright coral-orange polo shirt
      roughness: 0.58,
      metalness: 0.02
    });

    const buttonMat = new THREE.MeshStandardMaterial({
      color: 0x4a180e,
      roughness: 0.4
    });

    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x76c0b3, // Authentic mint-turquoise shorts
      roughness: 0.68,
      metalness: 0.02
    });

    const sockMat = new THREE.MeshStandardMaterial({
      color: 0xfcfcfc,
      roughness: 0.85
    });

    const shoeMat = new THREE.MeshStandardMaterial({
      color: 0x82281e, // Deep reddish-brown leather booties
      roughness: 0.45,
      metalness: 0.05
    });

    const soleMat = new THREE.MeshStandardMaterial({
      color: 0x38120a,
      roughness: 0.8
    });

    // ==========================================
    // 2. LEGS & SHOES
    // ==========================================
    this.leftLegGroup = new THREE.Group();
    this.rightLegGroup = new THREE.Group();
    this.leftLegGroup.position.set(-0.18, 0.38, 0);
    this.rightLegGroup.position.set(0.18, 0.38, 0);

    const buildLeg = (legGroup: THREE.Group) => {
      // Shorts leg cuff
      const cuffGeom = new THREE.CylinderGeometry(0.17, 0.2, 0.38, 18);
      const cuff = new THREE.Mesh(cuffGeom, pantsMat);
      cuff.position.y = 0.36;
      cuff.castShadow = true;
      legGroup.add(cuff);

      // Cream Mouse Leg
      const legGeom = new THREE.CylinderGeometry(0.08, 0.075, 0.32, 14);
      const leg = new THREE.Mesh(legGeom, furMat);
      leg.position.y = 0.16;
      leg.castShadow = true;
      legGroup.add(leg);

      // Folded White Sock
      const sockGeom = new THREE.CylinderGeometry(0.092, 0.092, 0.08, 14);
      const sock = new THREE.Mesh(sockGeom, sockMat);
      sock.position.y = 0.06;
      sock.castShadow = true;
      legGroup.add(sock);

      // Bootie Shoe
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.01, 0.04);

      const shoeMainGeom = new THREE.SphereGeometry(0.13, 16, 14);
      shoeMainGeom.scale(1.0, 0.82, 1.45);
      const shoeMain = new THREE.Mesh(shoeMainGeom, shoeMat);
      shoeMain.position.y = 0.07;
      shoeMain.position.z = 0.03;
      shoeMain.castShadow = true;
      shoeGroup.add(shoeMain);

      const soleGeom = new THREE.BoxGeometry(0.22, 0.04, 0.38);
      const sole = new THREE.Mesh(soleGeom, soleMat);
      sole.position.y = 0.02;
      sole.position.z = 0.03;
      shoeGroup.add(sole);

      legGroup.add(shoeGroup);
    };

    buildLeg(this.leftLegGroup);
    buildLeg(this.rightLegGroup);
    this.group.add(this.leftLegGroup);
    this.group.add(this.rightLegGroup);

    // ==========================================
    // 3. TORSO & BRIGHT ORANGE POLO SHIRT
    // ==========================================
    this.bodyGroup = new THREE.Group();
    this.bodyGroup.position.set(0, 1.05, 0);

    // Pelvis shorts block
    const pelvisGeom = new THREE.CylinderGeometry(0.35, 0.32, 0.32, 20);
    const pelvis = new THREE.Mesh(pelvisGeom, pantsMat);
    pelvis.position.y = -0.14;
    pelvis.castShadow = true;
    this.bodyGroup.add(pelvis);

    // Orange Shirt body
    const torsoGeom = new THREE.CylinderGeometry(0.33, 0.36, 0.58, 22);
    const torso = new THREE.Mesh(torsoGeom, shirtMat);
    torso.position.y = 0.25;
    torso.castShadow = true;
    this.bodyGroup.add(torso);

    // Shoulders
    const chestTopGeom = new THREE.SphereGeometry(0.34, 20, 16);
    chestTopGeom.scale(1.0, 0.52, 0.85);
    const chestTop = new THREE.Mesh(chestTopGeom, shirtMat);
    chestTop.position.y = 0.52;
    chestTop.castShadow = true;
    this.bodyGroup.add(chestTop);

    // Shirt Folded Collar
    const collarGeom = new THREE.TorusGeometry(0.18, 0.05, 10, 20);
    const collar = new THREE.Mesh(collarGeom, shirtMat);
    collar.rotation.x = Math.PI / 2.2;
    collar.position.set(0, 0.68, 0.02);
    this.bodyGroup.add(collar);

    // Placket & Button
    const placketGeom = new THREE.BoxGeometry(0.06, 0.36, 0.025);
    const placket = new THREE.Mesh(placketGeom, shirtMat);
    placket.position.set(0, 0.44, 0.31);
    this.bodyGroup.add(placket);

    const buttonGeom = new THREE.CylinderGeometry(0.022, 0.022, 0.02, 12);
    const button = new THREE.Mesh(buttonGeom, buttonMat);
    button.rotation.x = Math.PI / 2;
    button.position.set(0, 0.47, 0.33);
    this.bodyGroup.add(button);

    // Left Pocket
    const pocketGeom = new THREE.BoxGeometry(0.09, 0.1, 0.015);
    const pocket = new THREE.Mesh(pocketGeom, shirtMat);
    pocket.position.set(0.16, 0.38, 0.29);
    pocket.rotation.y = -0.28;
    this.bodyGroup.add(pocket);

    // ==========================================
    // 4. ARMS & LITTLE PAWS
    // ==========================================
    this.leftArmGroup = new THREE.Group();
    this.rightArmGroup = new THREE.Group();
    this.leftArmGroup.position.set(-0.38, 0.52, 0);
    this.rightArmGroup.position.set(0.38, 0.52, 0);

    const buildArm = (armGroup: THREE.Group, isLeft: boolean) => {
      const dir = isLeft ? -1 : 1;

      // Orange Sleeve
      const sleeveGeom = new THREE.CylinderGeometry(0.12, 0.14, 0.24, 16);
      const sleeve = new THREE.Mesh(sleeveGeom, shirtMat);
      sleeve.position.set(dir * 0.05, -0.05, 0);
      sleeve.rotation.z = dir * 0.32;
      sleeve.castShadow = true;
      armGroup.add(sleeve);

      // Cream Arm
      const armGeom = new THREE.CylinderGeometry(0.07, 0.065, 0.28, 14);
      const arm = new THREE.Mesh(armGeom, furMat);
      arm.position.set(dir * 0.1, -0.22, 0.02);
      arm.rotation.z = dir * 0.18;
      arm.castShadow = true;
      armGroup.add(arm);

      // Cute Little Paw
      const pawGeom = new THREE.SphereGeometry(0.08, 14, 12);
      pawGeom.scale(0.9, 1.05, 0.8);
      const paw = new THREE.Mesh(pawGeom, furMat);
      paw.position.set(dir * 0.13, -0.37, 0.04);
      paw.castShadow = true;
      armGroup.add(paw);
    };

    buildArm(this.leftArmGroup, true);
    buildArm(this.rightArmGroup, false);
    this.bodyGroup.add(this.leftArmGroup);
    this.bodyGroup.add(this.rightArmGroup);

    // ==========================================
    // 5. SLENDER 3D MOUSE TAIL
    // ==========================================
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.12, -0.28),
      new THREE.Vector3(0.04, -0.08, -0.52),
      new THREE.Vector3(0.15, 0.12, -0.75),
      new THREE.Vector3(0.1, 0.38, -0.8),
      new THREE.Vector3(0.02, 0.52, -0.72)
    ]);
    const tailGeom = new THREE.TubeGeometry(tailCurve, 20, 0.038, 10, false);
    this.tailMesh = new THREE.Mesh(tailGeom, furMat);
    this.tailMesh.castShadow = true;
    this.bodyGroup.add(this.tailMesh);

    this.group.add(this.bodyGroup);

    // ==========================================
    // 6. SCULPTED 3D HEAD (Matching coverRU.png exactly!)
    // ==========================================
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 1.82, 0.02);

    // Pear/Egg Shaped Head (Tapered softly down towards chin)
    const headGeom = new THREE.SphereGeometry(0.5, 32, 28);
    headGeom.scale(1.02, 1.15, 0.94);
    const headMesh = new THREE.Mesh(headGeom, furMat);
    headMesh.castShadow = true;
    headMesh.receiveShadow = true;
    this.headGroup.add(headMesh);

    // Cute Tuft of Crown Hair (from coverRU.png)
    const tuftGeom = new THREE.ConeGeometry(0.09, 0.18, 10);
    const tuft1 = new THREE.Mesh(tuftGeom, furMat);
    tuft1.position.set(0, 0.58, 0.02);
    tuft1.rotation.z = -0.15;
    this.headGroup.add(tuft1);

    const tuft2 = new THREE.Mesh(tuftGeom, furMat);
    tuft2.position.set(-0.05, 0.56, 0.04);
    tuft2.rotation.z = 0.22;
    tuft2.scale.set(0.75, 0.75, 0.75);
    this.headGroup.add(tuft2);

    // Rosy Cheeks (Gentle Storybook Blush right on face sides)
    const cheekGeom = new THREE.CircleGeometry(0.12, 18);
    const leftCheek = new THREE.Mesh(cheekGeom, cheekBlushMat);
    leftCheek.position.set(-0.25, -0.06, 0.43);
    leftCheek.rotation.y = -0.35;
    this.headGroup.add(leftCheek);

    const rightCheek = new THREE.Mesh(cheekGeom, cheekBlushMat);
    rightCheek.position.set(0.25, -0.06, 0.43);
    rightCheek.rotation.y = 0.35;
    this.headGroup.add(rightCheek);

    // Small Dark Button Nose (Matching coverRU.png)
    const noseGeom = new THREE.SphereGeometry(0.052, 16, 14);
    noseGeom.scale(1.15, 0.85, 0.9);
    const nose = new THREE.Mesh(noseGeom, noseMat);
    nose.position.set(0, -0.11, 0.47);
    this.headGroup.add(nose);

    // Gentle Smiling Mouth line directly below nose
    const mouthCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.12, -0.21, 0.42),
      new THREE.Vector3(-0.05, -0.24, 0.45),
      new THREE.Vector3(0, -0.245, 0.455),
      new THREE.Vector3(0.05, -0.24, 0.45),
      new THREE.Vector3(0.12, -0.21, 0.42)
    ]);
    const mouthGeom = new THREE.TubeGeometry(mouthCurve, 16, 0.013, 8, false);
    const mouth = new THREE.Mesh(mouthGeom, mouthMat);
    this.headGroup.add(mouth);

    // Little vertical seam between nose and mouth
    const philtrumGeom = new THREE.BoxGeometry(0.012, 0.06, 0.015);
    const philtrum = new THREE.Mesh(philtrumGeom, mouthMat);
    philtrum.position.set(0, -0.17, 0.46);
    this.headGroup.add(philtrum);

    // ==========================================
    // 7. BIG SOULFUL FAIRY-TALE EYES
    // ==========================================
    const buildEye = (isLeft: boolean) => {
      const eyeGroup = new THREE.Group();
      const x = isLeft ? -0.18 : 0.18;
      eyeGroup.position.set(x, 0.08, 0.42);
      eyeGroup.rotation.y = isLeft ? -0.14 : 0.14;

      // Dark glossy eye sphere
      const sphereGeom = new THREE.SphereGeometry(0.125, 24, 20);
      sphereGeom.scale(0.95, 1.22, 0.55);
      const eyeSphere = new THREE.Mesh(sphereGeom, eyeMat);
      eyeGroup.add(eyeSphere);

      // Primary white highlight dot (top-right spark)
      const bigSpec = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), specularDotMat);
      bigSpec.position.set(0.03, 0.05, 0.08);
      eyeGroup.add(bigSpec);

      // Secondary bounce dot (bottom-left)
      const smallSpec = new THREE.Mesh(new THREE.CircleGeometry(0.02, 14), specularDotMat);
      smallSpec.position.set(-0.035, -0.045, 0.08);
      eyeGroup.add(smallSpec);

      // Eyelid for blinking
      const eyelidGeom = new THREE.SphereGeometry(0.13, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5);
      eyelidGeom.scale(0.98, 1.25, 0.58);
      const eyelid = new THREE.Mesh(eyelidGeom, furMat);
      eyelid.rotation.x = -Math.PI * 0.5;
      eyelid.visible = false;
      eyeGroup.add(eyelid);

      if (isLeft) this.leftEyelid = eyelid;
      else this.rightEyelid = eyelid;

      // Curved Eyebrow
      const browCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.07, 0, 0),
        new THREE.Vector3(0, 0.025, 0),
        new THREE.Vector3(0.07, -0.01, 0)
      ]);
      const brow = new THREE.Mesh(new THREE.TubeGeometry(browCurve, 12, 0.013, 6, false), eyebrowMat);
      brow.position.set(0, 0.2, 0.05);
      brow.rotation.z = isLeft ? 0.1 : -0.1;
      eyeGroup.add(brow);

      this.headGroup.add(eyeGroup);
    };

    buildEye(true);
    buildEye(false);

    // ==========================================
    // 8. LARGE SIGNATURE 3D ROUND EARS (coverRU.png)
    // ==========================================
    this.leftEarGroup = new THREE.Group();
    this.rightEarGroup = new THREE.Group();
    this.leftEarGroup.position.set(-0.46, 0.44, -0.04);
    this.rightEarGroup.position.set(0.46, 0.44, -0.04);
    this.leftEarGroup.rotation.set(-0.08, 0.2, -0.22);
    this.rightEarGroup.rotation.set(-0.08, -0.2, 0.22);

    const buildEar = (earGroup: THREE.Group) => {
      // Outer Ear rim
      const outerEarGeom = new THREE.CylinderGeometry(0.35, 0.35, 0.07, 32);
      outerEarGeom.scale(1.0, 1.0, 1.08);
      const outerEar = new THREE.Mesh(outerEarGeom, furMat);
      outerEar.rotation.x = Math.PI / 2;
      outerEar.castShadow = true;
      earGroup.add(outerEar);

      // Inner Ear tender rosy dish
      const innerEarGeom = new THREE.CylinderGeometry(0.26, 0.26, 0.072, 28);
      innerEarGeom.scale(1.0, 1.0, 1.06);
      const innerEar = new THREE.Mesh(innerEarGeom, innerEarMat);
      innerEar.rotation.x = Math.PI / 2;
      innerEar.position.z = 0.01;
      earGroup.add(innerEar);
    };

    buildEar(this.leftEarGroup);
    buildEar(this.rightEarGroup);
    this.headGroup.add(this.leftEarGroup);
    this.headGroup.add(this.rightEarGroup);

    this.group.add(this.headGroup);

    // ==========================================
    // 9. SOFT CONTACT SHADOW ON FLOOR
    // ==========================================
    const shadowGeom = new THREE.CircleGeometry(0.6, 32);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x180f08,
      transparent: true,
      opacity: 0.36
    });
    this.shadowMesh = new THREE.Mesh(shadowGeom, shadowMat);
    this.shadowMesh.rotation.x = -Math.PI / 2;
    this.shadowMesh.position.y = 0.015;
    this.group.add(this.shadowMesh);

    this.clickTarget = headMesh;
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
    // 1. Gentle Idle Breathing
    const breath = Math.sin(time * 2.4) * 0.02;
    this.bodyGroup.scale.set(1 + breath, 1 + breath * 1.2, 1 + breath);
    this.headGroup.position.y = 1.82 + breath * 0.4;

    // Soft ear twitch
    const earWiggle = Math.sin(time * 3.6) * 0.035;
    this.leftEarGroup.rotation.z = -0.22 + earWiggle;
    this.rightEarGroup.rotation.z = 0.22 - earWiggle;

    // Arm micro-sway
    this.leftArmGroup.rotation.x = Math.sin(time * 1.8) * 0.05;
    this.rightArmGroup.rotation.x = -Math.sin(time * 1.8) * 0.05;

    // Tail sway
    if (this.tailMesh) {
      this.tailMesh.rotation.y = Math.sin(time * 2.2) * 0.12;
      this.tailMesh.rotation.z = Math.cos(time * 1.6) * 0.08;
    }

    // 2. Camera Tracking Gaze
    if (this.cameraRef) {
      const camPos = this.cameraRef.position;
      const charPos = this.group.position;
      const angleToCam = Math.atan2(camPos.x - charPos.x, camPos.z - charPos.z);

      const clampedHeadY = Math.max(-0.6, Math.min(0.6, angleToCam * 0.42));
      this.headGroup.rotation.y += (clampedHeadY - this.headGroup.rotation.y) * 0.06;

      const camHeightDiff = (camPos.y - (charPos.y + 1.82)) * 0.08;
      const clampedHeadX = Math.max(-0.2, Math.min(0.2, -camHeightDiff));
      this.headGroup.rotation.x += (clampedHeadX - this.headGroup.rotation.x) * 0.06;
    }

    // 3. Blinking
    this.blinkTimer += 0.016;
    if (this.blinkTimer > this.nextBlinkInterval) {
      this.isBlinking = true;
      this.blinkTimer = 0;
      this.blinkProgress = 0;
      this.nextBlinkInterval = 2.8 + Math.random() * 3.0;
    }

    if (this.isBlinking) {
      this.blinkProgress += 0.2;
      if (this.blinkProgress <= 1.0) {
        if (this.leftEyelid) this.leftEyelid.visible = true;
        if (this.rightEyelid) this.rightEyelid.visible = true;
      } else {
        this.isBlinking = false;
        if (this.leftEyelid) this.leftEyelid.visible = false;
        if (this.rightEyelid) this.rightEyelid.visible = false;
      }
    }

    // 4. Jump
    if (this.isJumping) {
      this.jumpProgress += 0.06;
      const jumpHeight = Math.sin(this.jumpProgress * Math.PI) * 0.8;
      this.group.position.y = Math.max(0, jumpHeight);

      const armLift = Math.sin(this.jumpProgress * Math.PI) * 0.75;
      this.leftArmGroup.rotation.z = -0.3 - armLift;
      this.rightArmGroup.rotation.z = 0.3 + armLift;

      const stretch = Math.sin(this.jumpProgress * Math.PI) * 0.14;
      this.bodyGroup.scale.set(1 - stretch * 0.5, 1 + stretch, 1 - stretch * 0.5);
      this.shadowMesh.scale.setScalar(1 - jumpHeight * 0.35);

      if (this.jumpProgress >= 1) {
        this.isJumping = false;
        this.group.position.y = 0;
        this.shadowMesh.scale.setScalar(1);
        this.leftArmGroup.rotation.z = 0;
        this.rightArmGroup.rotation.z = 0;
      }
    }
  }
}
