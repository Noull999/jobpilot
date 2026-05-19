#!/usr/bin/env python3
"""Test all 14 portal integrations"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.services.job_integrations import get_portal_integration

def main():
    app = create_app()

    with app.app_context():
        print("=" * 70)
        print("TESTING ALL 14 JOB PORTAL INTEGRATIONS")
        print("=" * 70)

        portals = [
            'remotek', 'github', 'indeed', 'computrabajo', 'trabajando',
            'linkedin', 'getonboard', 'laborum', 'olx', 'glassdoor',
            'stackoverflow', 'weworkremotely', 'vivanuncio', 'bolsa_trabajo'
        ]

        results = {}

        for portal in portals:
            print(f"\n[{portal.upper()}]")
            print("-" * 70)

            try:
                integration = get_portal_integration(portal)
                # Try to fetch a small number of jobs (5) to test
                jobs = integration.fetch_jobs(limit=5)

                status = 'OK' if jobs else 'NO_DATA'
                count = len(jobs)

                results[portal] = {
                    'status': status,
                    'count': count
                }

                print(f"Status: {status}")
                print(f"Jobs fetched: {count}")

                if jobs and count > 0:
                    print(f"Sample: {jobs[0]['title']}")

            except Exception as e:
                results[portal] = {
                    'status': 'ERROR',
                    'error': str(e)
                }
                print(f"ERROR: {str(e)}")

        # Summary
        print("\n" + "=" * 70)
        print("SUMMARY")
        print("=" * 70)

        working = [p for p, r in results.items() if r['status'] == 'OK']
        no_data = [p for p, r in results.items() if r['status'] == 'NO_DATA']
        errors = [p for p, r in results.items() if r['status'] == 'ERROR']

        print(f"\nWorking (returning data): {len(working)}")
        for p in working:
            print(f"  + {p}: {results[p]['count']} jobs")

        print(f"\nNo data (accessible but empty): {len(no_data)}")
        for p in no_data:
            print(f"  - {p}")

        print(f"\nErrors (blocked or failed): {len(errors)}")
        for p in errors:
            print(f"  x {p}: {results[p].get('error', 'Unknown')}")

        print("\n" + "=" * 70)
        print(f"Total portals: {len(portals)}")
        print(f"Operational: {len(working) + len(no_data)}")
        print("=" * 70)

if __name__ == '__main__':
    main()
