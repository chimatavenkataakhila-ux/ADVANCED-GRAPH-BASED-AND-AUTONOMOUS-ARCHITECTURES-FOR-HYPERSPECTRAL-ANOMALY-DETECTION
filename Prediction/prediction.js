
// Step 1: Define years and parameters
var years = {
  2010: {collection: 'LANDSAT/LT05/C02/T1_L2', start: '2010-01-01', end: '2011-01-01', bands: ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']},
  2015: {collection: 'LANDSAT/LC08/C02/T1_L2', start: '2015-01-01', end: '2016-01-01', bands: ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7']},
  2020: {collection: 'COPERNICUS/S2_SR_HARMONIZED', start: '2020-01-01', end: '2021-01-01', bands: ['B2', 'B3', 'B4', 'B8', 'B11', 'B12']},
  2025: {collection: 'COPERNICUS/S2_SR_HARMONIZED', start: '2025-01-01', end: '2025-09-13', bands: ['B2', 'B3', 'B4', 'B8', 'B11', 'B12']}
};

// Step 2: Load Boundary
var boundary = ee.FeatureCollection('projects/ee-gudivadaswathi2/assets/Vijayawada_Boundary');
Map.centerObject(boundary, 10);
Map.addLayer(boundary, {color: 'red'}, 'Vijayawada Boundary');

// Step 3: Create Composites
function getComposite(year) {
  var params = years[year];
  var collection = ee.ImageCollection(params.collection)
    .filterBounds(boundary)
    .filterDate(params.start, params.end);
  
  if (params.collection.indexOf('LANDSAT') !== -1) {
    collection = collection.map(function(image) {
      var qa = image.select('QA_PIXEL');
      var cloud = qa.bitwiseAnd(1 << 5).or(qa.bitwiseAnd(1 << 3));
      return image.updateMask(cloud.not());
    });
  } else {
    collection = collection.filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5));
  }
  
  var composite = collection.median()
    .select(params.bands)
    .clip(boundary)
    .reproject({crs: 'EPSG:4326', scale: 30});
  
  return composite;
}

var composites = {};
Object.keys(years).forEach(function(year) {
  composites[year] = getComposite(year);
});

// Step 4: Compute RSIs with Additional Indices
function addIndices(image, year) {
  var blue, green, red, nir, swir1, swir2;
  if (year === '2010') {
    blue = 'SR_B1';
    green = 'SR_B2';
    red = 'SR_B3';
    nir = 'SR_B4';
    swir1 = 'SR_B5';
    swir2 = 'SR_B7';
  } else if (year === '2015') {
    blue = 'SR_B2';
    green = 'SR_B3';
    red = 'SR_B4';
    nir = 'SR_B5';
    swir1 = 'SR_B6';
    swir2 = 'SR_B7';
  } else {
    blue = 'B2';
    green = 'B3';
    red = 'B4';
    nir = 'B8';
    swir1 = 'B11';
    swir2 = 'B12';
  }

  var mndvi = image.normalizedDifference([nir, red]).rename('MNDVI');
  var mndbi = image.normalizedDifference([swir1, nir]).rename('MNDBI');
  var mndwi = image.normalizedDifference([green, swir1]).rename('MNDWI');
  var dbsi = image.expression(
    '((b1 / (b1 + b2)) - ((b3 - b4) / (b3 + b4)))',
    {
      b1: image.select(swir1),
      b2: image.select(green),
      b3: image.select(nir),
      b4: image.select(red)
    }
  ).rename('DBSI');
  var ndwi = image.normalizedDifference([green, nir]).rename('NDWI');
  var ndbi = image.normalizedDifference([swir1, nir]).rename('NDBI');
  
  var bsi = image.expression(
    '((swir1 + red) - (nir + blue)) / ((swir1 + red) + (nir + blue))',
    {
      swir1: image.select(swir1),
      red: image.select(red),
      nir: image.select(nir),
      blue: image.select(blue)
    }
  ).rename('BSI');
  
  var ui = image.normalizedDifference([swir2, nir]).rename('UI');
  
  var evi = image.expression(
    '2.5 * (nir - red) / (nir + 6 * red - 7.5 * blue + 1)',
    {
      nir: image.select(nir),
      red: image.select(red),
      blue: image.select(blue)
    }
  ).rename('EVI');
  
  var savi = image.expression(
    '1.5 * (nir - red) / (nir + red + 0.5)',
    {
      nir: image.select(nir),
      red: image.select(red)
    }
  ).rename('SAVI');
  
  var ndmi = image.normalizedDifference([nir, swir1]).rename('NDMI');

  return image.addBands([mndvi, mndbi, mndwi, dbsi, ndwi, ndbi, bsi, ui, evi, savi, ndmi]);
}

