/*
http://lambert.nico.free.fr/tp/biblio/Dougeniketal1985.pdf
*/

let mp1;
let massPoints;
let regions;
let stiffness; //controls spring strength
let damping;   //controls damping strength
let backgroundColor;

function setup() {
  createCanvas(800, 600);
  
  stiffness = 0.02;
  damping = 2*sqrt(stiffness); 
  
  let positions = [[105, 366],[181, 364],[237, 366],[295, 365],[276, 416],[263, 458],[220, 474],[181, 500],[150, 481],[103, 481],[100, 404],[145, 401],[249, 302],[232, 240],[200, 215],[270, 203],[271, 173],[317, 170],[343, 137],[402, 167],[449, 169],[422, 241],[437, 223],[427, 286],[441, 345],[395, 345],[369, 322],[337, 353]];
  
  massPoints = [];
  for (let i=0; i<positions.length; i++) {
    let pos = createVector(positions[i][0], positions[i][1])
    massPoints.push(new masspoint(pos, stiffness, damping));
  }
  
  regions = [];
  regions.push(new region(color('yellow'), [0,1,2,3,4,5,6,7,8,11,10], createVector(100, 100)));
  regions.push(new region(color('green'), [8,9,10,11], createVector(100, 150)));
  regions.push(new region(color('blue'), [2,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,3], createVector(100, 200)));
  
  backgroundColor = 245;
}

function draw() {
  background(backgroundColor);
  if (keyIsDown(65) && regions[1].wantVolume > 1000) {
    regions[1].wantVolume -= 100;
  }
  if (keyIsDown(81)) {
    regions[1].wantVolume += 100; 
  }
  if (keyIsDown(83) && regions[0].wantVolume > 3000) {
    regions[0].wantVolume -= 200;
  }
  if (keyIsDown(87)) {
    regions[0].wantVolume += 200; 
  }
  if (keyIsDown(68) && regions[2].wantVolume > 4000) {
    regions[2].wantVolume -= 400;
  }
  if (keyIsDown(69)) {
    regions[2].wantVolume += 400; 
  }
  
  
  for (let i=0; i<regions.length; i++) {
    regions[i].show();
    regions[i].pressureForce();
  }
  for (let i=0; i<massPoints.length; i++) {
    let mp = massPoints[i];
    mp.show(false, i); //shows the mass points! first parameter is debug mode
    mp.forces(false);
    mp.kinematics();
  }
}

class masspoint {
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
    strokeWeight(3);
    
    stroke(100);
    noFill();
    circle(this.origin.x, this.origin.y, 15);
    line(this.origin.x, this.origin.y, this.pos.x, this.pos.y);
    
    stroke(0);
    fill(this.colour);
    circle(this.pos.x, this.pos.y, 15);
    
    stroke(100);
    if (debugMode) {
      line(this.pos.x, this.pos.y, this.pos.x+this.vel.x, this.pos.y+this.vel.y);
    
      textSize(13);
      strokeWeight(4);
      textAlign(CENTER);
      text(indexx, this.pos.x, this.pos.y-20);
    }
  }
  
  forces(debugMode) {
    //spring energy
    let springDir = p5.Vector.sub(this.origin, this.pos);
    let springForce = springDir.mult(this.stiffness);
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

class region {
  constructor(colour, ptInd) {
    this.ptInd = ptInd; // list of indices in massPoints, going round region clockwise
    this.colour = colour;
    this.colour.setAlpha(120);
    
    this.ptPos = [];
    this.updatePositions();
    this.centroid = this.getCentroid();
    this.wantVolume = this.getBaseVolume();
  }
  
  show() {
    noStroke();
    fill(this.colour);
    beginShape();
    for (let i=0; i<this.ptPos.length; i++) {
      vertex(this.ptPos[i].x, this.ptPos[i].y);
    }
    endShape(CLOSE);
    
    stroke(0);
    textSize(32);
    // text(this.getVolume(), this.centroid.x, this.centroid.y);
  }
  
  pressureForce() {
    this.centroid = this.getCentroid();
    this.updatePositions();
    
    for (let i=0; i<this.ptInd.length; i++) {
      let mPos = this.ptPos[i].copy();
      let pressureDir = mPos.sub(this.centroid);
      pressureDir.normalize();
      pressureDir.mult((this.wantVolume-this.getVolume())/this.wantVolume);
      
      let mp = massPoints[this.ptInd[i]];
      mp.acc.add(pressureDir.copy());
      //change this!
    }
  }
  
  getVolume() {
    //code stolen from https://www.mathopenref.com/coordpolygonarea2.html
    this.updatePositions();
    
    let volume = 0;
    let j = this.ptInd.length-1;
    for (let i=0; i<this.ptPos.length; i++) {
      let pos1 = this.ptPos[i];
      let pos2 = this.ptPos[j];
      
      volume += (pos2.x + pos1.x) * (pos2.y - pos1.y);
      j = i;
    }
    return round(abs(volume/2), 2);
  }
  
  getBaseVolume() {
    //code stolen from https://www.mathopenref.com/coordpolygonarea2.html
    let volume = 0;
    let j = this.ptInd.length-1;
    for (let i=0; i<this.ptInd.length; i++) {
      let pos1 = massPoints[this.ptInd[i]].origin.copy();
      let pos2 = massPoints[this.ptInd[j]].origin.copy();
      
      volume += (pos2.x + pos1.x) * (pos2.y - pos1.y);
      j = i;
    }
    return round(abs(volume/2), 2);
  }
  
  getCentroid() {
    let xsum = 0;
    let ysum = 0;
    for (let i=0; i<this.ptPos.length; i++) {
      let pos = this.ptPos[i];
      xsum += pos.x;
      ysum += pos.y;
    }
    return createVector(xsum/this.ptPos.length, ysum/this.ptPos.length);
  }
  
  updatePositions() {
    for (let i=0; i<this.ptInd.length; i++) {
      this.ptPos[i] = massPoints[this.ptInd[i]].pos.copy();
    }
  }
}
