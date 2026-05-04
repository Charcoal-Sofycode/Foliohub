import random

def generate_automatic_audio_proof(title, description):
    """
    Simulates an AI analyzing the audio and generating a proof object.
    In a real production app, this would call a model like OpenAI or analyze
    the audio file with FFmpeg/Librosa.
    """
    
    # Outcomes/Verdicts based on keywords
    verdicts = [
        "Professional Grade", 
        "Broadcast Ready", 
        "Cinematic Balance", 
        "Studio Standard"
    ]
    
    # Potential checklist items
    all_checks = [
        "Dialogue clarity peaks at -3dB",
        "Zero interference from wind noise",
        "Subtle room reverb matching",
        "Background noise floor below -60dB",
        "Sibilance (Essing) controlled",
        "Music ducking active (Sidechain)",
        "Phase alignment verified",
        "Stereo width optimized"
    ]
    
    # Potential spotlight labels
    all_spotlights = [
        "Hum removal",
        "Dialogue EQ boost",
        "Foley integration",
        "Wind noise suppression",
        "Musical ducking point",
        "Bass clarity fix",
        "Reverb matching"
    ]
    
    # Generate some semi-random but realistic data
    status = random.choice(verdicts)
    checks = random.sample(all_checks, 3)
    
    # Summary generation
    summary_templates = [
        f"Optimized the dialogue for maximum clarity. {status} achieved through precision EQ and noise reduction.",
        f"Balanced the soundscape to ensure {status}. Focus was placed on voice presence and background harmony.",
        f"Cleaned up location recording to reach {status}. Removed artifacts and enhanced the primary speaker."
    ]
    
    # Spotlight times (random positions in a typical short video)
    spotlights = [
        {"time": 2, "label": random.choice(all_spotlights)},
        {"time": 8, "label": random.choice(all_spotlights)},
        {"time": 15, "label": random.choice(all_spotlights)}
    ]
    
    metrics = [
        {"label": "Integrated Loudness", "value": f"-{random.randint(20, 24)} LUFS"},
        {"label": "True Peak", "value": f"-{random.uniform(1.0, 2.0):.1f} dBTP"},
        {"label": "Voice Clarity Index", "value": f"{random.randint(85, 98)}%"},
        {"label": "Background Noise", "value": f"-{random.randint(65, 80)} dB"}
    ]
    
    return {
        "summary": random.choice(summary_templates),
        "verdict": {
            "status": status,
            "checks": checks
        },
        "guidedPoints": [
            "Listen for the clarity in the mid-range frequencies.",
            "Compare the noise floor in quiet moments.",
            "Notice how the music complements the speech without overpowering it."
        ],
        "spotlights": spotlights,
        "metrics": metrics,
        "voiceUrl": None,
        "musicUrl": None
    }
