#!/usr/bin/env python3
"""Helper script to collect API keys for job portals"""

import os
import sys
from dotenv import load_dotenv, set_key

def main():
    load_dotenv()

    print("\n" + "="*70)
    print("JobPilot - API Key Configuration Helper")
    print("="*70)

    env_file = '.env'

    # 1. Indeed
    print("\n1. INDEED API")
    print("-" * 70)
    print("Instructions:")
    print("  1. Go to https://opensource.indeedeng.io/")
    print("  2. Click 'Sign Up' → Create account")
    print("  3. Dashboard → Create 'Publisher Account'")
    print("  4. Copy your PUBLISHER_ID")
    print()

    indeed_key = input("Enter your Indeed Publisher ID (or press Enter to skip): ").strip()
    if indeed_key:
        set_key(env_file, 'INDEED_API_KEY', indeed_key)
        print("✓ Indeed API key saved")
    else:
        print("⊘ Indeed skipped")

    # 2. LinkedIn
    print("\n2. LINKEDIN API")
    print("-" * 70)
    print("Instructions:")
    print("  1. Go to https://www.linkedin.com/developers/apps")
    print("  2. Click 'Create App'")
    print("  3. Fill company info")
    print("  4. Copy Client ID and Client Secret")
    print()

    linkedin_id = input("Enter LinkedIn Client ID (or press Enter to skip): ").strip()
    if linkedin_id:
        set_key(env_file, 'LINKEDIN_CLIENT_ID', linkedin_id)
        linkedin_secret = input("Enter LinkedIn Client Secret: ").strip()
        if linkedin_secret:
            set_key(env_file, 'LINKEDIN_CLIENT_SECRET', linkedin_secret)
            print("✓ LinkedIn credentials saved")
    else:
        print("⊘ LinkedIn skipped")

    # 3. Settings
    print("\n3. JOB SYNC SETTINGS")
    print("-" * 70)

    sync_hours = input("Enter sync interval in hours (default 6): ").strip()
    if sync_hours:
        set_key(env_file, 'JOB_SYNC_INTERVAL_HOURS', sync_hours)
        print(f"✓ Sync interval set to {sync_hours} hours")

    # 4. Summary
    print("\n" + "="*70)
    print("SUMMARY")
    print("="*70)

    load_dotenv()  # Reload to show what was saved

    print("\nConfigured APIs:")
    if os.getenv('INDEED_API_KEY'):
        print("  ✓ Indeed API Key: " + os.getenv('INDEED_API_KEY')[:10] + "***")
    else:
        print("  ⊘ Indeed API Key: not configured")

    if os.getenv('LINKEDIN_CLIENT_ID'):
        print("  ✓ LinkedIn: configured")
    else:
        print("  ⊘ LinkedIn: not configured")

    print(f"\nSync Interval: {os.getenv('JOB_SYNC_INTERVAL_HOURS', '6')} hours")

    print("\n" + "="*70)
    print("Configuration saved to .env")
    print("Next: python run.py")
    print("="*70 + "\n")

if __name__ == '__main__':
    try:
        main()
    except Exception as e:
        print(f"\nError: {e}")
        sys.exit(1)
