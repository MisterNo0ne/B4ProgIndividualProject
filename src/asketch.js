/* Things to add

http://lambert.nico.free.fr/tp/biblio/Dougeniketal1985.pdf

--fix instability when points are very very close to the center
map positions to be within the bounds of the screen

countries find their population by lerping nearest pts

(this is a 2.0 fix) rehaul sim to use softbody sponge mesh with spring forces between adjacent masspoints, and volume changes just change how much the sponge is pushing

*/

let backgroundImage;
let positions;
let regionIndices;
let centers;

let massPoints;
let regions;
let switchers;

let stiffness; //controls spring strength
let damping;   //controls damping strength
let backgroundColor;

function preload() {
  backgroundImage = loadImage("src/westernEurope.png");
  positions = loadStrings("src/positions.txt");
  regionIndices = loadStrings("src/regions.txt");
  centers = loadStrings("src/centers.txt");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  
  stiffness = 0.001;
  damping = 10*sqrt(stiffness); 
  massPoints = [];
  regions = [];
  switchers = [];
  loadObjects();
  
  backgroundColor = 245;
}

function draw() {
  background(backgroundColor);
  image(backgroundImage, width/2, height/2);
  
  if (keyIsDown(83) && regions[0].getVolume() > 400) {
    regions[0].wantVolume -= 200;
  }
  if (keyIsDown(87)) {
    regions[0].wantVolume += 200; 
  }
  
  for (let sw of switchers) {
    sw.display();
    sw.easing();
  }
  push();
  fill(0);
  noStroke();
  
  for (let r of regions) {
    r.show(switchers[2].gs(), switchers[3].gs());
    r.pressureForce();
    r.fixSelfIntersecting(0.01, 20);
  }
  for (let i=0; i<massPoints.length; i++) {
    let mp = massPoints[i];
    if (switchers[0].gs()) mp.show(switchers[1].gs(), i); 
    //first parameter is debug mode
    mp.forces(false);
    mp.kinematics();
  }
}

function mouseReleased() {
  for (let sw of switchers) {
    sw.click();
  }
  if (!fullscreen()) {
    if (mouseX>0 && mouseX<width && mouseY>0 && mouseY<height) {
      fullscreen(true);
    }
  }
}

function keyReleased() {
  // regions[1].wantVolume *= 0.9;
  regions[2].wantVolume *= 1.1;
}

function loadObjects() {
  for (let p of positions) {
    let coords = p.match(/^(\d+\.?\d*)\s(\d+\.?\d*)\s*$/);
    let pos = createVector(float(coords[1]), float(coords[2]));
    massPoints.push(new Masspoint(pos, stiffness, damping));
  }
  
  for(let i=0; i<regionIndices.length; i++) {
    let indexStrings = regionIndices[i].match(/\d+/g);
    let indexInts = [];
    for (let i=0; i<indexStrings.length; i++) {
      indexInts.push(int(indexStrings[i]));
    }
    
    let cStr = centers[i].match(/^(\d+\.?\d*)\s(\d+\.?\d*)\s*$/);
    let centerPos = createVector(float(cStr[1]), float(cStr[2]));
    
    regions.push(new Region(color('grey'), indexInts, centerPos));
  }
  
  switchers.push(new Switcher(createVector(20, 20), false, "Show mass points"));
  switchers.push(new Switcher(createVector(20, 45), false, "Show mass point indices"));
  switchers.push(new Switcher(createVector(20, 70), false, "Show centroid"));
  switchers.push(new Switcher(createVector(20, 95), false, "Show volume difference"));
}




class Country {
  constructor(regions) {
    this.regions = regions;
    this.relativeSizes = this.getRelSizes();
    this.population = 22300;
  }
  
  //in the future have something like this:
  /*
  let pop = map(time, lowerTime, upperTime, lowerPop, higherPop);
  */
  
  setRegionWantVolumes() {
    for (let r of this.regions) {
      // r.wantVolume = r.
    }
  }
  
  getRelSizes() {
    let totalBaseVolume = 0;
    for (let r of this.regions) {
      totalBaseVolume += r.getBaseVolume();
    }
    let trelSizes = [];
    for (let r of this.regions) {
      trelSizes.push(r.getBaseVolume() / totalBaseVolume);
    }
    return trelSizes;
  }
}




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




