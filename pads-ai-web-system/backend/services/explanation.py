from google import genai
import logging
from typing import Optional
from schemas.prediction import InferenceResult,Session

logger = logging.getLogger(__name__)

class ExplanationService:
    def __init__(self, api_key: str, model_name: str = "gemini-2.0-flash"):
        """Initializes the Google GenAI client with the provided API key."""
        self.client = None
        self.model_name = model_name
        self.api_key_configured = bool(api_key)
        
        if self.api_key_configured:
            try:
                self.client = genai.Client(api_key=api_key)
            except Exception as e:
                logger.error(f"Failed to initialize Gemini Client: {str(e)}")
                self.api_key_configured = False

    def explain(self, inference_result: InferenceResult, session_name: str) -> str:
        """
        Generates a natural language explanation for the prediction using Gemini.
        Returns a fallback string if the API call fails or is not configured.
        """
        if not self.api_key_configured or self.client is None:
            return self._get_fallback_explanation(inference_result, session_name, "Gemini Client not initialized.")

        # Extract probabilities and labels
        p_hc, p_pd_1 = inference_result.task1_probs
        p_pd_2, p_dd = inference_result.task2_probs
        
        conf_1 = max(inference_result.task1_probs)
        conf_2 = max(inference_result.task2_probs)
        
        # Build warning if confidence is low
        warning = ""
        if conf_1 < 0.5 or conf_2 < 0.5:
            warning = "⚠️ LOW CONFIDENCE WARNING: One or more classification tasks produced a confidence score below 50%. Clinical review is strongly recommended."

        # Build the prompt
        prompt = f"""
As a Parkinson's Disease (PD) Researcher, explain the following AI classification result from a Hierarchical Transformer model.
The model analyzed smartwatch accelerometer and gyroscope data from a patient during a "{session_name}" activity.

Analysis Metadata:
- Windows Analyzed: {inference_result.windows_analysed}
- Activity: {session_name}

Classification Results:
1. Task 1 (Healthy Control vs. Parkinson's Disease): {inference_result.task1_label}
   - HC Probability: {p_hc:.2%}
   - PD Probability: {p_pd_1:.2%}
2. Task 2 (Parkinson's Disease vs. Differential Diagnosis): {inference_result.task2_label}
   - PD Probability: {p_pd_2:.2%}
   - DD Probability: {p_dd:.2%}

{warning}

Provide a concise medical explanation (around 100-150 words) of what these results might indicate regarding the patient's motor symptoms, tremor, or gait patterns observed during the "{session_name}" session. 
Focus on the implications for clinical research and the difference between the two tasks.
Do NOT mention any specific patient names or IDs.
"""

        try:
            if self.client is None or not hasattr(self.client, 'models'):
                return self._get_fallback_explanation(inference_result, session_name, "Gemini Client not initialized or invalid.")
                
            # Generate content
            response = self.client.models.generate_content(
                model=self.model_name,
                contents=prompt,
                config={
                    "max_output_tokens": 500,
                    "temperature": 0.4,
                }
            )
            
            if response and response.text:
                return response.text.strip()
            else:
                return self._get_fallback_explanation(inference_result, session_name, "Empty response from Gemini.")

        except Exception as e:
            logger.error(f"Gemini API Error: {str(e)}")
            return self._get_fallback_explanation(inference_result, session_name, str(e))

    def _get_fallback_explanation(self, result: InferenceResult, session_name: str, reason: str) -> str:
        """Provides a basic template-based explanation if the LLM fails."""
        return (
            f"The AI model analyzed {result.windows_analysed} windows of sensor data from the '{session_name}' session. "
            f"For the primary screening (Task 1), it identified the patient as '{result.task1_label}' "
            f"with {max(result.task1_probs):.1%} confidence. In the differential analysis (Task 2), the classification was '{result.task2_label}' "
            f"with {max(result.task2_probs):.1%} confidence. [Note: Automatic medical explanation unavailable: {reason}]"
        )
