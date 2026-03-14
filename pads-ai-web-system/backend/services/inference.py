import json
import os
import typing
from fastapi import HTTPException  
from huggingface_hub import hf_hub_download
from schemas.prediction import InferenceResult
from models.model import HierarchicalTransformer

class InferenceService:
    def __init__(self, repo_id: str, config_path: str = ""):
        self.repo_id = repo_id
        
        # Load config directly from repo mapping if empty
        if not config_path:
            config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "config.json")
            # If our backend doesn't have it locally, default values will be applied by model
        
        self.config = None
        if os.path.exists(config_path):
            with open(config_path, "r") as f:
                self.config = json.load(f)
                
        self.model: typing.Any = None

    def load_model(self):
        """Downloads the best_model.pth from HF Hub and instantiates the HierarchicalTransformer"""
        if not self.repo_id:
            raise ValueError("HF_REPO_ID is not configured.")
            
        try:
            # Download model weights from hub
            model_path = hf_hub_download(repo_id=self.repo_id, filename="best_model.pth")
            
            # Instantiate model
            self.model = HierarchicalTransformer(config=self.config)
            
            # Load state dict
            import torch
            checkpoint = torch.load(model_path, map_location="cpu", weights_only=False)
            
            # Handle nested state dict (training checkpoints often have weights under 'model_state_dict')
            if isinstance(checkpoint, dict) and "model_state_dict" in checkpoint:
                state_dict = checkpoint["model_state_dict"]
            else:
                state_dict = checkpoint
                
            self.model.load_state_dict(state_dict) # type: ignore
            
            # Set to evaluation mode
            self.model.eval() # type: ignore
        except Exception as e:
            raise RuntimeError(f"Failed to load model from Hugging Face Hub: {str(e)}")

    def is_loaded(self) -> bool:
        """Returns True if the model is currently loaded in memory"""
        return self.model is not None

    def predict(self, tensor) -> InferenceResult:
        """
        Runs the tensor through the model, averaging the softmax probabilities across windows,
        and generates the final InferenceResult.
        """
        
        if not self.is_loaded():
            raise HTTPException(status_code=503, detail="Model is not loaded.")
            
        # Optional safeguard if assertion is missed
        assert self.model is not None

        import torch
        with torch.no_grad():
            # tensor is expected to be shape (N, 256, 6)
            task1_logits, task2_logits = self.model(tensor) # type: ignore
            
            # Calculate probabilities per window via Softmax
            task1_probs_all_windows = torch.softmax(task1_logits, dim=1) # (N, 2)
            task2_probs_all_windows = torch.softmax(task2_logits, dim=1) # (N, 2)
            
            # Aggregate across all N windows
            task1_probs = task1_probs_all_windows.mean(dim=0).cpu().tolist() # [p_HC, p_PD]
            task2_probs = task2_probs_all_windows.mean(dim=0).cpu().tolist() # [p_PD, p_DD]

            # Argmax Labels
            task1_label = "HC" if task1_probs[0] > task1_probs[1] else "PD"
            task2_label = "PD" if task2_probs[0] > task2_probs[1] else "DD"
            
            windows_analysed = tensor.shape[0]
            
            return InferenceResult(
                task1_probs=task1_probs,
                task2_probs=task2_probs,
                task1_label=task1_label,
                task2_label=task2_label,
                windows_analysed=windows_analysed
            )
