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