Object.keys(composites).forEach(function(year) {
  composites[year] = addIndices(composites[year], year);
});

// Step 5: Merge Training Points and Validate
var trainingFC = water.merge(Builtup)
  .merge(Cropland)
  .merge(Forest)
  .merge(Grassland)
  .merge(Shrubland)
  .merge(BarrenLand)
  .merge(Wetland)
  .filter(ee.Filter.inList('class', ee.List.sequence(1, 8)));
var points = trainingFC.randomColumn('random', 123);
var training = points.filter(ee.Filter.lt('random', 0.7));
var validation = points.filter(ee.Filter.gte('random', 0.7));

// Step 6: Train and Apply Optimized Random Forest with Hyperparameter Tuning
var classified = {};
Object.keys(composites).forEach(function(year) {
  var composite = composites[year];
  var bands = composite.bandNames();
  
  var trainSamples = composite.sampleRegions({
    collection: training,
    properties: ['class'],
    scale: 30
  });
  
  var valSamples = composite.sampleRegions({
    collection: validation,
    properties: ['class'],
    scale: 30
  });
  
  var bestAccuracy = 0;
  var bestClassifier = null;
  var numTreesOptions = [100, 150, 200, 300];
  var varsPerSplitOptions = [null, 3, 5];
  
  numTreesOptions.forEach(function(numTrees) {
    varsPerSplitOptions.forEach(function(varsPerSplit) {
      var classifier = ee.Classifier.smileRandomForest({
        numberOfTrees: numTrees,
        variablesPerSplit: varsPerSplit,
        minLeafPopulation: 1,
        bagFraction: 0.5,
        maxNodes: null,
        seed: 123
      }).train({
        features: trainSamples,
        classProperty: 'class',
        inputProperties: bands
      });
      
      var test = valSamples.classify(classifier);
      var errorMatrix = test.errorMatrix('class', 'classification');
      var accuracy = errorMatrix.accuracy().getInfo();
      
      print('Year ' + year + ': numTrees=' + numTrees + ', varsPerSplit=' + (varsPerSplit || 'default') + ', Accuracy=' + accuracy);
      
      if (accuracy > bestAccuracy) {
        bestAccuracy = accuracy;
        bestClassifier = classifier;
      }
    });
  });
  
  classified[year] = composite.classify(bestClassifier).rename('classification');
});

// Step 7: Post-Processing with Majority Filter
function majorityFilter(image) {
  var kernel = ee.Kernel.square({radius: 1});
  return image.focalMode({kernel: kernel, iterations: 2});
}

Object.keys(classified).forEach(function(year) {
  classified[year] = majorityFilter(classified[year]);
});

var palette = ['#FF0000', '#FFFF00', '#006400', '#90EE90', '#8B4513', '#808080', '#0000FF', '#800080'];
Object.keys(classified).forEach(function(year) {
  Map.addLayer(classified[year], {min: 1, max: 8, palette: palette}, year + ' Classified (Filtered)');
});

// Step 8: Final Accuracy Assessment with Best Model
Object.keys(classified).forEach(function(year) {
  var classImage = classified[year];
  var valSamples = classImage.sampleRegions({
    collection: validation,
    properties: ['class'],
    scale: 30
  });
  
  var errorMatrix = valSamples.errorMatrix('class', 'classification');
  var overallAccuracy = errorMatrix.accuracy();
  print('Final Overall Accuracy ' + year, overallAccuracy);
});

