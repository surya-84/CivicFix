import urllib.request
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def post_json(path, data, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode("utf-8"),
        headers=headers,
        method="POST"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def patch_json(path, data, headers=None):
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=json.dumps(data).encode("utf-8"),
        headers=headers,
        method="PATCH"
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def get_json(path, headers=None):
    if headers is None:
        headers = {}
    req = urllib.request.Request(f"{BASE_URL}{path}", headers=headers, method="GET")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))

def run_verification():
    print("==================================================")
    print("CIVICFIX VOLUNTEER & WORKER PORTAL E2E VERIFICATION")
    print("==================================================")

    # 1. Submit volunteer application
    test_phone = "9876500001"
    test_pw = "pass1234"
    app_payload = {
        "name": "Naveen Chowdary",
        "phone": test_phone,
        "email": "naveen.c@example.com",
        "dob": "1997-06-15",
        "city": "Kakinada",
        "ward": "5",
        "address": "Opposite Sub Collector Office, Ward 5, Kakinada",
        "department": "Water Works",
        "skills": "Pipeline Maintenance, Leakage Detection",
        "availability": "Morning",
        "reason": "I want to help conserve municipal water and fix drinking water leakages in Ward 5.",
        "password": test_pw
    }
    
    print("\n[Step 1] Submitting volunteer application for Naveen Chowdary...")
    app_res = post_json("/api/volunteers/register", app_payload)
    app_id = app_res["application_id"]
    print(f" -> Application Created: {app_id} (Status: {app_res['status']})")
    assert app_res["status"] == "pending", "Status should be pending"

    # 2. Check public status endpoint
    print("\n[Step 2] Testing public status lookup...")
    status_res = get_json(f"/api/volunteers/status?application_id={app_id}")
    print(f" -> Status lookup: Name={status_res['name']}, Status={status_res['status']}, Dept={status_res['department']}")
    assert status_res["status"] == "pending"

    # 3. Verify unapproved applicant CANNOT log in as worker
    print("\n[Step 3] Verifying unapproved applicant cannot log into Worker Portal...")
    try:
        post_json("/api/auth/login", {"phone": test_phone, "password": test_pw})
        print(" -> ERROR: Unapproved user was able to log in!")
        sys.exit(1)
    except urllib.error.HTTPError as e:
        print(f" -> Access correctly blocked with HTTP {e.code}: {e.reason}")
        assert e.code == 403 or e.code == 400

    # 4. Admin logs in
    print("\n[Step 4] Municipal Admin logs in...")
    admin_login = post_json("/api/auth/login", {"phone": "9000000003", "password": "admin123"})
    admin_token = admin_login["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print(f" -> Admin authenticated. Token acquired.")

    # 5. Admin lists volunteer applications
    print("\n[Step 5] Admin views pending volunteer applications...")
    apps_list = get_json("/api/volunteers/admin/list?status=pending", headers=admin_headers)
    target_app = next((a for a in apps_list if a["application_id"] == app_id), None)
    assert target_app is not None, "Submitted application must be visible in admin list"
    print(f" -> Found application {app_id} in admin pending queue (Total pending: {len(apps_list)})")

    # 6. Admin approves the application
    print(f"\n[Step 6] Admin approves application {app_id}...")
    approve_res = patch_json(
        f"/api/volunteers/admin/{app_id}/approve",
        {"admin_notes": "Approved for Water Works Team Ward 5", "ward_number": "5"},
        headers=admin_headers
    )
    generated_wrk_id = approve_res["worker_id"]
    print(f" -> APPROVED! Generated Worker ID: {generated_wrk_id}")
    assert generated_wrk_id.startswith("WRK-"), "Worker ID must start with WRK-"

    # 7. Approved volunteer logs in with their newly assigned Worker ID!
    print(f"\n[Step 7] Newly approved worker logs in with Worker ID {generated_wrk_id}...")
    worker_login = post_json("/api/auth/login", {"phone": generated_wrk_id, "password": test_pw})
    print(f" -> LOGIN SUCCESSFUL! Role: {worker_login['role']}, Worker Code: {worker_login['worker_code']}")
    assert worker_login["role"] == "worker"
    assert worker_login["worker_code"] == generated_wrk_id

    # 8. Newly approved worker also can log in with phone number
    print(f"\n[Step 8] Newly approved worker logs in with Phone Number {test_phone}...")
    worker_login_phone = post_json("/api/auth/login", {"phone": test_phone, "password": test_pw})
    assert worker_login_phone["role"] == "worker"
    assert worker_login_phone["worker_code"] == generated_wrk_id
    print(" -> Phone number login also verified successfully!")

    print("\n==================================================")
    print("ALL VOLUNTEER & WORKER PORTAL TESTS PASSED! 100% OK")
    print("==================================================")

if __name__ == "__main__":
    run_verification()
