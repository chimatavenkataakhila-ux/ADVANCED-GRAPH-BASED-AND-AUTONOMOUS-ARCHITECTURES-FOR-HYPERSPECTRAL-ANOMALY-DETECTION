# 🌍 Land Use Land Cover Classification & Prediction (GEE)

This project performs **Land Use Land Cover (LULC) classification** and **future prediction (2030)** using **Google Earth Engine (GEE)**. It combines **Random Forest classification** with **CA-Markov modeling** to analyze land cover changes over time.

---

## 📌 Features

* Multi-year satellite data processing (2010, 2015, 2020, 2025)
* Spectral index computation (NDVI, NDBI, NDWI, etc.)
* Optimized Random Forest classification
* Accuracy assessment (Training + Validation)
* Land cover area statistics and charts
* CA-Markov based prediction for 2030

---

## ⚙️ Requirements

Before running the code, make sure you have:

1. A **Google Earth Engine account**
2. Access to **GEE Code Editor**
   👉 https://code.earthengine.google.com/

---

## 📂 Required Assets (VERY IMPORTANT)

You MUST upload the following assets to your GEE account:

### 1️⃣ Boundary (Region of Interest)

* Type: `FeatureCollection`
* Example: Vijayawada boundary shapefile

### 2️⃣ Training Points

* Type: `FeatureCollection`
* Must contain a property:

```plaintext
class
```

---

## 🏷️ Class Labels (MANDATORY)

Your training data must follow this exact mapping:

| Class Name  | Value |
| ----------- | ----- |
| Built-up    | 1     |
| Cropland    | 2     |
| Forest      | 3     |
| Grassland   | 4     |
| Shrubland   | 5     |
| Barren Land | 6     |
| Water       | 7     |
| Wetland     | 8     |

⚠️ Do NOT change these values — the model depends on them.

---

## 📤 How to Upload Assets in GEE

1. Open GEE Code Editor
2. Go to **Assets → NEW → Table upload**
3. Upload:

   * Shapefile (.shp, .dbf, .shx, .prj)
   * OR GeoJSON
4. Wait until upload completes
5. Copy the asset path

Example:

```javascript
projects/your-username/assets/your_asset_name
```

---

## 🔧 IMPORTANT: Update Asset Paths in Code

After uploading, replace these lines in `prediction.js`:

### 🔹 Replace Boundary

```javascript
var boundary = ee.FeatureCollection('YOUR_BOUNDARY_ASSET_PATH');
```

### 🔹 Replace Training Points

```javascript
var trainingFC = ee.FeatureCollection('YOUR_TRAINING_POINTS_ASSET_PATH');
```

---

## ▶️ How to Run the Code

1. Open GEE Code Editor
2. Create a new script
3. Copy and paste `prediction.js`
4. Replace asset paths (IMPORTANT)
5. Click **Run**

---

## 📊 Output

The script will generate:

* ✅ Classified maps (2010, 2015, 2020, 2025)
* ✅ Accuracy metrics
* ✅ Land cover area charts
* ✅ Land cover tables
* ✅ Transition matrix (2020 → 2025)
* ✅ Predicted LULC map for 2030

---

## ⚠️ Common Errors & Fixes

### ❌ Error: Asset not found

✔ Fix: Check asset path is correct

---

### ❌ Error: No training data

✔ Fix:

* Ensure `class` field exists
* Values must be 1–8

---

### ❌ Error: Empty output

✔ Fix:

* Check boundary overlaps satellite data
* Ensure training points are inside ROI

---

## 🧠 Notes

* Training points are **manually configured** for better classification accuracy
* Higher resolution imagery (Sentinel-2) improves performance
* Cloud filtering is already handled in the script

---

## 🚀 Future Improvements

* Deep learning-based classification
* Temporal analysis with more years
* Integration with GIS platforms

---

## 📌 Author

This project is developed for **LULC analysis and prediction using GEE**, focusing on accurate classification and reliable future forecasting.

---

## ⭐ Important Reminder

👉 Users must:

* Upload their own assets
* Replace asset paths in code

Otherwise, the script will NOT run.

---
