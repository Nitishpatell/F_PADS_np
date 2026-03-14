import torch
import torch.nn as nn

class TransformerEncoderPooling(nn.Module):
    def __init__(self, d_model=128, nhead=8, num_layers=4, dropout=0.1):
        super().__init__()
        self.embedding = nn.Linear(6, d_model)
        self.pos_encoder = PositionalEncoding(d_model, max_len=256)
        
        encoder_layer = nn.TransformerEncoderLayer(d_model, nhead, dim_feedforward=d_model*4, dropout=dropout, batch_first=True)
        self.transformer_encoder = nn.TransformerEncoder(encoder_layer, num_layers=num_layers)

    def forward(self, x):
        # x is (B, 256, 6)
        x = self.embedding(x)
        x = self.pos_encoder(x)
        x = self.transformer_encoder(x)
        # Average pooling over the 256 steps
        return x.mean(dim=1)


class PositionalEncoding(nn.Module):
    def __init__(self, d_model, max_len=5000):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        import math
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        pe[:, 1::2] = torch.cos(position * div_term)
        pe = pe.unsqueeze(0)
        self.register_buffer('pe', pe)

    def forward(self, x):
        return x + self.pe[:, :x.size(1), :]


class HierarchicalTransformer(nn.Module):
    def __init__(self, config=None):
        super().__init__()
        if config is None:
            config = {
                "d_model": 128,
                "nhead": 8,
                "num_encoder_layers": 4,
                "num_cross_attn_layers": 2,
                "dropout": 0.1
            }
            
        d_model = config["d_model"]
        
        self.local_encoder = TransformerEncoderPooling(
            d_model=d_model,
            nhead=config["nhead"],
            num_layers=config["num_encoder_layers"],
            dropout=config["dropout"]
        )
        
        cross_layer = nn.TransformerEncoderLayer(
            d_model=d_model, 
            nhead=config["nhead"], 
            dim_feedforward=d_model*4, 
            dropout=config["dropout"], 
            batch_first=True
        )
        self.cross_attention = nn.TransformerEncoder(cross_layer, num_layers=config["num_cross_attn_layers"])
        
        self.task1_head = nn.Linear(d_model, 2)
        self.task2_head = nn.Linear(d_model, 2)

    def forward(self, x):
        # x shape expects: (N, 256, 6)
        # We need to process each window through the local encoder
        # Then we aggregate windows using cross attention
        # However, if N windows are passed, typically we run them through local individually, then treat N as sequence length.
        # So x is essentially (N, 256, 6) -> local_encoder -> (N, d_model)
        
        # Batch size for local encoder is N
        local_features = self.local_encoder(x) # (N, d_model)
        
        # To apply cross-attention across N windows, we need shape (1, N, d_model)
        local_features = local_features.unsqueeze(0)
        
        global_features = self.cross_attention(local_features) # (1, N, d_model)
        global_features = global_features.squeeze(0) # (N, d_model)
        
        task1_logits = self.task1_head(global_features) # (N, 2)
        task2_logits = self.task2_head(global_features) # (N, 2)
        
        return task1_logits, task2_logits
