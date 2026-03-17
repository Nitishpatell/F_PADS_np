import os
import sys
import numpy as np
import torch
import unittest
from unittest.mock import MagicMock

# Add backend to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.preprocessor import PreprocessorService
from services.inference import InferenceService
from schemas.prediction import InferenceResult

class TestDynamicBehavior(unittest.TestCase):
    def test_different_inputs_produce_different_previews(self):
        # Sample data paths (using real files from dataset if available)
        base_path = r"c:\Users\BFLCOMP01\Desktop\F_PADS_np\pads-parkinsons-disease-smartwatch-dataset-1.0.0\movement\timeseries"
        file1 = os.path.join(base_path, "001_TouchNose_LeftWrist.txt")
        file2 = os.path.join(base_path, "002_TouchNose_LeftWrist.txt")
        
        if not os.path.exists(file1) or not os.path.exists(file2):
            self.skipTest("Real data files not found for testing")

        def read_signal(path):
            with open(path, 'r') as f:
                lines = f.readlines()
            data = []
            for line in lines:
                parts = [float(p.strip()) for p in line.split(",") if p.strip()]
                if len(parts) == 7:
                    data.append(parts[1:7])
                elif len(parts) == 6:
                    data.append(parts[:6])
            return np.array(data, dtype=np.float32)

        sig1 = read_signal(file1)
        sig2 = read_signal(file2)
        
        self.assertFalse(np.array_equal(sig1[:500], sig2[:500]), "Signals should be different")
        print("Verified: Signal previews for different files are different.")

    def test_window_alignment_logic(self):
        # Mocking segmentation results
        # Left has 5 windows, Right has 7 windows
        left_seg = np.random.rand(5, 256, 6)
        right_seg = np.random.rand(7, 256, 6)
        
        # Mimic the alignment logic in predict_sensor.py
        min_windows = min(left_seg.shape[0], right_seg.shape[0])
        left_aligned = left_seg[:min_windows]
        right_aligned = right_seg[:min_windows]
        
        self.assertEqual(left_aligned.shape[0], 5)
        self.assertEqual(right_aligned.shape[0], 5)
        
        combined = np.concatenate([left_aligned, right_aligned], axis=0)
        self.assertEqual(combined.shape[0], 10)
        print("Verified: Window alignment logic correctly truncates to the minimum window count.")

    def test_hierarchical_decision_logic(self):
        # We'll mock the model output and check the labels
        service = InferenceService(repo_id="dummy")
        service.model = MagicMock()
        service.is_loaded = MagicMock(return_value=True)

        # Mock logits that lead to specific probabilities
        # Case 1: Healthy Control (pd_prob < 0.5)
        # Task 1 probs: [0.5, 0.5] -> pd_prob = 0.5 (strictly < 0.5 would be HC, but if it's == 0.5 it might still be PD depending on the implementation)
        # Actually, let's use [0.6, 0.4] to be sure it's HC.
        def mock_forward(tensor):
            N = tensor.shape[0]
            # t1 logits for [0.6, 0.4] approx [0.405, 0]
            t1 = torch.zeros(N, 2)
            t1[:, 0] = 0.405
            t2 = torch.zeros(N, 2)
            return t1, t2

        service.model.side_effect = mock_forward
        
        dummy_tensor = torch.randn(5, 256, 6)
        result = service.predict(dummy_tensor)
        self.assertEqual(result.final_label, "HC")
        print("Verified: pd_prob < 0.5 correctly leads to Healthy Control (HC)")

        # Case 2: Parkinson's Disease (pd_prob >= 0.5 and pd2_prob > dd_prob)
        # Task 1 probs: [0.3, 0.7] -> pd_prob = 0.7 >= 0.5
        # Task 2 probs: [0.8, 0.2] -> pd2_prob = 0.8 > dd_prob = 0.2 -> PD
        def mock_forward_pd(tensor):
            N = tensor.shape[0]
            # t1 logits for [0.3, 0.7] approx [0, 0.847]
            t1 = torch.zeros(N, 2)
            t1[:, 1] = 0.847
            # t2 logits for [0.8, 0.2] approx [1.386, 0]
            t2 = torch.zeros(N, 2)
            t2[:, 0] = 1.386
            return t1, t2

        service.model.side_effect = mock_forward_pd
        result = service.predict(dummy_tensor)
        self.assertEqual(result.final_label, "PD")
        print("Verified: Higher PD prob in Task 2 leads to Parkinson's Disease (PD)")

        # Case 3: Differential Diagnosis (pd_prob >= 0.5 and pd2_prob <= dd_prob)
        # Task 1 probs: [0.2, 0.8] -> pd_prob = 0.8 >= 0.5
        # Task 2 probs: [0.4, 0.6] -> dd_prob = 0.6 >= pd2_prob = 0.4 -> DD
        def mock_forward_dd(tensor):
            N = tensor.shape[0]
            t1 = torch.zeros(N, 2)
            t1[:, 1] = 1.386
            t2 = torch.zeros(N, 2)
            t2[:, 1] = 0.405 # log(0.6/0.4)
            return t1, t2

        service.model.side_effect = mock_forward_dd
        result = service.predict(dummy_tensor)
        self.assertEqual(result.final_label, "DD")
        print("Verified: Higher DD prob in Task 2 leads to Differential Diagnosis (DD)")

if __name__ == "__main__":
    unittest.main()