class Region {
  constructor(colour, ptInd, roughCenter) {
    this.ptInd = ptInd; // list of indices in massPoints, going round region clockwise
    this.colour = colour;
    this.colour.setAlpha(120);
    
    this.ptPos = [];
    this.updatePositions();
    this.center = roughCenter;
    this.center = this.getCenter();
    this.wantVolume = this.getBaseVolume();
  }
  
  //use functions
  show(debugMode, massMode) {
    strokeWeight(2);
    stroke(0);
    // fill(this.colour);
    fill(this.colour);
    beginShape();
    for (let i=0; i<this.ptPos.length; i++) {
      vertex(this.ptPos[i].x, this.ptPos[i].y);
    }
    endShape(CLOSE);
    
    if (debugMode) {
      stroke(0);
      point(this.center);
    }
    
    if (massMode) {
      push();
      textSize(32);
      noStroke();
      fill(0);
      textAlign(CENTER);
      text(round(1000*(this.wantVolume-this.getVolume()) / this.wantVolume)/10 + "%", this.center.x, this.center.y);
      pop();
    }
  }
  
  pressureForce() {
    let volume = this.getVolume();
    
    for (let i=0; i<this.ptInd.length; i++) {
      let pressureDir = this.ptPos[i].copy().sub(this.center);
      let fieldStrength = 4/(pow(pressureDir.mag(), 4)); 
      let pressureStrength = (this.wantVolume-volume) / this.wantVolume;
      // pressureStrength = 50*pow(pressureStrength, 3) + pressureStrength;
      pressureDir.setMag(pressureStrength + fieldStrength);
      
      massPoints[this.ptInd[i]].acc.add(pressureDir);
    }
  }
  
  //get functions
  getVolume() {
    //code adapted from https://www.mathopenref.com/coordpolygonarea2.html
    this.updatePositions();
    
    let volume = 0;
    let j = this.ptInd.length-1;
    for (let i=0; i<this.ptPos.length; i++) {
      let pos1 = this.ptPos[i];
      let pos2 = this.ptPos[j];
      
      volume += (pos2.x + pos1.x) * (pos2.y - pos1.y);
      j = i; //j always trails i by 1
    }
    return round(abs(volume/2), 2);
  }
  
  getBaseVolume() {
    //code adapted from https://www.mathopenref.com/coordpolygonarea2.html
    let volume = 0;
    let j = this.ptInd.length-1;
    for (let i=0; i<this.ptInd.length; i++) {
      let pos1 = massPoints[this.ptInd[i]].origin.copy();
      let pos2 = massPoints[this.ptInd[j]].origin.copy();
      
      volume += (pos2.x + pos1.x) * (pos2.y - pos1.y);
      j = i; //j always trails i by 1
    }
    return round(abs(volume/2), 2);
  }
  
  getCenter() {
    let tcenter = this.center;
    let increment = 25; //this is the length the center will look
    let minIncrement = 1; //will stop once incr < minIncrement
    let maxBuffer = this.minDistFrom(tcenter);
    
    while (increment > minIncrement) {
      let searchVector = createVector(increment, 0);
      let oldCenter = tcenter; //write more stuff here
      for (let i=0; i<TWO_PI; i+=PI/2) {
        searchVector.setHeading(i);
        let searchCenter = oldCenter.copy();
        searchCenter.add(searchVector);
        if (maxBuffer < this.minDistFrom(searchCenter)) {
          //we found something better!
          maxBuffer = this.minDistFrom(searchCenter);
          tcenter = searchCenter;
        }
      }
      if (oldCenter.equals(tcenter)) {
        //didnt find anything better
        increment *= 0.5;
      }
    } 
    return tcenter;
  }
  
  //helper functions  
  minDistFrom(point) {
    let minDist = point.dist(massPoints[this.ptInd[0]].origin.copy());
    for (let i=1; i<this.ptPos.length; i++) {
      minDist = min(minDist, point.dist(massPoints[this.ptInd[i]].origin.copy()));
    }
    return minDist;
  }
  
  updatePositions() {
    for (let i=0; i<this.ptInd.length; i++) {
      this.ptPos[i] = massPoints[this.ptInd[i]].pos.copy();
    }
  }
  
