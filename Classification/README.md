# 🌍 Advanced LULC Classification using Random Forest and FHO-Optimized BiLSTM

This project presents a **hybrid land use land cover (LULC) classification framework** combining:

* 🌐 **Google Earth Engine (GEE)** for satellite image processing and baseline classification
* 🤖 **Bi-Directional LSTM (BiLSTM)** for deep learning-based classification
* 🔥 **Flamingo–Hyena Optimization (FHO)** for hyperparameter tuning and performance enhancement

The system is designed to analyze **spatio-temporal land cover changes** in Vijayawada and improve classification accuracy using advanced optimization techniques.

---

## 📂 Project Structure

```plaintext
Classification/
│── classification.js        # GEE script for LULC classification & change detection
│── classification.ipynb    # BiLSTM + FHO deep learning model
│── README.md               # Project documentation
```

---

## 📌 Project Workflow

### 🔹 Phase 1: GEE-Based Classification

* Load ROI (Vijayawada boundary)
* Preprocess satellite imagery (Landsat & Sentinel)
* Generate spectral bands
* Train **Random Forest classifier**
* Produce classified maps (2010 & 2020)
* Perform **change detection**

---

### 🔹 Phase 2: Deep Learning Classification

* Extract features from satellite data
* Train **BiLSTM model**
* Optimize parameters using **Flamingo–Hyena Optimization (FHO)**
* Improve classification accuracy and generalization

---

## 🛰️ Datasets Used

| Year | Satellite  | Resolution |
| ---- | ---------- | ---------- |
| 2010 | Landsat-5  | 30m        |
| 2020 | Sentinel-2 | 10m        |

---

## 🏷️ Land Cover Classes

| Class ID | Class Name        |
| -------- | ----------------- |
| 0        | Urban             |
| 1        | Barren Land       |
| 2        | Grassland         |
| 3        | Agricultural Land |
| 4        | Forest            |
| 5        | Water Bodies      |

---

## ⚙️ Requirements

### 🔹 For GEE Script

* Google Earth Engine account
  👉 https://code.earthengine.google.com/

---

### 🔹 For Jupyter Notebook (BiLSTM + FHO)

Install required libraries:

```bash
pip install numpy pandas matplotlib scikit-learn tensorflow keras
```

---

## 📍 Required Inputs

### 1️⃣ ROI (Boundary Shapefile)

Upload to GEE and replace in code:

```javascript
var ROI = ee.FeatureCollection("YOUR_ASSET_PATH");
```

---

### 2️⃣ Training Data

* Already defined inside:

  * `classification.js` → hardcoded points
  * `classification.ipynb` → dataset preparation

You can improve results by:

* Adding more samples
* Balancing class distribution

---

## ▶️ How to Run

---

### 🚀 Run GEE Script

1. Open GEE Code Editor
2. Upload ROI asset
3. Paste `classification.js`
4. Replace asset path
5. Click **Run**

---

### 🤖 Run BiLSTM + FHO Model

1. Open Jupyter Notebook
2. Navigate to:

```plaintext
Classification/classification.ipynb
```

3. Run all cells step-by-step

---

## 🧠 Model Details

### 🔷 BiLSTM Model

* Captures **temporal dependencies** in satellite data
* Processes sequences in **forward and backward directions**

---

### 🔥 Flamingo–Hyena Optimization (FHO)

FHO is a hybrid optimization algorithm that:

* Enhances hyperparameter tuning
* Balances exploration (Flamingo behavior)
* Improves exploitation (Hyena strategy)
* Avoids local minima

---

## 📊 Outputs

### 📌 From GEE

* Classified LULC maps (2010 & 2020)
* Change detection map
* Transition statistics

---

### 📌 From BiLSTM + FHO

* Training & validation accuracy
* Loss curves
* Optimized model parameters
* Final classification predictions

---

## 📈 Performance

* Random Forest provides baseline classification
* BiLSTM improves temporal understanding
* FHO significantly boosts accuracy and convergence

---

## ⚠️ Common Issues

### ❌ GEE Asset Error

✔ Ensure correct asset path

---

### ❌ Low Accuracy

✔ Increase training samples
✔ Balance dataset

---

### ❌ Notebook Errors

✔ Install required libraries
✔ Use Python 3.8+

---

## 🚀 Future Enhancements

* Add CA-Markov for prediction (2030)
* Integrate hyperspectral datasets
* Apply Transformer-based models
* Automate training data generation

---

## 📌 Key Contribution

This project demonstrates a **multi-stage intelligent classification system** combining:

* Remote sensing
* Machine learning
* Deep learning
* Metaheuristic optimization

to achieve **high-accuracy LULC mapping and change detection**.

---

## 👨‍💻 Author Note

To run the project successfully:

✔ Upload ROI in GEE
✔ Replace asset path
✔ Run GEE script
✔ Execute Jupyter Notebook

Everything else is pre-configured ✅

---
