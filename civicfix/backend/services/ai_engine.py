import random
from typing import Dict, Optional

CATEGORY_LABELS = {
    "water_leakage": "Water Pipeline Leak",
    "garbage_accumulation": "Garbage Accumulation",
    "broken_water_pipe": "Broken Water Pipe",
    "drainage_blockage": "Drainage Blockage",
    "waterlogging": "Waterlogging / Flooding",
    "illegal_dumping": "Illegal Waste Dumping",
    "other": "Civic Issue",
}

SEVERITY_RULES = {
    "water_leakage":       ["MODERATE", "HIGH",     "HIGH",     "CRITICAL"],
    "garbage_accumulation":["LOW",       "LOW",      "MODERATE", "HIGH"],
    "broken_water_pipe":   ["HIGH",      "HIGH",     "CRITICAL", "CRITICAL"],
    "drainage_blockage":   ["MODERATE",  "MODERATE", "HIGH",     "HIGH"],
    "waterlogging":        ["MODERATE",  "HIGH",     "HIGH",     "CRITICAL"],
    "illegal_dumping":     ["LOW",       "MODERATE", "HIGH",     "HIGH"],
    "other":               ["LOW",       "LOW",      "MODERATE", "MODERATE"],
}

CATEGORY_DESCRIPTIONS = {
    "water_leakage": [
        "Water leakage detected from underground pipeline. Immediate attention required.",
        "Pipe leak causing water loss and potential road damage.",
        "Active water leak from municipal supply line detected.",
    ],
    "garbage_accumulation": [
        "Large accumulation of municipal solid waste posing health hazard.",
        "Overflowing garbage bins and scattered waste on road.",
        "Uncleared garbage pile causing environmental concern.",
    ],
    "broken_water_pipe": [
        "Burst water pipe causing localised flooding.",
        "Fractured main water supply pipe detected.",
        "Damaged pipeline requiring immediate emergency repair.",
    ],
    "drainage_blockage": [
        "Blocked storm drain causing water stagnation.",
        "Drainage system choked with debris — overflow risk.",
        "Clogged drain leading to waterlogging threat.",
    ],
    "waterlogging": [
        "Severe waterlogging affecting road access and pedestrian movement.",
        "Flooded area with stagnant water — mosquito breeding risk.",
        "Water accumulation causing traffic and civic disruption.",
    ],
    "illegal_dumping": [
        "Illegal waste disposal at this location — possible health hazard.",
        "Unauthorized dumping of construction debris.",
        "Chemical/industrial waste illegally dumped — needs urgent removal.",
    ],
    "other": [
        "Civic infrastructure issue detected at this location.",
        "Public amenity damage requiring municipal attention.",
        "General civic problem requiring immediate action.",
    ],
}

KEYWORDS_CRITICAL = ["burst", "flood", "overflow", "collapse", "major", "road blocked", "emergency", "huge"]
KEYWORDS_HIGH     = ["large", "multiple", "main road", "spreading", "worsening", "bad"]
KEYWORDS_LOW      = ["small", "minor", "slight", "little", "tiny"]


def classify_image(category: str, description: Optional[str] = None) -> Dict:
    """
    Mock AI classification engine.
    Replace body of this function with a Gemini Vision API call for production.
    """
    label       = CATEGORY_LABELS.get(category, "Civic Issue")
    confidence  = round(random.uniform(0.85, 0.97), 2)
    severity_pool = SEVERITY_RULES.get(category, ["LOW", "MODERATE", "HIGH", "CRITICAL"])
    severity    = random.choice(severity_pool)
    ai_desc     = random.choice(CATEGORY_DESCRIPTIONS.get(category, ["Issue detected."]))

    # Nudge severity based on description keywords
    if description:
        desc_lower = description.lower()
        if any(k in desc_lower for k in KEYWORDS_CRITICAL):
            severity   = "CRITICAL"
            confidence = min(confidence + 0.02, 0.99)
        elif any(k in desc_lower for k in KEYWORDS_HIGH):
            severity   = "HIGH"
        elif any(k in desc_lower for k in KEYWORDS_LOW):
            severity   = "LOW"

    return {
        "label":       label,
        "confidence":  confidence,
        "severity":    severity,
        "description": ai_desc,
    }


def verify_resolution(before_category: str, resolution_notes: Optional[str] = None) -> Dict:
    """
    Mock AI resolution verification.
    Replace with Gemini Vision before/after image comparison in production.
    """
    score    = round(random.uniform(0.82, 0.98), 2)
    verified = score > 0.75

    messages = {
        "water_leakage":        "Pipe repaired. No active leakage detected in after-photo.",
        "garbage_accumulation": "Area appears clean. Waste has been collected and removed.",
        "broken_water_pipe":    "Pipeline restored. Water flow normalised.",
        "drainage_blockage":    "Drain cleared. Water flow restored successfully.",
        "waterlogging":         "Water drained. Road surface visible and clear.",
        "illegal_dumping":      "Dumped waste removed. Area cleaned and disinfected.",
        "other":                "Issue appears resolved based on after-photo analysis.",
    }

    return {
        "score":    score,
        "verified": verified,
        "notes":    messages.get(before_category, "Issue appears resolved."),
    }
