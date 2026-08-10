#!/usr/bin/env python
import os
from app import create_app

if __name__ == '__main__':
    app = create_app()

    # Write routes to file that will definitely be created
    log_path = os.path.join(os.path.dirname(__file__), 'registered_routes.log')
    with open(log_path, 'w') as f:
        f.write("=== FLASK APP ROUTES ===\n")
        cv_routes = []
        for rule in sorted(app.url_map.iter_rules(), key=str):
            if 'cv' in rule.rule:
                f.write(f"{rule.rule} - {list(rule.methods)}\n")
                cv_routes.append(str(rule.rule))
        f.write(f"\nTotal CV routes: {len(cv_routes)}\n")
        f.write(f"PUT /api/cv/update/<int:cv_id> in routes: {'/api/cv/update/<int:cv_id>' in cv_routes}\n")
        f.flush()

    app.run(debug=False, host='0.0.0.0', port=5000, use_reloader=False)
