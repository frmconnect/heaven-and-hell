import * as THREE from 'three';

/**
 * The Devil: a huge red horned figure with glowing eyes and bat wings, chasing behind the player.
 * Its distance on screen follows the chase gap; he lunges forward when he catches you.
 */
export class DevilAvatar {
  readonly root = new THREE.Group();
  private wingL: THREE.Mesh;
  private wingR: THREE.Mesh;
  private armL: THREE.Group;
  private armR: THREE.Group;
  private eyes: THREE.MeshBasicMaterial;
  private aura: THREE.PointLight;
  private time = 0;
  private x = 0;
  private sinkY = 0;

  constructor(scene: THREE.Scene) {
    const red = new THREE.MeshStandardMaterial({ color: '#a3140c', roughness: 0.6, flatShading: true, emissive: '#400400', emissiveIntensity: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: '#2a0604', roughness: 0.8, flatShading: true, side: THREE.DoubleSide });
    const horn = new THREE.MeshStandardMaterial({ color: '#e8d6b0', roughness: 0.5, flatShading: true });
    this.eyes = new THREE.MeshBasicMaterial({ color: '#ffe23a' });

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), red);
    body.scale.set(1.1, 1.3, 0.8);
    body.position.y = 2.2;
    const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.62, 0), red);
    head.position.set(0, 3.75, -0.2);
    const jaw = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.7, 5), red);
    jaw.rotation.x = Math.PI;
    jaw.position.set(0, 3.3, -0.45);
    const hornGeo = new THREE.ConeGeometry(0.16, 0.9, 5);
    const hornL = new THREE.Mesh(hornGeo, horn);
    hornL.position.set(-0.42, 4.3, -0.2);
    hornL.rotation.z = 0.5;
    const hornR = hornL.clone();
    hornR.position.x = 0.42;
    hornR.rotation.z = -0.5;
    const eyeGeo = new THREE.SphereGeometry(0.1, 6, 4);
    const eyeL = new THREE.Mesh(eyeGeo, this.eyes);
    eyeL.position.set(-0.22, 3.85, -0.75);
    eyeL.scale.set(1.4, 0.7, 1);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.22;

    const wingShape = new THREE.Shape();
    wingShape.moveTo(0, 0);
    wingShape.lineTo(2.6, 1.4);
    wingShape.lineTo(2.2, 0.3);
    wingShape.lineTo(2.5, -0.6);
    wingShape.lineTo(1.6, -0.2);
    wingShape.lineTo(1.4, -1.1);
    wingShape.lineTo(0.6, -0.4);
    const wingGeo = new THREE.ShapeGeometry(wingShape);
    this.wingR = new THREE.Mesh(wingGeo, dark);
    this.wingR.position.set(0.4, 2.9, 0.4);
    this.wingL = new THREE.Mesh(wingGeo, dark);
    this.wingL.position.set(-0.4, 2.9, 0.4);
    this.wingL.scale.x = -1;

    const arm = (x: number) => {
      const g = new THREE.Group();
      g.position.set(x, 3, -0.2);
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.35, 1.6, 0.35), red);
      a.position.y = -0.8;
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 4), horn);
      claw.position.y = -1.75;
      claw.rotation.x = Math.PI;
      g.add(a, claw);
      return g;
    };
    this.armL = arm(-1.15);
    this.armR = arm(1.15);

    const legGeo = new THREE.BoxGeometry(0.45, 1.3, 0.45);
    const legL = new THREE.Mesh(legGeo, dark);
    legL.position.set(-0.45, 0.65, 0);
    const legR = legL.clone();
    legR.position.x = 0.45;

    this.aura = new THREE.PointLight('#ff2a00', 25, 10, 1.5);
    this.aura.position.set(0, 3, -1);

    this.root.add(body, head, jaw, hornL, hornR, eyeL, eyeR, this.wingL, this.wingR, this.armL, this.armR, legL, legR, this.aura);
    this.root.scale.setScalar(0.85);
    scene.add(this.root);
  }

  /** gap = metres behind the player. groundAt(dz) = ground height dz metres behind the player (stairs). */
  update(dt: number, gap: number, playerX: number, caught: boolean, groundAt: (dz: number) => number = () => 0): void {
    this.time += dt;
    // on screen he sits a bit closer than the real gap so he's visible when dangerous
    // he stays in a band behind the player; when far away he drops back out of view below the camera
    // close = right behind the player; further back = lower, peeking up from the bottom of the screen
    const z = caught ? 1.6 : 2.7 + Math.min(gap, 8) * 0.3;
    const sink = caught ? 0 : Math.min(30, 0.8 + Math.max(0, gap - 2) * 0.45 + Math.max(0, gap - 7) * 1.5);
    this.root.position.z = THREE.MathUtils.lerp(this.root.position.z || z, z, Math.min(1, dt * (caught ? 10 : 4)));
    this.x = THREE.MathUtils.lerp(this.x, playerX * 0.8, Math.min(1, dt * 3));
    this.root.position.x = this.x;
    this.sinkY = THREE.MathUtils.lerp(this.sinkY, sink, Math.min(1, dt * 4));
    this.root.position.y = Math.abs(Math.sin(this.time * 6)) * 0.25 - 0.2 - this.sinkY + groundAt(this.root.position.z);
    this.root.visible = this.sinkY < 5.5;
    const flap = Math.sin(this.time * 7) * 0.5;
    this.wingL.rotation.y = 0.5 + flap;
    this.wingR.rotation.y = -0.5 - flap;
    // claws reach forward, more when he's close
    const reach = caught ? -1.8 : -0.9 - Math.sin(this.time * 6) * 0.3;
    this.armL.rotation.x = reach;
    this.armR.rotation.x = caught ? -1.8 : -0.9 + Math.sin(this.time * 6) * 0.3;
    this.eyes.color.setHSL(0.14, 1, 0.55 + Math.sin(this.time * 10) * 0.1);
    this.aura.intensity = 20 + Math.sin(this.time * 8) * 6;
  }
}
