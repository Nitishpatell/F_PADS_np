"""
Train a lightweight logistic regression on extracted signal features.
Save the model coefficients for use in the inference service.
"""
import numpy as np
import pandas as pd
import os
import json
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.preprocessing import StandardScaler
import pickle

BASE = r"c:\Users\BFLCOMP01\Desktop\F_PADS_np\pads-parkinsons-disease-smartwatch-dataset-1.0.0"
TIMESERIES = os.path.join(BASE, "movement", "timeseries")
PATIENTS = os.path.join(BASE, "patients")

def read_signal(path):
    df = pd.read_csv(path, sep=",", header=None)
    if df.shape[1] == 7:
        df = df.iloc[:, 1:]
    return df.to_numpy(dtype=np.float32)

def compute_features(signal, fs=62.0):
    T, C = signal.shape
    freqs = np.fft.rfftfreq(T, 1.0 / fs)
    
    tremor_power = []
    total_power = []
    tremor_peak_ratios = []
    for ch in range(6):
        fft_vals = np.abs(np.fft.rfft(signal[:, ch])) ** 2
        tremor_mask = (freqs >= 3.0) & (freqs <= 8.0)
        tp = fft_vals[tremor_mask].sum()
        tot = fft_vals.sum() + 1e-10
        tremor_power.append(tp)
        total_power.append(tot)
        median_pwr = np.median(fft_vals[1:]) + 1e-10
        tremor_vals = fft_vals[tremor_mask]
        tremor_peak_ratios.append(float(tremor_vals.max() / median_pwr) if len(tremor_vals) > 0 else 0.0)
    
    tremor_ratio = np.array(tremor_power) / np.array(total_power)
    
    jerk = np.diff(signal[:, :3], axis=0)
    jerk_rms = np.sqrt(np.mean(jerk ** 2, axis=0))
    
    std = np.std(signal, axis=0)
    
    spec_centroid = []
    for ch in range(6):
        fft_vals = np.abs(np.fft.rfft(signal[:, ch]))
        total = fft_vals.sum() + 1e-10
        sc = float(np.sum(freqs * fft_vals) / total)
        spec_centroid.append(sc)
    
    return {
        'tremor_ratio_mean': float(tremor_ratio.mean()),
        'tremor_ratio_accel': float(tremor_ratio[:3].mean()),
        'tremor_ratio_gyro': float(tremor_ratio[3:].mean()),
        'tremor_peak_ratio': float(np.mean(tremor_peak_ratios)),
        'jerk_rms_mean': float(jerk_rms.mean()),
        'std_gyro': float(std[3:].mean()),
        'spec_centroid_mean': float(np.mean(spec_centroid)),
    }

# Load conditions
conditions = {}
for f in os.listdir(PATIENTS):
    if f.endswith('.json'):
        with open(os.path.join(PATIENTS, f)) as fp:
            p = json.load(fp)
            conditions[p['id']] = p['condition']

# All tasks
all_tasks = ["TouchNose", "CrossArms", "Relaxed", "DrinkGlas", "Entrainment",
             "HoldWeight", "StretchHold"]

records = []
for pid in sorted(conditions.keys()):
    cond = conditions[pid]
    if cond == "Healthy":
        label_t1 = 0  # HC
        label_t2 = -1  # N/A for task2
    elif cond == "Parkinson's":
        label_t1 = 1  # PD
        label_t2 = 0  # PD
    else:
        label_t1 = 1  # PD/Pathological
        label_t2 = 1  # DD
    
    for task in all_tasks:
        left_path = os.path.join(TIMESERIES, f"{pid}_{task}_LeftWrist.txt")
        right_path = os.path.join(TIMESERIES, f"{pid}_{task}_RightWrist.txt")
        
        if not os.path.exists(left_path) or not os.path.exists(right_path):
            continue
        
        try:
            left_sig = read_signal(left_path)
            right_sig = read_signal(right_path)
            
            left_feat = compute_features(left_sig)
            right_feat = compute_features(right_sig)
            
            feat = {}
            for k in left_feat:
                feat[k] = (left_feat[k] + right_feat[k]) / 2
            
            feat['wrist_tremor_asym'] = abs(left_feat['tremor_ratio_mean'] - right_feat['tremor_ratio_mean'])
            feat['wrist_jerk_asym'] = abs(left_feat['jerk_rms_mean'] - right_feat['jerk_rms_mean'])
            feat['wrist_peak_asym'] = abs(left_feat['tremor_peak_ratio'] - right_feat['tremor_peak_ratio'])
            
            feat['label_t1'] = label_t1
            feat['label_t2'] = label_t2
            feat['pid'] = pid
            records.append(feat)
        except:
            pass

