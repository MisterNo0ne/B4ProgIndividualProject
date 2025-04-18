class Masspoint {
  constructor(pos, stiffness, damping) {
    this.pos = pos;
    this.origin = pos.copy();
    this.vel = createVector(0, 0);
    this.acc = createVector(0, 0);
    this.stiffness = stiffness;
    this.damping = damping;
    
    let hyue = random(0, 255);
    push();
    colorMode(HSB);
    this.colour = color(hyue, 70, 255);
    pop();
  }
  
  show(debugMode, indexx) {
    strokeWeight(1.5);
    
    stroke(100);
    noFill();
    circle(this.origin.x, this.origin.y, 4);
    line(this.origin.x, this.origin.y, this.pos.x, this.pos.y);
    
    stroke(0);
    fill(this.colour);
    circle(this.pos.x, this.pos.y, 4);
    
    stroke(100);
    if (debugMode) {
      line(this.pos.x, this.pos.y, this.pos.x+this.vel.x, this.pos.y+this.vel.y);
    
      textSize(13);
      strokeWeight(2);
      textAlign(CENTER);
      text(indexx, this.pos.x, this.pos.y-20);
    }
  }
  
  forces(debugMode) {
    //spring energy
    let springDir = p5.Vector.sub(this.origin, this.pos);
    let springForce = springDir.mult(this.stiffness);
    // springForce.setMag(min(0.05, springForce.mag()));
    this.acc.add(springForce);
    
    // damping force
    let dampDir = this.vel.copy().normalize();
    let dampForce = dampDir.mult(-this.damping);
    dampForce.mult(pow(this.vel.mag(), 1.0)); //up this from 1 for stronger damping
    this.acc.add(dampForce);
    
    //debug force
    if (mouseIsPressed && debugMode) {
      this.acc.add(createVector(1, 0));
    }
  }
  
  kinematics() {
    this.pos.add(this.vel);
    this.vel.add(this.acc);
    this.acc = createVector(0, 0);
  }
}