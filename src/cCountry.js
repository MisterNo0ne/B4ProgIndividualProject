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