  //these self-intersection detections come from chatgpt, but i can explain them
  //this checks whether the sequence a, b, c makes a ccw turn
  ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  
  //this checks intersection by telling whether p1 and p2 are on opposite sides of the line p3-p4, and vice versa
  segmentsIntersect(p1, p2, p3, p4) {
    return (this.ccw(p1, p3, p4) != this.ccw(p2, p3, p4)) &&
           (this.ccw(p1, p2, p3) != this.ccw(p1, p2, p4));
  }

  //this just checks every non-adjacent pair of line segments for intersections, and nudges by difference in midpoints
  fixSelfIntersecting(pushStrength, maxIterations) {
    let n = this.ptPos.length;
    
    for (let iters=0; iters<maxIterations; iters++) {
      let changed = false;
      for (let i=0; i<n; i++) {
        //a1 to a2 is the first line segment 
        let a1 = this.ptPos[i];
        let a2 = this.ptPos[(i + 1) % n];

        for (let j=i+2; j<n+i-1; j++) {        
          //b1 to b2 is the second line segment
          let b1 = this.ptPos[j%n];
          let b2 = this.ptPos[(j + 1)%n];

          if (this.segmentsIntersect(a1, a2, b1, b2)) {
            //ok theres an intersection, fix by pushing apart midpts
            let diff = p5.Vector.lerp(a1, a2, 0.5);
            diff.sub(p5.Vector.lerp(b1, b2, 0.5));
            diff.setMag(pushStrength);

            //nudge points
            massPoints[this.ptInd[i]].acc.add(diff);
            massPoints[this.ptInd[(i+1)%n]].acc.add(diff);

            massPoints[this.ptInd[j%n]].acc.sub(diff);
            massPoints[this.ptInd[(j+1)%n]].acc.sub(diff);

            changed = true;
          }
        }
      }
      if (!changed) break; //no more changes need to be made!
    }
    
    //while im at it, add a push between nearby particles
    this.updatePositions();
    for (let i=0; i<this.ptInd.length; i++) {
      for (let j=i+1; j<this.ptInd.length; j++) {
        let diff = p5.Vector.sub(this.ptPos[i], this.ptPos[j]);
        if (diff.mag() < 7) {
          diff.setMag(0.5/diff.magSq());
          massPoints[this.ptInd[i]].acc.add(diff);
          massPoints[this.ptInd[j]].acc.sub(diff);
        }
      }
      // let j=(i+1)%this.ptInd.length;
      // let diff = p5.Vector.sub(this.ptPos[i], this.ptPos[j]);
      // if (diff.mag() < 4) {
      //   diff.setMag(2/diff.mag());
      //   massPoints[this.ptInd[i]].acc.add(diff);
      //   massPoints[this.ptInd[j]].acc.sub(diff);
      // }
    }
  }
  
}




class Switcher {
  constructor(pos, baseState, words) {
    this.pos = pos;
    this.sliderRadius = 8;
    this.knobRadius = 5.2;
    this.state = baseState;
    this.sliderColor = 'grey';
    this.knobColor = 'lightgrey';
    this.sliderPos = this.state ? 2*this.sliderRadius : 0;
    this.words = words;
  }
  
  display() {
    push();
    translate(this.pos);
    noStroke();
    fill(this.sliderColor);
    rect(0, 0, 4*this.sliderRadius, 2*this.sliderRadius, this.sliderRadius);
    fill(this.knobColor);
    circle(this.sliderRadius + this.sliderPos, this.sliderRadius, 2*this.knobRadius);
    fill(0);
    textSize(18);
    textAlign(LEFT);
    text(this.words, 40, 15);
    pop();
  }
  
  easing() {
    this.sliderPos+=0.5 * ((this.state ? 2*this.sliderRadius : 0)-this.sliderPos)
  }
  
  click() {
    if (mouseX > this.pos.x && mouseX < this.pos.x + (4*this.sliderRadius) && mouseY > this.pos.y && mouseY < this.pos.y + (2*this.sliderRadius)) {
      this.state = !this.state;  
    }
  }
  
  gs() { //short for getState
    return this.state;
  }
}
