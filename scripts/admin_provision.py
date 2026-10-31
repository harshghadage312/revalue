"""
ReValue Administrative Access Provisioning & Recovery Tool
=========================================================
Secure CLI utility for the verified system owner to:
1. List registered administrator accounts (emails and status only, no secrets).
2. Create or bootstrap a new administrator account using a personal email.
3. Reset the password for an existing administrator account.
4. Promote an existing registered user to the 'admin' role.

Security Standards:
- Bypasses public registration APIs (which strictly forbid admin self-registration).
- Uses bcrypt password hashing (app.core.security.hash_password).
- Masks password entry via getpass (does not echo passwords to terminal or shell history).
- Never displays password hashes or database credentials in console output.
- Operates safely on MongoDB Atlas without modifying other production records.

Usage Examples:
  python scripts/admin_provision.py list
  python scripts/admin_provision.py create --email owner@example.com --name "Project Owner"
  python scripts/admin_provision.py reset-password --email admin@revalue.market
  python scripts/admin_provision.py promote --email owner@example.com
  python scripts/admin_provision.py wizard
"""

import sys
import os
import argparse
import getpass
import uuid
import re
from datetime import datetime, timezone

# Ensure project paths
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.db.connection import get_db, DatabaseManager
from app.core.security import hash_password
from app.core.logging import logger


def validate_email(email: str) -> bool:
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email.strip()))


def validate_password_strength(password: str) -> None:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not any(c.isupper() for c in password) and not any(c.islower() for c in password):
        raise ValueError("Password must contain both letters.")
    if not any(c.isdigit() for c in password) and not any(not c.isalnum() for c in password):
        raise ValueError("Password must contain at least one digit or special character.")


def list_admins():
    """List all registered administrators without exposing sensitive data."""
    db = get_db()
    admins = list(db.users.find({"role": "admin"}))
    print(f"\nFound {len(admins)} registered administrator account(s):")
    print("-" * 75)
    print(f"{'User ID':<38} | {'Email':<28} | {'Status'}")
    print("-" * 75)
    for a in admins:
        u_id = a.get("id") or str(a.get("_id"))
        email = a.get("email", "unknown")
        active = "Active" if a.get("is_active", True) else "Disabled"
        print(f"{u_id:<38} | {email:<28} | {active}")
    print("-" * 75 + "\n")
    return admins


def create_admin(email: str, name: str, password: str = None):
    """Create a new administrator account."""
    clean_email = email.lower().strip()
    clean_name = name.strip() if name else "Administrator"

    if not validate_email(clean_email):
        raise ValueError(f"Invalid email address format: '{clean_email}'")

    if not password:
        password = getpass.getpass("Enter secure password for new administrator: ")
        confirm_pw = getpass.getpass("Confirm password: ")
        if password != confirm_pw:
            raise ValueError("Passwords do not match.")

    validate_password_strength(password)

    db = get_db()
    existing = db.users.find_one({"email": clean_email})
    if existing:
        if existing.get("role") == "admin":
            print(f"User '{clean_email}' is already an administrator. To reset password, use 'reset-password'.")
            return existing
        else:
            promote = input(f"User '{clean_email}' exists with role '{existing.get('role')}'. Promote to admin? [y/N]: ")
            if promote.lower() == "y":
                return promote_user(clean_email)
            else:
                print("Operation cancelled.")
                return None

    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    hashed_pw = hash_password(password)

    user_doc = {
        "_id": user_id,
        "id": user_id,
        "name": clean_name,
        "email": clean_email,
        "password_hash": hashed_pw,
        "role": "admin",
        "is_active": True,
        "is_email_verified": True,
        "phone": None,
        "address": None,
        "created_at": now,
        "updated_at": now,
        "average_rating": 5.0,
        "review_count": 0,
    }

    db.users.insert_one(user_doc)
    print(f"\n SUCCESS: Administrator account created successfully!")
    print(f"  • Email:    {clean_email}")
    print(f"  • Name:     {clean_name}")
    print(f"  • User ID:  {user_id}")
    print(f"  • Role:     admin")
    print(f"  • Status:   Active\n")
    return user_doc


