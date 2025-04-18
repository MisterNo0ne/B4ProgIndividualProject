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