df = pd.DataFrame(records)
print(f"Total records: {len(df)}")

feature_cols = ['tremor_ratio_mean', 'tremor_ratio_accel', 'tremor_ratio_gyro',
                'tremor_peak_ratio', 'jerk_rms_mean', 'std_gyro', 'spec_centroid_mean',
                'wrist_tremor_asym', 'wrist_jerk_asym', 'wrist_peak_asym']

# --- Task 1: HC vs PD/DD (binary) ---
X_t1 = df[feature_cols].values
y_t1 = df['label_t1'].values

scaler_t1 = StandardScaler()
X_t1_scaled = scaler_t1.fit_transform(X_t1)

model_t1 = LogisticRegression(C=1.0, max_iter=1000, random_state=42, class_weight='balanced')

# Cross-validation (5-fold, stratified by patient to avoid data leakage)
# Actually, let's do a simple patient-level split for proper evaluation
unique_pids = df['pid'].unique()
np.random.seed(42)
np.random.shuffle(unique_pids)
n_test = len(unique_pids) // 5
test_pids = set(unique_pids[:n_test])
train_pids = set(unique_pids[n_test:])

train_mask = df['pid'].isin(train_pids)
test_mask = df['pid'].isin(test_pids)

X_train = scaler_t1.fit_transform(df.loc[train_mask, feature_cols].values)
X_test = scaler_t1.transform(df.loc[test_mask, feature_cols].values)
y_train = df.loc[train_mask, 'label_t1'].values
y_test = df.loc[test_mask, 'label_t1'].values

model_t1.fit(X_train, y_train)
train_acc = model_t1.score(X_train, y_train)
test_acc = model_t1.score(X_test, y_test)
print(f"\nTask 1 (HC vs PD/DD):")
print(f"  Train accuracy: {train_acc:.3f}")
print(f"  Test accuracy: {test_acc:.3f}")
print(f"  Feature importances:")
for i, col in enumerate(feature_cols):
    print(f"    {col:25s}: {model_t1.coef_[0][i]:.4f}")

# Now fit on ALL data for deployment
scaler_t1_final = StandardScaler()
X_t1_all = scaler_t1_final.fit_transform(X_t1)
model_t1_final = LogisticRegression(C=1.0, max_iter=1000, random_state=42, class_weight='balanced')
model_t1_final.fit(X_t1_all, y_t1)

# --- Task 2: PD vs DD (only pathological patients) ---
df_patho = df[df['label_t2'] >= 0].copy()
X_t2 = df_patho[feature_cols].values
y_t2 = df_patho['label_t2'].values

scaler_t2 = StandardScaler()
X_t2_scaled = scaler_t2.fit_transform(X_t2)

model_t2 = LogisticRegression(C=1.0, max_iter=1000, random_state=42)

# Patient-level split
patho_pids = df_patho['pid'].unique()
np.random.shuffle(patho_pids)
n_test_p = len(patho_pids) // 5
test_pids_p = set(patho_pids[:n_test_p])
train_pids_p = set(patho_pids[n_test_p:])

train_mask_p = df_patho['pid'].isin(train_pids_p)
test_mask_p = df_patho['pid'].isin(test_pids_p)

