#!/usr/bin/env python3
"""Test job portal synchronization"""

import os
import sys

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.services import sync_portal_jobs
from app.models import Job

def main():
    app = create_app()

    with app.app_context():
        print("=" * 60)
        print("TESTING JOB PORTAL SYNCHRONIZATION")
        print("=" * 60)

        # Test each portal
        portals_to_test = ['remotek', 'github', 'indeed', 'computrabajo']

        for portal in portals_to_test:
            print(f"\n[{portal.upper()}]")
            print("-" * 60)

            try:
                result = sync_portal_jobs(portal, limit=50)
                print(f"Status: {result.get('status')}")
                print(f"Synced: {result.get('synced', 0)}")
                print(f"Updated: {result.get('updated', 0)}")

                if result.get('status') == 'error':
                    print(f"Error: {result.get('message')}")

            except Exception as e:
                print(f"[ERROR] {str(e)}")

        # Show statistics
        print("\n" + "=" * 60)
        print("DATABASE STATISTICS")
        print("=" * 60)

        # Count by source
        sources = db.session.execute(
            db.text("SELECT source, COUNT(*) as count FROM jobs GROUP BY source")
        ).fetchall()

        total_jobs = 0
        for source, count in sources:
            print(f"  {source}: {count} jobs")
            total_jobs += count

        print(f"\nTotal jobs in database: {total_jobs}")

        # Sample jobs
        sample_jobs = Job.query.limit(3).all()
        if sample_jobs:
            print("\nSample jobs:")
            for job in sample_jobs:
                print(f"  - {job.title} @ {job.company} ({job.source})")

        print("\n" + "=" * 60)
        print("TEST COMPLETE")
        print("=" * 60)

if __name__ == '__main__':
    main()
