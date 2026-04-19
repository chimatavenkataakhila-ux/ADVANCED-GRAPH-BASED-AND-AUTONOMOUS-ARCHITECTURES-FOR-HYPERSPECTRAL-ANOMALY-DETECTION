// ========== Load ROI ========== 
var ROI = ee.FeatureCollection("projects/ee-gudivadaswathi2/assets/Vijayawada_Boundary");
Map.centerObject(ROI, 11);
Map.addLayer(ROI, {color: 'yellow'}, "Vijayawada Boundary");

// ========== Class Names ========== 
var classNames = {
  0: 'Urban',
  1: 'Barren Land',
  2: 'Grassland',
  3: 'Agricultural Land',
  4: 'Forest',
  5: 'Water Bodies'
};

// ========== Hardcoded Training Points ========== 
var points = [
  ee.Feature(ee.Geometry.Point(80.635, 16.506), {'class': 0}),
  ee.Feature(ee.Geometry.Point(80.632, 16.508), {'class': 0}),
  ee.Feature(ee.Geometry.Point(80.680, 16.520), {'class': 1}),
  ee.Feature(ee.Geometry.Point(80.675, 16.525), {'class': 1}),
  ee.Feature(ee.Geometry.Point(80.660, 16.515), {'class': 2}),
  ee.Feature(ee.Geometry.Point(80.658, 16.518), {'class': 2}),
  ee.Feature(ee.Geometry.Point(80.648, 16.505), {'class': 3}),
  ee.Feature(ee.Geometry.Point(80.650, 16.502), {'class': 3}),
  ee.Feature(ee.Geometry.Point(80.640, 16.480), {'class': 4}),
  ee.Feature(ee.Geometry.Point(80.638, 16.478), {'class': 4}),
  ee.Feature(ee.Geometry.Point(80.600, 16.500), {'class': 5}),
  ee.Feature(ee.Geometry.Point(80.602, 16.502), {'class': 5})
];
var trainingPoints = ee.FeatureCollection(points);

// ========== Load Landsat 5 (2010) ========== 
function getLandsat5(year) {
  return ee.ImageCollection("LANDSAT/LT05/C02/T1_L2")
    .filterDate(year + '-01-01', year + '-12-31')
    .filterBounds(ROI)
    .filter(ee.Filter.lt('CLOUD_COVER', 20))
    .map(function(img) {
      return img.select(['SR_B1','SR_B2','SR_B3','SR_B4','SR_B5','SR_B7'])
                .multiply(0.0000275).add(-0.2)
                .copyProperties(img, img.propertyNames());
    }).median().clip(ROI);
}

// ========== Load Sentinel-2 (2020) ========== 
function getSentinel2(year) {
  return ee.ImageCollection("COPERNICUS/S2_SR")
    .filterDate(year + '-01-01', year + '-12-31')
    .filterBounds(ROI)
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10))
    .map(function(img) {
      return img.select(['B2','B3','B4','B8','B11','B12']).divide(10000);
    }).median().clip(ROI);
}

var image2010 = getLandsat5(2010);
var image2020 = getSentinel2(2020);

// ========== Train Separate Classifiers ========== 
var training2010 = image2010.sampleRegions({
  collection: trainingPoints,
  properties: ['class'],
  scale: 30
});
var classifier2010 = ee.Classifier.smileRandomForest(100).train({
  features: training2010,
  classProperty: 'class',
  inputProperties: image2010.bandNames()
});

var training2020 = image2020.sampleRegions({
  collection: trainingPoints,
  properties: ['class'],
  scale: 10
});
var classifier2020 = ee.Classifier.smileRandomForest(100).train({
  features: training2020,
  classProperty: 'class',
  inputProperties: image2020.bandNames()
});

var classified2010 = image2010.classify(classifier2010);
var classified2020 = image2020.classify(classifier2020);

// ========== Visualization ========== 
var palette = ['red', 'gray', 'lightgreen', 'yellow', 'darkgreen', 'blue'];
Map.addLayer(classified2010, {min: 0, max: 5, palette: palette}, 'Classified 2010');
Map.addLayer(classified2020, {min: 0, max: 5, palette: palette}, 'Classified 2020');

// ========== Change Detection ========== 
// Compute change map where each pixel represents the change from 2010 to 2020
var changeMap = classified2010.multiply(10).add(classified2020);

// Reduce the region to get a frequency histogram of the transitions
var changeStats = changeMap.reduceRegion({
  reducer: ee.Reducer.frequencyHistogram(),
  geometry: ROI.geometry(),
  scale: 30,
  maxPixels: 1e13
});
print('Raw Change transitions:', changeStats);

// ========== Decode Transitions ========== 
// Decode the frequency histogram into a readable format
changeStats.get('classification').evaluate(function(stats) {
  var decoded = [];
  for (var key in stats) {
    var from = Math.floor(parseInt(key) / 10);  // Get the 'from' class
    var to = parseInt(key) % 10;  // Get the 'to' class
    decoded.push(classNames[from] + ' -> ' + classNames[to] + ': ' + stats[key] + ' pixels');
  }
  decoded.sort();  // Sort the transitions for neatness
  decoded.forEach(function(transition) {
    print(transition);  // Print each transition in the format you desire
  });
});
