#!/usr/bin/env python
import os
from app import create_app

if __name__ == '__main__':
    app = create_app()
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug, host='0.0.0.0', port=5000)