// Step 9: Compute and Visualize Class Areas
var classNames = ee.List(['Builtup', 'Cropland', 'Forest', 'Grassland', 'Shrubland', 'Barren Land', 'Water', 'Wetland']);

Object.keys(classified).forEach(function(year) {
  var classImage = classified[year];
  var areaImage = ee.Image.pixelArea().divide(1000000).addBands(classImage);
  var areas = areaImage.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    geometry: boundary.geometry(),
    scale: 30,
    maxPixels: 1e13
  });
  
  var areaGroups = ee.List(areas.get('groups'));
  
  var areaFeatures = ee.FeatureCollection(areaGroups.map(function(group) {
    var dict = ee.Dictionary(group);
    var classNum = ee.Number(dict.get('class')).subtract(1);
    var area = ee.Number(dict.get('sum'));
    var className = classNames.get(classNum);
    return ee.Feature(null, {
      'Class': className,
      'Area (km²)': area
    });
  }));
  
  var areaChart = ui.Chart.feature.byFeature({
    features: areaFeatures,
    xProperty: 'Class',
    yProperties: ['Area (km²)']
  }).setChartType('ColumnChart')
    .setOptions({
      title: 'Land Cover Areas for ' + year,
      hAxis: {title: 'Class'},
      vAxis: {title: 'Area (km²)'},
      legend: {position: 'none'},
      colors: ['#FF0000', '#FFFF00', '#006400', '#90EE90', '#8B4513', '#808080', '#0000FF', '#800080']
    });
  print(areaChart);
  
  var areaTable = ui.Chart.feature.byFeature({
    features: areaFeatures,
    xProperty: 'Class',
    yProperties: ['Area (km²)']
  }).setChartType('Table')
    .setOptions({
      title: 'Land Cover Areas Table for ' + year
    });
  print(areaTable);
});

// Step 10: CA-Markov Prediction for 2030 Using 2020–2025 Transitions
var numClasses = 8;
var pixelArea = 30 * 30 / 1000000; // km² per pixel

// Compute transition matrix for 2020–2025
var pre = classified['2020'];
var post = classified['2025'];
var transitionAreas = [];
for (var i = 1; i <= numClasses; i++) {
  var row = [];
  for (var j = 1; j <= numClasses; j++) {
    var mask = pre.eq(i).and(post.eq(j));
    var areaImg = mask.multiply(ee.Image.pixelArea().divide(1000000));
    var area = areaImg.reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: boundary.geometry(),
      scale: 30,
      maxPixels: 1e13
    }).get('classification').getInfo() || 0;
    row.push(area);
  }
  transitionAreas.push(row);
}

// Compute transition probabilities
var transitionProbs = [];
for (var i = 0; i < numClasses; i++) {
  var rowSum = transitionAreas[i].reduce(function(a, b) { return a + b; }, 0);
  var probRow = transitionAreas[i].map(function(area) { return rowSum > 0 ? area / rowSum : 0; });
  transitionProbs.push(probRow);
}

print('Transition Areas (km²) from 2020 to 2025', transitionAreas);
print('Transition Probabilities from 2020 to 2025', transitionProbs);

// Current areas for 2025
var currentClass = classified['2025'];
var currentAreaImage = ee.Image.pixelArea().divide(1000000).addBands(currentClass);
var currentAreasDict = currentAreaImage.reduceRegion({
  reducer: ee.Reducer.sum().group({groupField: 1, groupName: 'class'}),
  geometry: boundary.geometry(),
  scale: 30,
  maxPixels: 1e13
});
var currentGroups = ee.List(currentAreasDict.get('groups'));

// Initialize arrays
var currentAreas = [];
for (var i = 0; i < numClasses; i++) {
  currentAreas.push(0); // Initialize array with zeros
}

