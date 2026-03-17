"""
Analyze signal features for HC vs PD patients to calibrate thresholds.
"""
import numpy as np
import pandas as pd
import os

BASE = r"c:\Users\BFLCOMP01\Desktop\F_PADS_np\pads-parkinsons-disease-smartwatch-dataset-1.0.0"
TIMESERIES = os.path.join(BASE, "movement", "timeseries")
PATIENTS = os.path.join(BASE, "patients")

import json

# Gather patient conditions
conditions = {}
for f in os.listdir(PATIENTS):
    if f.endswith('.json'):
        with open(os.path.join(PATIENTS, f)) as fp:
            p = json.load(fp)
            conditions[p['id']] = p['condition']

# Analyze signals for a few HC and PD patients across multiple tasks
tasks = ["TouchNose", "CrossArms", "Relaxed"]

def read_signal(path):
    df = pd.read_csv(path, sep=",", header=None)
    if df.shape[1] == 7:
        df = df.iloc[:, 1:]  # drop Time
    return df.to_numpy(dtype=np.float32)

def compute_features(signal):
    """Extract key biomechanical features from 6-channel signal."""
    # signal: (T, 6) — accel_x,y,z, gyro_x,y,z
    
    # 1. RMS of each channel
    rms = np.sqrt(np.mean(signal**2, axis=0))
    
    # 2. Standard deviation (variability)
    std = np.std(signal, axis=0)
    
    # 3. Tremor power (4-6 Hz band) using FFT
    # Assuming 62 Hz sampling rate (from PADS dataset)
    fs = 62.0
    n = signal.shape[0]
    freqs = np.fft.rfftfreq(n, 1.0/fs)
    
    tremor_power = []
    total_power = []
    for ch in range(6):
        fft_vals = np.abs(np.fft.rfft(signal[:, ch]))**2
        # Tremor band: 3-8 Hz (broader than classic 4-6 to catch more tremor)
        tremor_mask = (freqs >= 3.0) & (freqs <= 8.0)
        tremor_power.append(fft_vals[tremor_mask].sum())
        total_power.append(fft_vals.sum() + 1e-10)
    
    tremor_ratio = np.array(tremor_power) / np.array(total_power)
    
    # 4. Jerk (rate of change of acceleration)
    jerk = np.diff(signal[:, :3], axis=0)  # accel only
    jerk_rms = np.sqrt(np.mean(jerk**2, axis=0))
    
    # 5. Signal entropy (approximate, using histogram)
    entropy_vals = []
    for ch in range(6):
        hist, _ = np.histogram(signal[:, ch], bins=50, density=True)
        hist = hist[hist > 0]
        entropy_vals.append(-np.sum(hist * np.log2(hist + 1e-10)))
    entropy = np.array(entropy_vals)
    
    # 6. Dominant frequency per channel
    dom_freq = []
    for ch in range(6):
        fft_vals = np.abs(np.fft.rfft(signal[:, ch]))
        # Ignore DC component
        fft_vals[0] = 0
        dom_idx = np.argmax(fft_vals)
        dom_freq.append(freqs[dom_idx])
    dom_freq = np.array(dom_freq)
    
    return {
        'rms_mean': rms.mean(),
        'rms_accel': rms[:3].mean(),
        'rms_gyro': rms[3:].mean(),
        'std_mean': std.mean(),
        'tremor_ratio_mean': tremor_ratio.mean(),
        'tremor_ratio_accel': tremor_ratio[:3].mean(),
        'tremor_ratio_gyro': tremor_ratio[3:].mean(),
        'jerk_rms_mean': jerk_rms.mean(),
        'entropy_mean': entropy.mean(),
        'dom_freq_accel': dom_freq[:3].mean(),
        'dom_freq_gyro': dom_freq[3:].mean(),
    }

# Analyze patients
results = []
for pid, cond in sorted(conditions.items()):
    for task in tasks:
        left_path = os.path.join(TIMESERIES, f"{pid}_{task}_LeftWrist.txt")
        right_path = os.path.join(TIMESERIES, f"{pid}_{task}_RightWrist.txt")
        
        if not os.path.exists(left_path) or not os.path.exists(right_path):
            continue
        
        try:
            left_sig = read_signal(left_path)
            right_sig = read_signal(right_path)
            
            left_feat = compute_features(left_sig)
            right_feat = compute_features(right_sig)
            
            # Combine left + right features
            combined = {}
            for k in left_feat:
                combined[k] = (left_feat[k] + right_feat[k]) / 2
            combined['pid'] = pid
            combined['condition'] = cond
            combined['task'] = task
            results.append(combined)
        except Exception as e:
            pass

# Print summary statistics by condition
df = pd.DataFrame(results)
print(f"Total records: {len(df)}")
print(f"\nConditions: {df['condition'].value_counts().to_dict()}")

for cond in ["Healthy", "Parkinson's", "Other Movement Disorders", "Essential Tremor"]:
    subset = df[df['condition'] == cond]
    if len(subset) == 0:
        continue
    print(f"\n{'='*60}")
    print(f"Condition: {cond} (n={len(subset)})")
    print(f"{'='*60}")
    for col in ['rms_mean', 'rms_accel', 'rms_gyro', 'std_mean', 'tremor_ratio_mean', 
                'tremor_ratio_accel', 'tremor_ratio_gyro', 'jerk_rms_mean', 'entropy_mean',
                'dom_freq_accel', 'dom_freq_gyro']:
        vals = subset[col]
        print(f"  {col:25s}: mean={vals.mean():.4f}, std={vals.std():.4f}, median={vals.median():.4f}")
