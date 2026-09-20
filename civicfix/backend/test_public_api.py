import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def get_json(path):
    req = urllib.request.Request(f"{BASE_URL}{path}", method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def verify_public_endpoints():
    print("==================================================")
    print("CIVICFIX PUBLIC API VERIFICATION")
    print("==================================================")

    # 1. /api/public/stats
    print("\n[1] Testing GET /api/public/stats...")
    stats = get_json("/api/public/stats")
    print(f" -> Total Reported: {stats['total_reported']}")
    print(f" -> Total Solved:   {stats['total_solved']}")
    print(f" -> Wards Covered:  {stats['wards_covered']}")
    print(f" -> Active Depts:   {stats['active_departments']}")
    print(f" -> Resolution Rate:{stats['resolution_rate']}%")
    assert "total_reported" in stats
    assert "total_solved" in stats
    assert "wards_covered" in stats
    assert "active_departments" in stats

    # 2. /api/public/impact
    print("\n[2] Testing GET /api/public/impact...")
    impact = get_json("/api/public/impact")
    print(f" -> Problems Solved:     {impact['problems_solved']}")
    print(f" -> Resolution Rate:     {impact['resolution_rate']}%")
    print(f" -> Avg Resolution Time: {impact['avg_resolution_hours']} hrs")
    print(f" -> Citizen Rating:      {impact['citizen_satisfaction']} / 5.0")
    print(f" -> Water Saved:         {impact['water_saved_liters']} L")
    print(f" -> Garbage Cleared:     {impact['garbage_cleared_tons']} Tons")
    assert "problems_solved" in impact
    assert "avg_resolution_hours" in impact

    # 3. /api/public/categories
    print("\n[3] Testing GET /api/public/categories...")
    cats = get_json("/api/public/categories")
    print(f" -> Retrieved {len(cats)} categories:")
    for c in cats:
        print(f"    - {c['label']}: {c['solved']}/{c['total']} solved ({c['pct']}%)")
    assert len(cats) > 0

    # 4. /api/public/map
    print("\n[4] Testing GET /api/public/map (Privacy-Safe GeoJSON)...")
    geojson = get_json("/api/public/map")
    assert geojson["type"] == "FeatureCollection"
    features = geojson["features"]
    print(f" -> Total GeoJSON Points: {len(features)}")
    
    # Verify strict privacy guarantee: NO user_id, NO phone, NO user names!
    for f in features:
        props = f["properties"]
        assert "phone" not in props, "Privacy violation: phone exposed!"
        assert "user_id" not in props, "Privacy violation: user_id exposed!"
        assert "name" not in props, "Privacy violation: citizen name exposed!"
        assert "id" in props
        assert "category" in props
        assert "status" in props

    print(" -> Strict Privacy Check PASSED: 0 personal fields leaked.")

    print("\n==================================================")
    print("ALL PUBLIC API ENDPOINTS VERIFIED & READY! 100% OK")
    print("==================================================")

if __name__ == "__main__":
    verify_public_endpoints()
