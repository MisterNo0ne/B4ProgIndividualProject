let positions;
let regionIndices;
let centers;
let countryIndices;
let populationTable;

let stiffness; //controls spring strength
let damping;   //controls damping strength
let backgroundColor; 

let massPoints;
let regions;
let switchers;
let countries;

let volumePerPopulation;
let bottomRightCorner;
let mapScale;

let simYear;
let yearSlider;

function preload() {
  positions = loadStrings("src/positions.txt");
  regionIndices = loadStrings("src/regions.txt");
  centers = loadStrings("src/centers.txt");
  countryIndices = loadStrings("src/countries.txt");
  populationTable = loadTable("src/B4 Prog - Population Data.csv", "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  bottomRightCorner = createVector(1600, 1570);
  
  stiffness = 0.005;
  damping = 2*sqrt(0.1); 
  backgroundColor = color(245);
  
  massPoints = [];
  regions = [];
  switchers = [];
  countries = [];  
  loadObjects();
  
  
  //estimating that a normal total population for europe is 
  volumePerPopulation = getPopulationDensity(300000);
  
  mapScale = min(width/bottomRightCorner.x, height/bottomRightCorner.y);
  
  simYear = 1400;
  yearSlider = createSlider(1400, 2000, simYear, 50);
  yearSlider.position(10, 10);
  yearSlider.size(width-20);
}

function draw() {
  simYear = yearSlider.value();
  background(backgroundColor);
  if (keyIsDown(83) && regions[0].getVolume() > 400) {
    regions[0].wantVolume -= 200;
  }
  if (keyIsDown(87)) {
    regions[0].wantVolume += 200; 
  }
  push();
  fill(0);
  noStroke();
  
  for (let c of countries) {
    c.setRegionWantVolumes(simYear);
  }
  for (let r of regions) {
    r.easeWantVol(0.2);
    r.show(switchers[2].gs(), switchers[3].gs());
    r.pressureForce();
    // r.fixSelfIntersecting(0.01, 20);
  }
  for (let i=0; i<massPoints.length; i++) {
    let mp = massPoints[i];
    if (switchers[0].gs()) mp.show(switchers[1].gs(), i); 
    // first parameter is debug mode
    mp.forces(false);
    mp.kinematics();
  }
  
  fill(100);
  rect(bottomRightCorner.x*mapScale, 0, width, height);
  
  for (let sw of switchers) {
    sw.display();
    sw.easing();
  }
}

function mouseReleased() {
  for (let sw of switchers) {
    sw.click();
  }
  if (!fullscreen()) {
    if (mouseX>0 && mouseX<width && mouseY>0 && mouseY<height) {
      fullscreen(true);
      
      resizeCanvas(windowWidth, windowHeight);
      mapScale = min(width/bottomRightCorner.x, height/bottomRightCorner.y);
    }
  }
}

function keyReleased() {
  if (key == 'r') {
    print(width, height);
    resizeCanvas(windowWidth, windowHeight);
    mapScale = min(width/bottomRightCorner.x, height/bottomRightCorner.y);
  }
}

function loadObjects() {
  loadMassPoints();
  loadRegions();
  loadSwitchers();
  loadCountries();
}

function loadMassPoints() {
  for (let i=0; i<positions.length-1; i++) {
    let p = positions[i];
    let coords = p.match(/^(-?\d+\.?\d+)\s+(-?\d+\.?\d+)\s*$/);
    let pos = createVector(float(coords[1]), float(coords[2]));
    massPoints.push(new Masspoint(pos, stiffness, damping));
  }
}

function loadRegions() {
  for(let i=0; i<regionIndices.length-1; i++) {
    let indexStrings = regionIndices[i].match(/\d+/g);
    let indexInts = [];
    for (let j=0; j<indexStrings.length; j++) {
      indexInts.push(int(indexStrings[j]));
    }
    
    let cStr = centers[i].match(/^(-?\d+\.?\d+)\s+(-?\d+\.?\d+)\s*$/);
    let centerPos = createVector(float(cStr[1]), float(cStr[2]));
    
    regions.push(new Region(color('grey'), indexInts, centerPos));
  }
}

function loadSwitchers() {
  switchers.push(new Switcher(createVector(20, 20), false, "Show mass points"));
  switchers.push(new Switcher(createVector(20, 45), false, "Show mass point indices"));
  switchers.push(new Switcher(createVector(20, 70), false, "Show centroid"));
  switchers.push(new Switcher(createVector(20, 95), false, "Show volume difference"));
}

function loadCountries() {
  let years = populationTable.getColumn("Years");
  let columns = populationTable.columns;
  
  for (let c=1; c<columns.length; c++) {
    //get years and population
    let col = columns[c];
    let countryYears = [];
    let countryValues = [];
    
    for (let r=0; r<populationTable.getRowCount(); r++) {
      let ryear = years[r];
      let rvalStr = populationTable.getString(r, col);
      
      if (rvalStr !== "") {
        countryYears.push(int(ryear));
        countryValues.push(float(rvalStr));
      }
    }
    
    //get regions
    let indexStrings = countryIndices[c-1].match(/\d+/g);
    let indexInts = [];
    for (let i=0; i<indexStrings.length; i++) {
      indexInts.push(int(indexStrings[i]));
    }
    
    countries.push(new Country(indexInts, countryYears, countryValues));
  }
}

function getPopulationDensity(avgTotalPopulation) {
  let totalVolume = 0;
  for (let r of regions) {
    totalVolume += r.getBaseVolume();
  }
  return totalVolume / avgTotalPopulation;
}




class Country {
  constructor(regionIndices, years, populations) {
    this.regionIndices = regionIndices;
    this.relSizes = this.getRelSizes();
    this.years = years;
    this.populations = populations;
    this.colour = color(random(0, 255), random(0, 255), random(0, 255));
    this.setRegionColours();
  }
  
  setRegionColours() {
    for (let ind of this.regionIndices) {
      regions[ind].colour = this.colour;
    }
  }
  
  setRegionWantVolumes(getyear) {
    let totVol = this.getTotVolume(getyear);
    if (totVol != -1) {
      for (let i=0; i<this.regionIndices.length; i++) {
        let ind = this.regionIndices[i];
        regions[ind].wantVolume = totVol * this.relSizes[i];
      }
    }
  }
  
  getTotVolume(getyear) {
    if (this.getPopulation(getyear) == -1) {
      return -1;
    }
    return this.getPopulation(getyear) * volumePerPopulation;
  }
  
  getPopulation(getyear) { 
    //loop through years to see if we find one
    let ind = 0;
    for (let i=0; i<this.years.length; i++) {
      //if we have a datapoint, just return the population
      if (this.years[i] == getyear) return this.populations[i];
      
      //otherwise, check if the year is too high
      if (this.years[i] > getyear) {
        //oh no we passed it abort
        ind = i;
        break;
      }
    }
    //if we have datapoints above and below, interpolate between them to get a population estimate
    if (ind != 0) {
      return map(year, this.years[ind-1], this.years[ind], this.populations[ind-1], this.populations[ind]);
    }
    
    //this should get overridden
    return -1;
  }
  
  getRelSizes() {
    let totalBaseVolume = 0;
    for (let i of this.regionIndices) {
      totalBaseVolume += regions[i].getBaseVolume();
    }
    let trelSizes = [];
    for (let i of this.regionIndices) {
      trelSizes.push(regions[i].getBaseVolume() / totalBaseVolume);
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
    push();
    scale(mapScale);
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
    pop();
  }
  
  forces(debugMode) {
    //spring energy
    let springDir = p5.Vector.sub(this.origin, this.pos);
    let springForce = springDir.mult(this.stiffness);
    springForce.setMag(min(1, springForce.mag()));
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
    this.acc.setMag(min(1, this.acc.mag()));
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
    this.easeVolume = this.wantVolume;
  }
  
  //use functions
  show(debugMode, massMode) {
    push();
    scale(mapScale);
    
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
      textSize(32);
      noStroke();
      fill(0);
      textAlign(CENTER);
      text(round(1000*(this.wantVolume-this.getVolume()) / this.wantVolume)/10 + "%", this.center.x, this.center.y);
    }
    pop();
  }
  
  easeWantVol(volEasing) {
    let vol = this.getVolume();
    if (this.wantVolume > vol) this.easeVolume = min(vol*(1+volEasing), this.wantVolume); 
    if (this.wantVolume < vol) this.easeVolume = max(vol*(1-volEasing), this.wantVolume);
    // this.easeVolume = this.wantVolume;
  }
  
  pressureForce() {
    let volume = this.getVolume();
    
    for (let i=0; i<this.ptInd.length; i++) {
      let pressureDir = this.ptPos[i].copy().sub(this.center);
      let fieldStrength = pressureDir.mag() < 5 ? 2/(pow(pressureDir.mag(), 4)) : 0;
      let pressureStrength = (this.easeVolume-volume) / this.easeVolume;
      pressureDir.setMag(pressureStrength + fieldStrength);
      
      massPoints[this.ptInd[i]].acc.add(pressureDir);
    }
  }
  
  //get functions
  getVolume() {
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
    if (this.getBaseVolume() < 10000) return this.center; 
    //this while loop can be dangerous for small regions
    //because the center can fly out forever
    //quit immediately if they're too small
    
    let tcenter = this.center;
    let maxBuffer = this.minDistFrom(tcenter);
    let increment = 25; //this is the length the center will look
    let minIncrement = 1; //will stop once incr < minIncrement
    
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
  
  //this checks whether the sequence a, b, c makes a ccw turn
  ccw(a, b, c) {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  
  //this checks intersection by telling whether p1 and p2 are on opposite sides of the line p3-p4, and same for p3 and p4 vs line p1-p2
  segmentsIntersect(p1, p2, p3, p4) {
    return (this.ccw(p1, p3, p4) != this.ccw(p2, p3, p4)) &&
           (this.ccw(p1, p2, p3) != this.ccw(p1, p2, p4));
  }

  //this just checks every non-adjacent pair of line segments for intersections, and nudges by difference in midpoints if there are intersections
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
            massPoints[this.ptInd[i]].pos.add(diff);
            massPoints[this.ptInd[(i+1)%n]].pos.add(diff);

            massPoints[this.ptInd[j%n]].pos.sub(diff);
            massPoints[this.ptInd[(j+1)%n]].pos.sub(diff);

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
    this.truePos = this.pos;
  }
  
  display() {
    this.truePos = this.pos.copy().add(createVector(bottomRightCorner.x*mapScale, 0));
    push();
    translate(this.truePos);
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
    if (mouseX > this.truePos.x && mouseX < this.truePos.x + (4*this.sliderRadius) && mouseY > this.truePos.y && mouseY < this.truePos.y + (2*this.sliderRadius)) {
      this.state = !this.state;  
    }
  }
  
  gs() { //short for getState
    return this.state;
  }
}
