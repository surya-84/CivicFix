import sys
import os
import requests

BASE_URL = "http://127.0.0.1:8000"

def test_admin_hierarchy():
    print("=== Testing CivicFix Admin Hierarchy & Governance ===")

    # 1. Super Admin Login
    print("\n1. Super Admin Login...")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "login_id": "ADM-000001",
        "password": "admin123",
        "role": "admin"
    })
    assert res.status_code == 200, f"Super Admin login failed: {res.text}"
    super_admin_token = res.json()["access_token"]
    user_info = res.json()
    assert user_info["admin_level"] == "SUPER_ADMIN", "Expected SUPER_ADMIN level"
    print(f"   [PASS] Logged in as Super Admin: {user_info['name']} ({user_info['admin_code']})")

    # 2. Super Admin creates Co-Admin
    print("\n2. Super Admin creating Co-Admin...")
    headers_sa = {"Authorization": f"Bearer {super_admin_token}"}
    create_payload = {
        "name": "Test Co-Admin",
        "phone": "9998887771",
        "email": "testcoadmin@kmc.gov.in",
        "admin_level": "CO_ADMIN",
        "permissions": ["VIEW_COMPLAINTS", "MANAGE_COMPLAINTS", "VIEW_ANALYTICS"],
    }
    res = requests.post(f"{BASE_URL}/api/admin/admins", json=create_payload, headers=headers_sa)
    assert res.status_code == 200, f"Create co-admin failed: {res.text}"
    co_admin_data = res.json()
    created_code = co_admin_data["admin_code"]
    temp_password = co_admin_data["temporary_password"]
    assert created_code.startswith("ADM-"), f"Invalid code format: {created_code}"
    assert len(temp_password) >= 10, "Temporary password too short"
    assert co_admin_data["must_change_password"] is True
    print(f"   [PASS] Created Co-Admin: {created_code} with temp password: {temp_password}")

    # 3. Co-Admin Login with Temporary Password
    print("\n3. Co-Admin Login with Temporary Password...")
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "login_id": created_code,
        "password": temp_password,
        "role": "admin"
    })
    assert res.status_code == 200, f"Co-Admin login failed: {res.text}"
    co_admin_token = res.json()["access_token"]
    assert res.json()["must_change_password"] is True, "Expected must_change_password to be True"
    print("   [PASS] Co-Admin logged in successfully; must_change_password is True")

    # 4. Co-Admin tries to create another admin (Security Check: MUST FAIL 403)
    print("\n4. Co-Admin attempting to create an admin (Must be blocked with 403)...")
    headers_ca = {"Authorization": f"Bearer {co_admin_token}"}
    res = requests.post(f"{BASE_URL}/api/admin/admins", json={
        "name": "Illegal Admin",
        "phone": "9998887772",
        "admin_level": "CO_ADMIN",
        "permissions": ["VIEW_COMPLAINTS"]
    }, headers=headers_ca)
    assert res.status_code == 403, f"Expected 403 Forbidden, got {res.status_code}: {res.text}"
    print(f"   [PASS] Security enforced: Co-Admin blocked with 403 Forbidden ({res.json()['detail']})")

    # 5. Co-Admin changes mandatory password
    print("\n5. Co-Admin performs mandatory password change...")
    new_password = "NewPassword123!"
    res = requests.post(f"{BASE_URL}/api/auth/change-password", json={
        "old_password": temp_password,
        "new_password": new_password
    }, headers=headers_ca)
    assert res.status_code == 200, f"Change password failed: {res.text}"
    assert res.json()["must_change_password"] is False
    print("   [PASS] Password changed. must_change_password is now False")

    # Verify Co-Admin can login with new password
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "login_id": created_code,
        "password": new_password,
        "role": "admin"
    })
    assert res.status_code == 200, "Login with new password failed"
    print("   [PASS] Successfully logged in with new password")

    # 6. Super Admin disables Co-Admin
    print("\n6. Super Admin disables Co-Admin...")
    res = requests.patch(f"{BASE_URL}/api/admin/admins/{created_code}/status", headers=headers_sa)
    assert res.status_code == 200, f"Disable failed: {res.text}"
    assert res.json()["is_active"] is False
    print(f"   [PASS] Administrator {created_code} is now deactivated")

    # Verify disabled Co-Admin login is rejected with 403
    res = requests.post(f"{BASE_URL}/api/auth/login", json={
        "login_id": created_code,
        "password": new_password,
        "role": "admin"
    })
    assert res.status_code == 403, f"Expected 403 Forbidden for disabled user, got {res.status_code}"
    print(f"   [PASS] Login rejected for disabled admin: {res.json()['detail']}")

    # 7. Check Audit Logs
    print("\n7. Fetching Admin Audit Trail...")
    res = requests.get(f"{BASE_URL}/api/admin/audit-logs", headers=headers_sa)
    assert res.status_code == 200, f"Failed to fetch audit logs: {res.text}"
    logs = res.json()
    assert len(logs) >= 3, "Expected at least 3 audit log entries"
    actions = [log["action"] for log in logs]
    assert "CREATE_CO_ADMIN" in actions
    assert "DISABLE_ADMIN" in actions
    print(f"   [PASS] Found {len(logs)} audit entries. Latest actions: {actions[:5]}")

    print("\n========================================================")
    print("ALL ADMIN HIERARCHY & GOVERNANCE TESTS PASSED (7/7)! ??")
    print("========================================================")

if __name__ == "__main__":
    test_admin_hierarchy()
