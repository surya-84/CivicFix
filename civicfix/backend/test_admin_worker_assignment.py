import os
import sys
import uuid
from fastapi.testclient import TestClient

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from main import app
from database import SessionLocal
import models
from routers.auth import hash_password

client = TestClient(app)

def test_full_admin_worker_assignment_flow():
    db = SessionLocal()
    try:
        print("\n=======================================================")
        print("STARTING FULL END-TO-END TEST SUITE")
        print("=======================================================")

        # -------------------------------------------------------------
        # STEP 1: SUPER ADMIN LOGIN
        # -------------------------------------------------------------
        print("\n--- STEP 1: Super Admin Login ---")
        super_admin_user = db.query(models.User).filter(
            models.User.role == "admin",
            models.User.admin_level == "SUPER_ADMIN"
        ).first()
        assert super_admin_user is not None, "Super admin user must exist in database"

        login_res = client.post("/api/auth/login", json={
            "phone": super_admin_user.phone,
            "password": "admin123"
        })
        assert login_res.status_code == 200, f"Super Admin login failed: {login_res.text}"
        super_admin_data = login_res.json()
        super_admin_token = super_admin_data["access_token"]
        super_admin_headers = {"Authorization": f"Bearer {super_admin_token}"}
        print(f"Super Admin logged in successfully: {super_admin_user.name} ({super_admin_user.phone})")

        # -------------------------------------------------------------
        # STEP 2: SUPER ADMIN CREATES CO-ADMIN WITH MANUAL PASSWORD
        # -------------------------------------------------------------
        print("\n--- STEP 2: Create Co-Admin with Manual Password ---")
        unique_suffix = str(uuid.uuid4())[:6]
        coadmin_phone = f"98{int(unique_suffix, 16) % 100000000:08d}"
        coadmin_email = f"coadmin_{unique_suffix}@kmc.gov.in"
        coadmin_name = f"Officer {unique_suffix}"
        temp_password = f"SecureAdmin@{unique_suffix}"

        create_res = client.post(
            "/api/admin/admins",
            headers=super_admin_headers,
            json={
                "name": coadmin_name,
                "phone": coadmin_phone,
                "email": coadmin_email,
                "department_id": 1,
                "admin_level": "CO_ADMIN",
                "permissions": ["VIEW_COMPLAINTS", "MANAGE_COMPLAINTS", "ASSIGN_WORKERS"],
                "password": temp_password,
            }
        )
        assert create_res.status_code == 200, f"Co-Admin creation failed: {create_res.text}"
        created_data = create_res.json()

        # Strict security assertions on API response:
        assert "temporary_password" not in created_data, "Plain text temporary password MUST NOT be returned in API response"
        assert created_data.get("status_message") == "Password set successfully by Super Admin"
        coadmin_code = created_data["admin_code"]
        print(f"Created Co-Admin {coadmin_code}. API Response verified secure (no plain password).")

        # DB Assertions:
        coadmin_db_user = db.query(models.User).filter(models.User.admin_code == coadmin_code).first()
        assert coadmin_db_user is not None
        assert coadmin_db_user.password_hash != temp_password, "Password in database MUST be hashed"
        assert temp_password not in coadmin_db_user.password_hash, "Plain password must not appear in hash"
        assert coadmin_db_user.must_change_password is True, "must_change_password must be True for newly created Co-Admin"

        # Audit Log Check:
        audit_log = db.query(models.AdminAuditLog).filter(
            models.AdminAuditLog.target_id == coadmin_code
        ).first()
        assert audit_log is not None
        assert temp_password not in (audit_log.details or ""), "Audit log must never log plain-text passwords"
        print("DB and Audit Log security checks passed: Password hashed, no plaintext leak.")

        # -------------------------------------------------------------
        # STEP 3: CO-ADMIN LOGIN VIA MULTI-IDENTIFIER & MANDATORY RESET
        # -------------------------------------------------------------
        print("\n--- STEP 3: Co-Admin Login (Admin ID, Phone, Email) ---")
        # 3a. Login via Admin Code
        res_code = client.post("/api/auth/login", json={"phone": coadmin_code, "password": temp_password})
        assert res_code.status_code == 200, f"Login via Admin ID failed: {res_code.text}"
        assert res_code.json()["must_change_password"] is True
        print(f"Login via Admin ID ({coadmin_code}) succeeded with must_change_password=True")

        # 3b. Login via Phone
        res_phone = client.post("/api/auth/login", json={"phone": coadmin_phone, "password": temp_password})
        assert res_phone.status_code == 200, f"Login via Phone failed: {res_phone.text}"
        print(f"Login via Phone ({coadmin_phone}) succeeded")

        # 3c. Login via Email
        res_email = client.post("/api/auth/login", json={"phone": coadmin_email, "password": temp_password})
        assert res_email.status_code == 200, f"Login via Email failed: {res_email.text}"
        print(f"Login via Email ({coadmin_email}) succeeded")

        coadmin_token = res_code.json()["access_token"]
        coadmin_headers = {"Authorization": f"Bearer {coadmin_token}"}

        # 3d. Mandatory Password Reset
        print("\n--- Mandatory Password Reset Test ---")
        new_password = f"NewPermSecret@{unique_suffix}"
        reset_res = client.post(
            "/api/auth/change-password",
            headers=coadmin_headers,
            json={
                "old_password": temp_password,
                "new_password": new_password,
            }
        )
        assert reset_res.status_code == 200, f"Password reset failed: {reset_res.text}"

        # Old password must now fail
        fail_login = client.post("/api/auth/login", json={"phone": coadmin_code, "password": temp_password})
        assert fail_login.status_code == 401, "Old password must no longer work"

        # New password must succeed and must_change_password is False
        succ_login = client.post("/api/auth/login", json={"phone": coadmin_code, "password": new_password})
        assert succ_login.status_code == 200
        assert succ_login.json()["must_change_password"] is False
        print("Password changed successfully and verified. Old password rejected.")

        # Update coadmin_headers with active token
        coadmin_headers = {"Authorization": f"Bearer {succ_login.json()['access_token']}"}

        # -------------------------------------------------------------
        # STEP 4: WORKER ROSTER & VOLUNTEER APPROVAL FLOW
        # -------------------------------------------------------------
        print("\n--- STEP 4: Worker Roster & Approval Flow ---")
        # Query /api/admin/workers as Super Admin
        workers_res = client.get("/api/admin/workers", headers=super_admin_headers)
        assert workers_res.status_code == 200, f"Failed to list workers: {workers_res.text}"
        workers_list = workers_res.json()
        print(f"Super Admin retrieved {len(workers_list)} eligible workers from /api/admin/workers.")

        # Query /api/admin/workers as Co-Admin (Dept 1) -> must only see Dept 1 workers
        coadmin_workers_res = client.get("/api/admin/workers", headers=coadmin_headers)
        assert coadmin_workers_res.status_code == 200
        coadmin_workers = coadmin_workers_res.json()
        for w in coadmin_workers:
            assert w["department_id"] == 1, f"Co-Admin must only see workers from Department 1, got dept {w['department_id']}"
        print(f"Co-Admin scoped worker filtering verified: {len(coadmin_workers)} workers in Department 1.")

        # Volunteer Registration & Approval Flow Test
        print("\n--- Volunteer Registration & Approval Flow Test ---")
        vol_phone = f"96{int(uuid.uuid4().hex[:6], 16) % 100000000:08d}"
        vol_pw = "VolunteerPass@123"
        vol_res = client.post("/api/volunteers/register", json={
            "name": "Citizen Volunteer Test",
            "phone": vol_phone,
            "email": f"vol_{unique_suffix}@example.com",
            "dob": "1998-01-01",
            "city": "Kakinada",
            "ward": "3",
            "address": "Ward 3 Municipal Street",
            "department": "Sanitation",
            "skills": "Field Sanitation, Waste Segregation",
            "availability": "Flexible",
            "reason": "Serving the city",
            "password": vol_pw
        })
        assert vol_res.status_code == 200, f"Volunteer registration failed: {vol_res.text}"
        vol_app_id = vol_res.json()["application_id"]
        print(f"Volunteer registered with application_id: {vol_app_id}")

        # Super Admin approves volunteer application
        appr_res = client.patch(
            f"/api/volunteers/admin/{vol_app_id}/approve",
            headers=super_admin_headers,
            json={"admin_notes": "Verified and approved by Super Admin", "ward_number": "3"}
        )
        assert appr_res.status_code == 200, f"Approval failed: {appr_res.text}"
        new_wrk_code = appr_res.json()["worker_id"]
        print(f"Volunteer approved! Assigned Worker ID: {new_wrk_code}")

        # Verify newly approved worker appears in /api/admin/workers
        workers_res_after = client.get("/api/admin/workers", headers=super_admin_headers)
        assert workers_res_after.status_code == 200
        assert any(w["worker_code"] == new_wrk_code for w in workers_res_after.json()), f"Newly approved worker {new_wrk_code} must appear in /api/admin/workers"
        print(f"Newly approved volunteer {new_wrk_code} successfully verified in eligible worker roster!")

        # -------------------------------------------------------------
        # STEP 5: WORKER COMPLAINT ASSIGNMENT & VISIBILITY ISOLATION
        # -------------------------------------------------------------
        print("\n--- STEP 5: Worker Complaint Assignment & Strict Isolation ---")

        # Create two separate test workers with user logins
        worker_a_phone = f"97{int(uuid.uuid4().hex[:6], 16) % 100000000:08d}"
        worker_b_phone = f"97{int(uuid.uuid4().hex[:6], 16) % 100000000:08d}"
        worker_password = "WorkerPassword@123"

        # Worker A User & Worker record
        user_wa = models.User(
            name="Field Worker Alpha",
            phone=worker_a_phone,
            password_hash=hash_password(worker_password),
            role="worker",
            department_id=1,
            is_active=True
        )
        db.add(user_wa)
        db.commit()
        db.refresh(user_wa)
        rec_wa = models.Worker(
            worker_code=f"WRK-{user_wa.id:05d}",
            name=user_wa.name,
            department_id=1,
            ward_number="Ward 3",
            user_id=user_wa.id,
            is_available=True
        )
        db.add(rec_wa)

        # Worker B User & Worker record
        user_wb = models.User(
            name="Field Worker Beta",
            phone=worker_b_phone,
            password_hash=hash_password(worker_password),
            role="worker",
            department_id=1,
            is_active=True
        )
        db.add(user_wb)
        db.commit()
        db.refresh(user_wb)
        rec_wb = models.Worker(
            worker_code=f"WRK-{user_wb.id:05d}",
            name=user_wb.name,
            department_id=1,
            ward_number="Ward 3",
            user_id=user_wb.id,
            is_available=True
        )
        db.add(rec_wb)
        db.commit()
        db.refresh(rec_wa)
        db.refresh(rec_wb)

        # Log in Worker A and Worker B
        res_wa_login = client.post("/api/auth/login", json={"phone": worker_a_phone, "password": worker_password})
        assert res_wa_login.status_code == 200
        token_wa = res_wa_login.json()["access_token"]
        headers_wa = {"Authorization": f"Bearer {token_wa}"}

        res_wb_login = client.post("/api/auth/login", json={"phone": worker_b_phone, "password": worker_password})
        assert res_wb_login.status_code == 200
        token_wb = res_wb_login.json()["access_token"]
        headers_wb = {"Authorization": f"Bearer {token_wb}"}

        # Create two test complaints in Department 1
        complaint_a_id = f"CMP-TEST-A-{unique_suffix}"
        complaint_b_id = f"CMP-TEST-B-{unique_suffix}"

        c_a = models.Complaint(
            id=complaint_a_id,
            user_id=super_admin_user.id,
            category="water_leakage",
            description="Leaking pipeline on Main Road",
            latitude=16.9891,
            longitude=82.2475,
            severity="HIGH",
            priority_score=85,
            status="pending",
            department_id=1,
            ward_number="Ward 3"
        )
        c_b = models.Complaint(
            id=complaint_b_id,
            user_id=super_admin_user.id,
            category="water_leakage",
            description="Broken valve near Market",
            latitude=16.9750,
            longitude=82.2350,
            severity="CRITICAL",
            priority_score=95,
            status="pending",
            department_id=1,
            ward_number="Ward 3"
        )
        db.add_all([c_a, c_b])
        db.commit()

        # Before assignment, neither worker should see any complaints
        my_wa_before = client.get("/api/complaints/my", headers=headers_wa).json()
        assert not any(c["id"] in (complaint_a_id, complaint_b_id) for c in my_wa_before), "Worker A must not see unassigned complaints"
        print("Confirmed: Unassigned complaints are invisible to Field Workers.")

        # Assign Complaint A -> Worker A
        assign_a = client.post(
            f"/api/complaints/{complaint_a_id}/assign",
            headers=super_admin_headers,
            json={"worker_id": rec_wa.id, "notes": "Dispatched to Worker Alpha"}
        )
        assert assign_a.status_code == 200, f"Assignment A failed: {assign_a.text}"

        # Assign Complaint B -> Worker B
        assign_b = client.post(
            f"/api/complaints/{complaint_b_id}/assign",
            headers=super_admin_headers,
            json={"worker_id": rec_wb.id, "notes": "Dispatched to Worker Beta"}
        )
        assert assign_b.status_code == 200, f"Assignment B failed: {assign_b.text}"

        # Check visibility in /api/complaints/my
        my_wa = client.get("/api/complaints/my", headers=headers_wa).json()
        my_wb = client.get("/api/complaints/my", headers=headers_wb).json()

        wa_ids = [c["id"] for c in my_wa]
        wb_ids = [c["id"] for c in my_wb]

        assert complaint_a_id in wa_ids, "Worker A must see assigned Complaint A in /my"
        assert complaint_b_id not in wa_ids, "Worker A must NOT see Worker B's Complaint B in /my"

        assert complaint_b_id in wb_ids, "Worker B must see assigned Complaint B in /my"
        assert complaint_a_id not in wb_ids, "Worker B must NOT see Worker A's Complaint A in /my"
        print("Verified strict worker complaint segregation in /api/complaints/my.")

        # -------------------------------------------------------------
        # STEP 6: DB-LEVEL AUTHORIZATION & SECURITY ENFORCEMENT
        # -------------------------------------------------------------
        print("\n--- STEP 6: Endpoint-level Authorization Checks ---")
        # 6a. Worker A attempts to GET Complaint B -> MUST BE 404 (Not Found / Unauthorized)
        cross_get = client.get(f"/api/complaints/{complaint_b_id}", headers=headers_wa)
        assert cross_get.status_code == 404, f"Worker A should get 404 accessing Worker B's complaint, got {cross_get.status_code}"

        # 6b. Worker A attempts to PATCH status on Complaint B -> MUST BE 403 or 404
        cross_patch = client.patch(
            f"/api/complaints/{complaint_b_id}/status",
            headers=headers_wa,
            json={"status": "in_progress"}
        )
        assert cross_patch.status_code in (403, 404), f"Worker A should not be allowed to update Complaint B, got {cross_patch.status_code}"

        # 6c. Worker A attempts to RESOLVE Complaint B -> MUST BE 403 or 404
        cross_resolve = client.post(
            f"/api/complaints/{complaint_b_id}/resolve",
            headers=headers_wa,
            json={"notes": "Illegal resolve attempt"}
        )
        assert cross_resolve.status_code in (403, 404), f"Worker A should not be allowed to resolve Complaint B, got {cross_resolve.status_code}"

        # 6d. Worker A updates Complaint A -> MUST SUCCEED (200)
        own_patch = client.patch(
            f"/api/complaints/{complaint_a_id}/status",
            headers=headers_wa,
            json={"status": "in_progress", "notes": "Work started by Worker Alpha"}
        )
        assert own_patch.status_code == 200, f"Worker A status update failed: {own_patch.text}"

        # 6e. Worker A resolves Complaint A -> MUST SUCCEED (200)
        own_resolve = client.post(
            f"/api/complaints/{complaint_a_id}/resolve",
            headers=headers_wa,
            json={"notes": "Resolved pipeline leak successfully", "action_taken": "Replaced valve gasket"}
        )
        assert own_resolve.status_code == 200, f"Worker A resolve failed: {own_resolve.text}"
        assert own_resolve.json()["status"] == "resolved"
        print("Endpoint authorization verified: Cross-worker operations strictly blocked (403/404); legitimate operations succeed (200).")

        # -------------------------------------------------------------
        # STEP 7: CO-ADMIN DEPARTMENT SCOPING
        # -------------------------------------------------------------
        print("\n--- STEP 7: Co-Admin Department Scoping ---")
        # Create a Complaint in Department 2 (Water Works)
        complaint_dept2_id = f"CMP-DEPT2-{unique_suffix}"
        c_dept2 = models.Complaint(
            id=complaint_dept2_id,
            user_id=super_admin_user.id,
            category="waterlogging",
            description="Waterlogging in ward 2",
            latitude=17.0020,
            longitude=82.2600,
            severity="MODERATE",
            priority_score=50,
            status="pending",
            department_id=2,  # Department 2
            ward_number="Ward 2"
        )
        db.add(c_dept2)
        db.commit()

        # Co-Admin (assigned to Department 1) attempts to assign worker to Department 2 complaint -> 403
        coadmin_cross_assign = client.post(
            f"/api/complaints/{complaint_dept2_id}/assign",
            headers=coadmin_headers,
            json={"worker_id": rec_wa.id}
        )
        assert coadmin_cross_assign.status_code == 403, f"Co-Admin should receive 403 assigning to out-of-department complaint, got {coadmin_cross_assign.status_code}"

        # Co-Admin attempts to resolve Department 2 complaint -> 403
        coadmin_cross_resolve = client.post(
            f"/api/complaints/{complaint_dept2_id}/resolve",
            headers=coadmin_headers,
            json={"notes": "CoAdmin out of scope resolve"}
        )
        assert coadmin_cross_resolve.status_code == 403, f"Co-Admin should receive 403 resolving out-of-department complaint, got {coadmin_cross_resolve.status_code}"
        print("Co-Admin department boundary strictly enforced across assignment and resolution.")

        print("\n=======================================================")
        print("ALL TESTS PASSED WITH 100% SUCCESS!")
        print("=======================================================")

    finally:
        db.close()

if __name__ == "__main__":
    test_full_admin_worker_assignment_flow()