def reset_admin_password(email: str, new_password: str = None):
    """Reset the password for an existing administrator account."""
    clean_email = email.lower().strip()
    db = get_db()
    user = db.users.find_one({"email": clean_email})

    if not user:
        raise ValueError(f"No user found with email '{clean_email}'.")

    if user.get("role") != "admin":
        promote = input(f"User '{clean_email}' has role '{user.get('role')}'. Promote to administrator as well? [y/N]: ")
        if promote.lower() == "y":
            db.users.update_one({"email": clean_email}, {"$set": {"role": "admin"}})
            print(f"Role updated to 'admin'.")

    if not new_password:
        new_password = getpass.getpass(f"Enter new password for '{clean_email}': ")
        confirm_pw = getpass.getpass("Confirm new password: ")
        if new_password != confirm_pw:
            raise ValueError("Passwords do not match.")

    validate_password_strength(new_password)
    hashed_pw = hash_password(new_password)
    now = datetime.now(timezone.utc)

    db.users.update_one(
        {"email": clean_email},
        {
            "$set": {
                "password_hash": hashed_pw,
                "is_active": True,
                "updated_at": now,
            }
        }
    )

    # Invalidate existing refresh tokens for security
    user_id = user.get("id") or str(user.get("_id"))
    db.refresh_tokens.delete_many({"user_id": user_id})

    print(f"\n SUCCESS: Password reset successfully for administrator '{clean_email}'!")
    print(f"  • All existing session tokens have been revoked.")
    print(f"  • You may now log in with the new password.\n")


def promote_user(email: str):
    """Promote an existing user to the administrator role."""
    clean_email = email.lower().strip()
    db = get_db()
    user = db.users.find_one({"email": clean_email})

    if not user:
        raise ValueError(f"No user found with email '{clean_email}'.")

    if user.get("role") == "admin":
        print(f"User '{clean_email}' is already an administrator.")
        return user

    db.users.update_one(
        {"email": clean_email},
        {
            "$set": {
                "role": "admin",
                "is_active": True,
                "updated_at": datetime.now(timezone.utc),
            }
        }
    )
    print(f"\n SUCCESS: User '{clean_email}' has been promoted to 'admin' role.")
    return user


def interactive_wizard():
    """Interactive wizard for owner management."""
    print("=" * 60)
    print("  ReValue Administrator Provisioning & Recovery Wizard")
    print("=" * 60)
    print("1. List registered administrator accounts")
    print("2. Create a new administrator account (with your email)")
    print("3. Reset password for an existing administrator")
    print("4. Promote an existing registered user to administrator")
    print("5. Exit")
    print("-" * 60)

    choice = input("Enter choice (1-5): ").strip()
    if choice == "1":
        list_admins()
    elif choice == "2":
        email = input("Enter administrator email: ").strip()
        name = input("Enter full legal name: ").strip() or "System Administrator"
        create_admin(email, name)
    elif choice == "3":
        email = input("Enter administrator email to reset: ").strip()
        reset_admin_password(email)
    elif choice == "4":
        email = input("Enter registered user email to promote: ").strip()
        promote_user(email)
    elif choice == "5":
        print("Exiting.")
    else:
        print("Invalid choice.")


def main():
    parser = argparse.ArgumentParser(
        description="ReValue Administrator Account Provisioning and Recovery CLI"
    )
    subparsers = parser.add_subparsers(dest="command", help="Command to run")

    # Command: list
    subparsers.add_parser("list", help="List all registered administrator accounts")

    # Command: create
    create_parser = subparsers.add_parser("create", help="Create a new administrator account")
    create_parser.add_argument("--email", required=True, help="Administrator email address")
    create_parser.add_argument("--name", default="System Administrator", help="Full name of administrator")
    create_parser.add_argument("--password", help="Password (omit to be prompted securely)")

    # Command: reset-password
    reset_parser = subparsers.add_parser("reset-password", help="Reset password for an administrator")
    reset_parser.add_argument("--email", required=True, help="Administrator email address")
    reset_parser.add_argument("--password", help="New password (omit to be prompted securely)")

    # Command: promote
    promote_parser = subparsers.add_parser("promote", help="Promote an existing user to administrator")
    promote_parser.add_argument("--email", required=True, help="User email address to promote")

    # Command: wizard
    subparsers.add_parser("wizard", help="Interactive administration wizard")

    args = parser.parse_args()

    if not args.command or args.command == "wizard":
        interactive_wizard()
        return

    try:
        if args.command == "list":
            list_admins()
        elif args.command == "create":
            create_admin(args.email, args.name, args.password)
        elif args.command == "reset-password":
            reset_admin_password(args.email, args.password)
        elif args.command == "promote":
            promote_user(args.email)
    except Exception as e:
        print(f"\n❌ ERROR: {e}\n", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
