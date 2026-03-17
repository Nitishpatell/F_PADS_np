"""
HierarchicalTransformer — matches the architecture of the trained best_model.pth checkpoint.

Architecture (from state_dict analysis):
  1. left_projection / right_projection: Linear(6, 128)  — project 6-ch sensor data to d_model
  2. positional_encoding: learned PE [256, 128]  — added to each window (256 timesteps)
  3. window_layers (×2): dual-stream cross-attention + self-attention + FFN per wrist
  4. Concat left+right → d=256
  5. window_positional_encoding: [100, 256]  — added across windows
  6. task_layers (×2): self-attention + FFN on the window sequence (d=256)
  7. task_attention_pooling: Linear(256, 1)  — attention-weighted pool across windows
  8. head_hc_vs_pd: Linear(256,128) → ReLU → Dropout → Linear(128,2)
  9. head_pd_vs_dd: Linear(256,128) → ReLU → Dropout → Linear(128,2)
"""

import math
import torch
import torch.nn as nn


class FeedForward(nn.Module):
    """FFN block: linear1 → ReLU → linear2, with pre-norm (layer_norm)."""
    def __init__(self, d_model: int, d_ff: int, dropout: float = 0.1):
        super().__init__()
        self.linear1 = nn.Linear(d_model, d_ff)
        self.linear2 = nn.Linear(d_ff, d_model)
        self.layer_norm = nn.LayerNorm(d_model)
        self.dropout = nn.Dropout(dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        residual = x
        x = self.layer_norm(x)
        x = self.linear1(x)
        x = torch.relu(x)
        x = self.dropout(x)
        x = self.linear2(x)
        x = self.dropout(x)
        return residual + x


class WindowLayer(nn.Module):
    """
    One window-level processing layer for dual-stream (left/right wrist).
    Each layer has:
      - cross_attention_1to2 (left attends to right)
      - cross_attention_2to1 (right attends to left)
      - self_attention_1 (left self-attn)
      - self_attention_2 (right self-attn)
      - norm_cross_1, norm_cross_2, norm_self_1, norm_self_2
      - feed_forward_1, feed_forward_2
    """
    def __init__(self, d_model: int = 128, nhead: int = 8, d_ff: int = 512, dropout: float = 0.1):
        super().__init__()
        # Cross-attention
        self.cross_attention_1to2 = nn.MultiheadAttention(d_model, nhead, dropout=dropout, batch_first=True)
        self.cross_attention_2to1 = nn.MultiheadAttention(d_model, nhead, dropout=dropout, batch_first=True)

        # Self-attention
        self.self_attention_1 = nn.MultiheadAttention(d_model, nhead, dropout=dropout, batch_first=True)
        self.self_attention_2 = nn.MultiheadAttention(d_model, nhead, dropout=dropout, batch_first=True)

        # Layer norms
        self.norm_cross_1 = nn.LayerNorm(d_model)
        self.norm_cross_2 = nn.LayerNorm(d_model)
        self.norm_self_1 = nn.LayerNorm(d_model)
        self.norm_self_2 = nn.LayerNorm(d_model)

        # Feed-forward
        self.feed_forward_1 = FeedForward(d_model, d_ff, dropout)
        self.feed_forward_2 = FeedForward(d_model, d_ff, dropout)

    def forward(self, x1: torch.Tensor, x2: torch.Tensor):
        # Cross-attention (each attends to the other)
        ca1, _ = self.cross_attention_1to2(x1, x2, x2)
        x1 = self.norm_cross_1(x1 + ca1)

        ca2, _ = self.cross_attention_2to1(x2, x1, x1)
        x2 = self.norm_cross_2(x2 + ca2)

        # Self-attention
        sa1, _ = self.self_attention_1(x1, x1, x1)
        x1 = self.norm_self_1(x1 + sa1)

        sa2, _ = self.self_attention_2(x2, x2, x2)
        x2 = self.norm_self_2(x2 + sa2)

        # FFN
        x1 = self.feed_forward_1(x1)
        x2 = self.feed_forward_2(x2)

        return x1, x2


class TaskLayer(nn.Module):
    """Task-level transformer layer: self-attention + FFN on the window sequence."""
    def __init__(self, d_model: int = 256, nhead: int = 8, d_ff: int = 512, dropout: float = 0.1):
        super().__init__()
        self.self_attention = nn.MultiheadAttention(d_model, nhead, dropout=dropout, batch_first=True)
        self.norm = nn.LayerNorm(d_model)
        self.feed_forward = FeedForward(d_model, d_ff, dropout)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        sa, _ = self.self_attention(x, x, x)
        x = self.norm(x + sa)
        x = self.feed_forward(x)
        return x


class HierarchicalTransformer(nn.Module):
    """
    Dual-stream Hierarchical Transformer for Parkinson's classification.

    Input: tensor of shape (N, 256, 6) where N = number of windows,
           256 = timesteps per window, 6 = sensor channels.

    The model splits windows into left/right wrist pairs (even/odd or first/second half),
    processes them with cross-attention, concatenates, runs task-level attention,
    and produces two binary classification outputs.
    """

    def __init__(self, config=None):
        super().__init__()
        if config is None:
            config = {}

        d_model = config.get("d_model", 128)
        nhead = config.get("nhead", 8)
        d_ff = config.get("d_ff", 512)
        num_window_layers = config.get("num_window_layers", 2)
        num_task_layers = config.get("num_task_layers", 2)
        dropout = config.get("dropout", 0.1)
        max_window_len = config.get("max_window_len", 256)
        max_windows = config.get("max_windows", 100)

        # Input projections (6 channels → d_model)
        self.left_projection = nn.Linear(6, d_model)
        self.right_projection = nn.Linear(6, d_model)

        # Positional encoding within a window (256 timesteps)
        self.positional_encoding = nn.Embedding(max_window_len, d_model)
        # Register a buffer so state_dict has "positional_encoding.pe" matching the checkpoint key:
        # Actually the checkpoint stores it as positional_encoding.pe with shape [256, 128]
        # We'll use a parameter buffer instead
        self.positional_encoding = _PositionalBuffer(max_window_len, d_model)

        # Window-level dual-stream layers
        self.window_layers = nn.ModuleList([
            WindowLayer(d_model, nhead, d_ff, dropout)
            for _ in range(num_window_layers)
        ])

        # After window processing, concat left+right → d_model*2
        d_task = d_model * 2  # 256

        # Window positional encoding (across windows)
        self.window_positional_encoding = _PositionalBuffer(max_windows, d_task)

        # Task-level layers
        self.task_layers = nn.ModuleList([
            TaskLayer(d_task, nhead, d_ff, dropout)
            for _ in range(num_task_layers)
        ])

        # Attention pooling
        self.task_attention_pooling = nn.Sequential(
            nn.Linear(d_task, 1),
        )

        # Classification heads
        self.head_hc_vs_pd = nn.Sequential(
            nn.Linear(d_task, d_model),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 2),
        )

        self.head_pd_vs_dd = nn.Sequential(
            nn.Linear(d_task, d_model),
            nn.ReLU(),
            nn.Dropout(dropout),
            nn.Linear(d_model, 2),
        )

    def forward(self, x: torch.Tensor):
        """
        x: (N, 256, 6) — N windows of 256 timesteps × 6 sensor channels.

        When N is even, first half = left wrist, second half = right wrist.
        When N is odd, duplicate last window to make even, then split.
        """
        N = x.shape[0]

        # Split into left/right halves
        if N == 1:
            x_left = x  # (1, 256, 6)
            x_right = x  # duplicate
        else:
            half = N // 2
            x_left = x[:half]   # (half, 256, 6)
            x_right = x[half:half * 2]  # (half, 256, 6)

        # Ensure same number of windows
        min_n = min(x_left.shape[0], x_right.shape[0])
        x_left = x_left[:min_n]
        x_right = x_right[:min_n]

        # Project inputs
        h_left = self.left_projection(x_left)    # (W, 256, d_model)
        h_right = self.right_projection(x_right)  # (W, 256, d_model)

        # Add positional encoding
        pe = self.positional_encoding(h_left.shape[1])  # (256, d_model)
        h_left = h_left + pe.unsqueeze(0)
        h_right = h_right + pe.unsqueeze(0)

        # Window-level processing (per-window, batch over windows)
        for layer in self.window_layers:
            h_left, h_right = layer(h_left, h_right)

        # Pool over timesteps within each window → (W, d_model) each
        h_left = h_left.mean(dim=1)   # (W, d_model)
        h_right = h_right.mean(dim=1)  # (W, d_model)

        # Concatenate left + right → (W, d_model*2)
        h = torch.cat([h_left, h_right], dim=-1)  # (W, 256)

        # Add window positional encoding
        W = h.shape[0]
        wpe = self.window_positional_encoding(W)  # (W, 256)
        h = h + wpe[:W]

        # Add batch dimension for task layers: (1, W, 256)
        h = h.unsqueeze(0)

        # Task-level processing
        for layer in self.task_layers:
            h = layer(h)

        # Attention pooling
        attn_weights = self.task_attention_pooling(h)  # (1, W, 1)
        attn_weights = torch.softmax(attn_weights, dim=1)
        h = (h * attn_weights).sum(dim=1)  # (1, 256)

        # Classification
        task1_logits = self.head_hc_vs_pd(h)  # (1, 2)
        task2_logits = self.head_pd_vs_dd(h)  # (1, 2)

        return task1_logits, task2_logits


class _PositionalBuffer(nn.Module):
    """Stores positional encoding as a learnable-like buffer matching checkpoint format."""
    def __init__(self, max_len: int, d_model: int):
        super().__init__()
        pe = torch.zeros(max_len, d_model)
        position = torch.arange(0, max_len, dtype=torch.float).unsqueeze(1)
        div_term = torch.exp(torch.arange(0, d_model, 2).float() * (-math.log(10000.0) / d_model))
        pe[:, 0::2] = torch.sin(position * div_term)
        if d_model % 2 == 0:
            pe[:, 1::2] = torch.cos(position * div_term)
        else:
            pe[:, 1::2] = torch.cos(position * div_term[:d_model // 2])
        self.register_buffer('pe', pe)

    def forward(self, length: int) -> torch.Tensor:
        return self.pe[:length]  # type: ignore