X_train_p = scaler_t2.fit_transform(df_patho.loc[train_mask_p, feature_cols].values)
X_test_p = scaler_t2.transform(df_patho.loc[test_mask_p, feature_cols].values)
y_train_p = df_patho.loc[train_mask_p, 'label_t2'].values
y_test_p = df_patho.loc[test_mask_p, 'label_t2'].values

model_t2.fit(X_train_p, y_train_p)
train_acc_p = model_t2.score(X_train_p, y_train_p)
test_acc_p = model_t2.score(X_test_p, y_test_p)
print(f"\nTask 2 (PD vs DD):")
print(f"  Train accuracy: {train_acc_p:.3f}")
print(f"  Test accuracy: {test_acc_p:.3f}")
print(f"  Feature importances:")
for i, col in enumerate(feature_cols):
    print(f"    {col:25s}: {model_t2.coef_[0][i]:.4f}")

# Fit on all pathological data for deployment
scaler_t2_final = StandardScaler()
X_t2_all = scaler_t2_final.fit_transform(X_t2)
model_t2_final = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
model_t2_final.fit(X_t2_all, y_t2)

# Save the model parameters (coefficients, intercept, scaler params)
# We'll save as a JSON for easy loading without pickle/sklearn dependency
model_params = {
    'feature_cols': feature_cols,
    'task1': {
        'coef': model_t1_final.coef_[0].tolist(),
        'intercept': float(model_t1_final.intercept_[0]),
        'scaler_mean': scaler_t1_final.mean_.tolist(),
        'scaler_scale': scaler_t1_final.scale_.tolist(),
    },
    'task2': {
        'coef': model_t2_final.coef_[0].tolist(),
        'intercept': float(model_t2_final.intercept_[0]),
        'scaler_mean': scaler_t2_final.mean_.tolist(),
        'scaler_scale': scaler_t2_final.scale_.tolist(),
    }
}

output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'models', 'signal_classifier.json')
with open(output_path, 'w') as f:
    json.dump(model_params, f, indent=2)
print(f"\nSaved classifier params to {output_path}")

# Quick test with specific patients
print("\n=== Quick test ===")
for pid in ["001", "003", "004", "006", "008"]:
    cond = conditions[pid]
    task = "TouchNose"
    lp = os.path.join(TIMESERIES, f"{pid}_{task}_LeftWrist.txt")
    rp = os.path.join(TIMESERIES, f"{pid}_{task}_RightWrist.txt")
    if not os.path.exists(lp):
        continue
    
    ls = read_signal(lp)
    rs = read_signal(rp)
    lf = compute_features(ls)
    rf = compute_features(rs)
    
    feat = {}
    for k in lf:
        feat[k] = (lf[k] + rf[k]) / 2
    feat['wrist_tremor_asym'] = abs(lf['tremor_ratio_mean'] - rf['tremor_ratio_mean'])
    feat['wrist_jerk_asym'] = abs(lf['jerk_rms_mean'] - rf['jerk_rms_mean'])
    feat['wrist_peak_asym'] = abs(lf['tremor_peak_ratio'] - rf['tremor_peak_ratio'])
    
    x = np.array([[feat[c] for c in feature_cols]])
    x_s1 = (x - scaler_t1_final.mean_) / scaler_t1_final.scale_
    x_s2 = (x - scaler_t2_final.mean_) / scaler_t2_final.scale_
    
    p1 = model_t1_final.predict_proba(x_s1)[0]
    p2 = model_t2_final.predict_proba(x_s2)[0]
    
    if p1[0] > p1[1]:
        label = "HC"
    elif p2[0] > p2[1]:
        label = "PD"
    else:
        label = "DD"
    
    print(f"  Patient {pid} ({cond}): label={label}, HC={p1[0]:.3f}, PD={p1[1]:.3f}, PD2={p2[0]:.3f}, DD={p2[1]:.3f}")
