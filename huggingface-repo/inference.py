import torch
from model import HierarchicalTransformer

device = torch.device("cpu")

model = HierarchicalTransformer()
model.load_state_dict(torch.load("best_model.pth", map_location=device, weights_only=True))
model.eval()

def predict(input_tensor):
    with torch.no_grad():
        logits_hc_vs_pd, logits_pd_vs_dd = model(input_tensor)
    return logits_hc_vs_pd, logits_pd_vs_dd