currentGroups.evaluate(function(groups) {
  // Populate currentAreas
  groups.forEach(function(group) {
    var cl = group.class - 1;
    currentAreas[cl] = group.sum;
  });
  
  // Predict areas for 2030 using Markov
  var predictedAreas = [];
  for (var i = 0; i < numClasses; i++) {
    predictedAreas.push(0); // Initialize array with zeros
  }
  for (var j = 0; j < numClasses; j++) {
    for (var i = 0; i < numClasses; i++) {
      predictedAreas[j] += currentAreas[i] * transitionProbs[i][j];
    }
  }
  print('Predicted Areas for 2030 (km²)', predictedAreas);

  // CA simulation for spatial allocation
  var kernel = ee.Kernel.square({radius: 2, units: 'pixels', normalize: false});
  var predictedClass = currentClass;

  for (var i = 1; i <= numClasses; i++) {
    var currentAreaI = currentAreas[i-1];
    for (var j = 1; j <= numClasses; j++) {
      if (i === j) continue;
      var expectedAreaIJ = currentAreaI * transitionProbs[i-1][j-1];
      var nIJ = Math.round(expectedAreaIJ / pixelArea);
      if (nIJ <= 0) continue;
      
      var isJ = currentClass.eq(j);
      var neighborCountJ = isJ.reduceNeighborhood({reducer: ee.Reducer.sum(), kernel: kernel});
      var suitabilityImg = neighborCountJ.updateMask(currentClass.eq(i));
      
      var randomImg = ee.Image.random().multiply(0.001).rename('random');
      var sampleImg = suitabilityImg.rename('suitability').addBands(randomImg);
      
      var samples = sampleImg.sample({
        region: boundary.geometry(),
        scale: 30,
        geometries: true,
        tileScale: 4
      });
      
      var sortedSamples = samples.sort('suitability', false).sort('random', false).limit(nIJ);
      var changeMask = ee.Image(0).paint(sortedSamples, 1);
      
      predictedClass = predictedClass.where(changeMask.eq(1), j);
    }
  }

  classified['2030'] = predictedClass;
  Map.addLayer(classified['2030'], {min: 1, max: 8, palette: palette}, '2030 Classified (Predicted)');

  // Compute and visualize areas for 2030
  var classImage2030 = classified['2030'];
  var areaImage2030 = ee.Image.pixelArea().divide(1000000).addBands(classImage2030);
  var areas2030 = areaImage2030.reduceRegion({
    reducer: ee.Reducer.sum().group({
      groupField: 1,
      groupName: 'class'
    }),
    geometry: boundary.geometry(),
    scale: 30,
    maxPixels: 1e13
  });

  var areaGroups2030 = ee.List(areas2030.get('groups'));

  var areaFeatures2030 = ee.FeatureCollection(areaGroups2030.map(function(group) {
    var dict = ee.Dictionary(group);
    var classNum = ee.Number(dict.get('class')).subtract(1);
    var area = ee.Number(dict.get('sum'));
    var className = classNames.get(classNum);
    return ee.Feature(null, {
      'Class': className,
      'Area (km²)': area
    });
  }));

  // Bar graph for 2030
  var areaChart2030 = ui.Chart.feature.byFeature({
    features: areaFeatures2030,
    xProperty: 'Class',
    yProperties: ['Area (km²)']
  }).setChartType('ColumnChart')
    .setOptions({
      title: 'Land Cover Areas for 2030 (Predicted)',
      hAxis: {title: 'Class'},
      vAxis: {title: 'Area (km²)'},
      legend: {position: 'none'},
      colors: ['#FF0000', '#FFFF00', '#006400', '#90EE90', '#8B4513', '#808080', '#0000FF', '#800080']
    });
  print(areaChart2030);

  // Table for 2030
  var areaTable2030 = ui.Chart.feature.byFeature({
    features: areaFeatures2030,
    xProperty: 'Class',
    yProperties: ['Area (km²)']
  }).setChartType('Table')
    .setOptions({
      title: 'Land Cover Areas Table for 2030 (Predicted)'
    });
  print(areaTable2030);
});
