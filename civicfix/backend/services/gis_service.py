from typing import Dict

# ---------------------------------------------------------------------------
# Mock ward data — Kakinada Municipal Corporation (16.98°N, 82.24°E area)
# ---------------------------------------------------------------------------
WARDS: Dict[str, dict] = {
    "1": {
        "name": "Ward 1 – Suryaraopet",
        "municipality": "Kakinada Municipal Corporation",
        "lat_range": (16.94, 16.96),
        "lng_range": (82.21, 82.23),
        "officer": "Sri. K. Ramaiah",
        "departments": {
            "sanitation": "Sanitation Dept – KMC Ward 1",
            "water":      "Water Works Dept – KMC Ward 1",
            "roads":      "Roads & Buildings – KMC Ward 1",
            "drainage":   "Drainage Dept – KMC Ward 1",
        },
    },
    "2": {
        "name": "Ward 2 – Rajaji Street",
        "municipality": "Kakinada Municipal Corporation",
        "lat_range": (16.96, 16.98),
        "lng_range": (82.23, 82.25),
        "officer": "Sri. P. Venkatesh",
        "departments": {
            "sanitation": "Sanitation Dept – KMC Ward 2",
            "water":      "Water Works Dept – KMC Ward 2",
            "roads":      "Roads & Buildings – KMC Ward 2",
            "drainage":   "Drainage Dept – KMC Ward 2",
        },
    },
    "3": {
        "name": "Ward 3 – Jagannaickpur",
        "municipality": "Kakinada Municipal Corporation",
        "lat_range": (16.98, 17.00),
        "lng_range": (82.24, 82.26),
        "officer": "Sri. M. Suresh Kumar",
        "departments": {
            "sanitation": "Sanitation Dept – KMC Ward 3",
            "water":      "Water Works Dept – KMC Ward 3",
            "roads":      "Roads & Buildings – KMC Ward 3",
            "drainage":   "Drainage Dept – KMC Ward 3",
        },
    },
    "4": {
        "name": "Ward 4 – Bhanugudi Junction",
        "municipality": "Kakinada Municipal Corporation",
        "lat_range": (16.99, 17.01),
        "lng_range": (82.25, 82.27),
        "officer": "Smt. A. Lakshmi Devi",
        "departments": {
            "sanitation": "Sanitation Dept – KMC Ward 4",
            "water":      "Water Works Dept – KMC Ward 4",
            "roads":      "Roads & Buildings – KMC Ward 4",
            "drainage":   "Drainage Dept – KMC Ward 4",
        },
    },
    "12": {
        "name": "Ward 12 – Main City Centre",
        "municipality": "Kakinada Municipal Corporation",
        "lat_range": (16.93, 17.02),
        "lng_range": (82.20, 82.30),
        "officer": "Sri. B. Nageswara Rao",
        "departments": {
            "sanitation": "Sanitation Dept – KMC Ward 12",
            "water":      "Water Works Dept – KMC Ward 12",
            "roads":      "Roads & Buildings – KMC Ward 12",
            "drainage":   "Drainage Dept – KMC Ward 12",
        },
    },
}

CATEGORY_TO_DEPT_KEY = {
    "water_leakage":        "water",
    "broken_water_pipe":    "water",
    "garbage_accumulation": "sanitation",
    "illegal_dumping":      "sanitation",
    "drainage_blockage":    "drainage",
    "waterlogging":         "drainage",
    "other":                "roads",
}

DEFAULT_WARD = "12"


def lookup_ward(latitude: float, longitude: float) -> Dict:
    """Return ward info dict for a GPS coordinate."""
    for ward_num, data in WARDS.items():
        lat_min, lat_max = data["lat_range"]
        lng_min, lng_max = data["lng_range"]
        if lat_min <= latitude <= lat_max and lng_min <= longitude <= lng_max:
            return {
                "ward_number":  ward_num,
                "ward_name":    data["name"],
                "municipality": data["municipality"],
                "officer":      data["officer"],
            }
    # Default fallback ward
    d = WARDS[DEFAULT_WARD]
    return {
        "ward_number":  DEFAULT_WARD,
        "ward_name":    d["name"],
        "municipality": d["municipality"],
        "officer":      d["officer"],
    }


def get_department_for_category(category: str, ward_number: str) -> str:
    dept_key = CATEGORY_TO_DEPT_KEY.get(category, "roads")
    ward     = WARDS.get(ward_number, WARDS[DEFAULT_WARD])
    return ward["departments"].get(dept_key, f"{dept_key.title()} Department – KMC")
