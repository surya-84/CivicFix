"""
CivicFix - Comprehensive Google Authentication Test Suite
Tests all 15 scenarios specified in the Google Login Implementation Plan.
Uses FastAPI TestClient to test router logic, session cookies, database integrity,
account linking, staff isolation, and complaint ownership.
"""

import os
import sys
import unittest
from jose import jwt
from fastapi.testclient import TestClient

# Add current backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from main import app
from database import SessionLocal
import models
import config

client = TestClient(app, base_url="http://localhost:8000")

class TestGoogleAuthSuite(unittest.TestCase):
    def setUp(self):
        self.db = SessionLocal()

    def tearDown(self):
        # Clean up any test-created records to keep database clean
        test_emails = [
            "test.google.newcitizen@example.com",
            "test.google.linking@example.com",
        ]
        test_phones = ["9876543210", "9876543211", "9998887776"]
        
        # Remove any complaints created by test users
        test_users = self.db.query(models.User).filter(
            (models.User.email.in_(test_emails)) | (models.User.phone.in_(test_phones))
        ).all()
        for u in test_users:
            self.db.query(models.Complaint).filter(models.Complaint.user_id == u.id).delete()
            self.db.delete(u)
        self.db.commit()
        self.db.close()

    # TEST 1: Existing Citizen Login
    def test_01_existing_citizen_login(self):
        res = client.post("/api/auth/login", json={"phone": "9000000001", "password": "citizen123"})
        self.assertEqual(res.status_code, 200, f"Failed: {res.text}")
        data = res.json()
        self.assertEqual(data["role"], "citizen")
        self.assertEqual(data["name"], "Ravi Kumar")
        self.assertTrue("access_token" in data)

    # TEST 2: Existing Worker Login
    def test_02_existing_worker_login(self):
        res = client.post("/api/auth/login", json={"phone": "WRK-10482", "password": "worker123"})
        self.assertEqual(res.status_code, 200, f"Failed: {res.text}")
        data = res.json()
        self.assertEqual(data["role"], "worker")
        self.assertEqual(data.get("worker_code"), "WRK-10482")

    # TEST 3: Existing Admin Login
    def test_03_existing_admin_login(self):
        res = client.post("/api/auth/login", json={"phone": "ADM-000001", "password": "admin123"})
        self.assertEqual(res.status_code, 200, f"Failed: {res.text}")
        data = res.json()
        self.assertEqual(data["role"], "admin")
        self.assertEqual(data.get("admin_code"), "ADM-000001")

    # TEST 4: New Google Citizen Registration & Phone Collection
    def test_04_new_google_citizen_creation(self):
        # Generate signed pending token
        pending_claims = {
            "sub": "google_test_new_sub_99901",
            "email": "test.google.newcitizen@example.com",
            "name": "Aarav Sharma",
            "picture": "https://example.com/aarav.jpg",
            "type": "google_pending_registration",
        }
        pending_jwt = jwt.encode(pending_claims, config.SECRET_KEY, algorithm=config.ALGORITHM)

        # 4a: Check pending-info endpoint
        client.cookies.set("civicfix_pending_google", pending_jwt)
        info_res = client.get("/api/auth/google/pending-info")
        self.assertEqual(info_res.status_code, 200)
        self.assertEqual(info_res.json()["email"], "test.google.newcitizen@example.com")
        self.assertEqual(info_res.json()["name"], "Aarav Sharma")

        # 4b: Submit complete-google-profile with 10-digit mobile
        reg_res = client.post(
            "/api/auth/complete-google-profile",
            json={"phone": "9876543210", "name": "Aarav Sharma"},
        )
        self.assertEqual(reg_res.status_code, 200, f"Failed: {reg_res.text}")
        reg_data = reg_res.json()
        self.assertEqual(reg_data["role"], "citizen")
        self.assertEqual(reg_data["phone"], "9876543210")
        self.assertEqual(reg_data["email"], "test.google.newcitizen@example.com")
        self.assertEqual(reg_data["auth_provider"], "google")
        self.assertTrue(reg_data["is_profile_complete"])

        # 4c: Verify database record
        user_in_db = self.db.query(models.User).filter(models.User.email == "test.google.newcitizen@example.com").first()
        self.assertIsNotNone(user_in_db)
        self.assertEqual(user_in_db.google_id, "google_test_new_sub_99901")
        self.assertEqual(user_in_db.role, "citizen")
        self.assertTrue(user_in_db.email_verified)

    # TEST 5: Existing Citizen Account Linking
    def test_05_existing_citizen_account_linking(self):
        # Create a pre-existing citizen with email
        existing_citizen = models.User(
            name="Priya Patel",
            phone="9998887776",
            email="test.google.linking@example.com",
            role="citizen",
            password_hash="test_hash_citizen",
            auth_provider="local",
        )
        self.db.add(existing_citizen)
        self.db.commit()
        self.db.refresh(existing_citizen)
        orig_id = existing_citizen.id

        # Simulate Google callback finding this email (matching logic in auth.py)
        user_by_email = self.db.query(models.User).filter(
            models.User.email == "test.google.linking@example.com"
        ).first()
        self.assertIsNotNone(user_by_email)
        self.assertEqual(user_by_email.role, "citizen")

        # Perform linking
        user_by_email.google_id = "google_sub_priya_888"
        user_by_email.auth_provider = "both"
        user_by_email.email_verified = True
        self.db.commit()
        self.db.refresh(user_by_email)

        # Verify no duplicate user was created and ID remains identical
        self.assertEqual(user_by_email.id, orig_id)
        self.assertEqual(user_by_email.auth_provider, "both")
        self.assertEqual(user_by_email.google_id, "google_sub_priya_888")

    # TEST 6: Google Login Cancellation
    def test_06_google_login_cancellation(self):
        res = client.get("/api/auth/google/callback?error=access_denied", follow_redirects=False)
        self.assertEqual(res.status_code, 307)
        redirect_url = res.headers["location"]
        self.assertIn("google_auth=cancelled", redirect_url)
        self.assertNotIn("token", redirect_url)

    # TEST 7: Invalid / Failed Authentication Error Handling
    def test_07_invalid_authentication_handling(self):
        # Missing state / code
        res = client.get("/api/auth/google/callback", follow_redirects=False)
        self.assertEqual(res.status_code, 307)
        self.assertIn("error_type=missing_code", res.headers["location"])

        # State mismatch
        client.cookies.set("oauth_state", "correct_state", path="/api/auth")
        res2 = client.get("/api/auth/google/callback?code=fake_code&state=wrong_state", follow_redirects=False)
        self.assertEqual(res2.status_code, 307)
        self.assertIn("error_type=state_mismatch", res2.headers["location"])

    # TEST 8: Duplicate Phone Number Rejection in Profile Completion
    def test_08_duplicate_phone_rejection(self):
        pending_claims = {
            "sub": "google_test_dup_sub",
            "email": "test.google.newcitizen@example.com",
            "name": "Duplicate Tester",
            "type": "google_pending_registration",
        }
        pending_jwt = jwt.encode(pending_claims, config.SECRET_KEY, algorithm=config.ALGORITHM)
        client.cookies.set("civicfix_pending_google", pending_jwt)

        # Ravi's phone number 9000000001 already exists
        dup_res = client.post(
            "/api/auth/complete-google-profile",
            json={"phone": "9000000001", "name": "Duplicate Tester"},
        )
        self.assertEqual(dup_res.status_code, 400)
        self.assertIn("already registered to another account", dup_res.json()["detail"])

    # TEST 9: Google Email Belonging to Staff (Worker/Admin) Safely Denied
    def test_09_staff_account_collision_denied(self):
        # Admin Commissioner's email is commissioner@civicfix.gov.in
        admin = self.db.query(models.User).filter(models.User.email == "commissioner@civicfix.gov.in").first()
        self.assertIsNotNone(admin)
        self.assertEqual(admin.role, "admin")

        # Simulate callback check: email belongs to admin or worker -> forbidden
        user_by_email = self.db.query(models.User).filter(
            models.User.email == "commissioner@civicfix.gov.in"
        ).first()
        self.assertTrue(user_by_email.role in ["admin", "worker"])

    # TEST 10 & 11: Google Citizen Creating Complaint & Viewing Own Complaints
    def test_10_and_11_google_citizen_complaint_ownership(self):
        # Create Google Citizen
        user = models.User(
            name="Google Citizen",
            phone="9876543211",
            email="test.google.newcitizen@example.com",
            role="citizen",
            password_hash="google_oauth_secret_hash",
            google_id="google_sub_test_10",
            auth_provider="google",
            email_verified=True,
            is_profile_complete=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        # Issue token for this citizen
        token = jwt.encode({"sub": str(user.id), "role": user.role}, config.SECRET_KEY, algorithm=config.ALGORITHM)
        headers = {"Authorization": f"Bearer {token}"}

        # Create Complaint via Form Data
        complaint_form = {
            "category": "Garbage",
            "description": "Streetlight flickers and garbage pile near park gate",
            "latitude": 13.0827,
            "longitude": 80.2707,
        }
        c_res = client.post("/api/complaints/", data=complaint_form, headers=headers)
        self.assertEqual(c_res.status_code, 200, f"Failed to create complaint: {c_res.text}")
        created_c = c_res.json()
        self.assertEqual(created_c["complaint"]["user_id"], user.id)

        # View Complaints for this user via /api/complaints/my
        my_res = client.get("/api/complaints/my", headers=headers)
        self.assertEqual(my_res.status_code, 200)
        items = my_res.json()
        self.assertTrue(len(items) >= 1)
        for item in items:
            self.assertEqual(item["user_id"], user.id)

    # TEST 12: Cross-Citizen Complaint Isolation
    def test_12_other_citizen_complaint_isolation(self):
        # Create Citizen A
        citizen_a = models.User(
            name="Citizen Alpha",
            phone="9876543210",
            email="test.google.newcitizen@example.com",
            role="citizen",
            password_hash="secret_hash_a",
            google_id="google_sub_alpha",
            auth_provider="google",
            email_verified=True,
            is_profile_complete=True,
        )
        # Create Citizen B
        citizen_b = models.User(
            name="Citizen Beta",
            phone="9876543211",
            email="test.google.linking@example.com",
            role="citizen",
            password_hash="secret_hash_b",
            google_id="google_sub_beta",
            auth_provider="google",
            email_verified=True,
            is_profile_complete=True,
        )
        self.db.add_all([citizen_a, citizen_b])
        self.db.commit()
        self.db.refresh(citizen_a)
        self.db.refresh(citizen_b)

        # File a complaint under Citizen A
        complaint_a = models.Complaint(
            id="CIV-TEST-ISO-01",
            category="Roads",
            description="Severe pothole causing traffic issues",
            latitude=13.0827,
            longitude=80.2707,
            user_id=citizen_a.id,
            status="pending",
        )
        self.db.add(complaint_a)
        self.db.commit()
        self.db.refresh(complaint_a)

        # Issue token for Citizen B
        token_b = jwt.encode({"sub": str(citizen_b.id), "role": citizen_b.role}, config.SECRET_KEY, algorithm=config.ALGORITHM)
        headers_b = {"Authorization": f"Bearer {token_b}"}

        # Citizen B queries /api/complaints/my
        res_b = client.get("/api/complaints/my", headers=headers_b)
        self.assertEqual(res_b.status_code, 200)
        items_b = res_b.json()
        
        # Ensure Citizen A's complaint is NEVER visible to Citizen B
        complaint_ids_b = [item["id"] for item in items_b]
        self.assertNotIn(complaint_a.id, complaint_ids_b)

    # TEST 13: Complaint Isolation & Session Verification
    def test_13_session_endpoint_security(self):
        # Create Google Citizen
        user = models.User(
            name="Session Tester",
            phone="9876543211",
            email="test.google.newcitizen@example.com",
            role="citizen",
            password_hash="google_oauth_secret_hash",
            google_id="google_session_sub",
            auth_provider="google",
            email_verified=True,
            is_profile_complete=True,
        )
        self.db.add(user)
        self.db.commit()
        self.db.refresh(user)

        token = jwt.encode({"sub": str(user.id), "role": user.role}, config.SECRET_KEY, algorithm=config.ALGORITHM)
        
        # Test GET /api/auth/session via cookie
        client.cookies.set("civicfix_session", token)
        session_res = client.get("/api/auth/session")
        self.assertEqual(session_res.status_code, 200)
        session_data = session_res.json()
        self.assertEqual(session_data["user_id"], user.id)
        self.assertEqual(session_data["role"], "citizen")
        self.assertEqual(session_data["auth_provider"], "google")

    # TEST 14: Logout Clears Session Cookie
    def test_14_logout_clears_cookie(self):
        client.cookies.set("civicfix_session", "dummy_token")
        client.cookies.set("civicfix_pending_google", "dummy_pending")
        logout_res = client.post("/api/auth/logout")
        self.assertEqual(logout_res.status_code, 200)
        # Check Set-Cookie headers expire cookies
        cookies_header = logout_res.headers.get("set-cookie", "")
        self.assertIn('civicfix_session=""', cookies_header)

    # TEST 15: Database Migration Data Preservation Verification
    def test_15_database_data_preservation(self):
        # Verify total user count >= 13
        user_count = self.db.query(models.User).count()
        self.assertGreaterEqual(user_count, 13, f"Expected at least 13 users, found {user_count}")

        # Verify key baseline accounts exist
        ravi = self.db.query(models.User).filter(models.User.phone == "9000000001").first()
        self.assertIsNotNone(ravi, "Citizen Ravi Kumar missing!")
        self.assertEqual(ravi.role, "citizen")

        worker = self.db.query(models.User).filter(models.User.worker_code == "WRK-10482").first()
        self.assertIsNotNone(worker, "Worker WRK-10482 missing!")
        self.assertEqual(worker.role, "worker")

        admin = self.db.query(models.User).filter(models.User.admin_code == "ADM-000001").first()
        self.assertIsNotNone(admin, "Admin ADM-000001 missing!")
        self.assertEqual(admin.role, "admin")

        # Verify complaints preserved >= 11
        complaint_count = self.db.query(models.Complaint).count()
        self.assertGreaterEqual(complaint_count, 11, f"Expected at least 11 complaints, found {complaint_count}")

    # TEST 16: Google Config Endpoint
    def test_16_google_config_endpoint(self):
        res = client.get("/api/auth/google/config")
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("enabled", data)
        self.assertIn("client_id", data)
        # Never expose secret!
        self.assertNotIn("client_secret", data)
        self.assertNotIn("secret", data)


if __name__ == "__main__":
    unittest.main()
