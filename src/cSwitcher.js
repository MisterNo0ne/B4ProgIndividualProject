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