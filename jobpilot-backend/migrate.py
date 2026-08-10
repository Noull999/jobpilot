#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para aplicar migraciones de BD después de cambios en modelos
"""
import os
import sys
import io
from app import create_app, db

# Fix for Windows console encoding issues
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

def main():
    app = create_app()

    with app.app_context():
        print("[MIGRATION] Applying database changes...")
        try:
            # Crear todas las tablas y aplicar cambios
            db.create_all()
            print("[SUCCESS] Database updated successfully")

            # Imprimir índices creados
            from sqlalchemy import inspect
            inspector = inspect(db.engine)

            print("\n[INDEXES] Created in tables:")
            for table_name in inspector.get_table_names():
                indexes = inspector.get_indexes(table_name)
                if indexes:
                    print(f"  {table_name}:")
                    for idx in indexes:
                        print(f"    - {idx['name']}: {idx['column_names']}")

            print("\n[DONE] Migration completed")
            return 0

        except Exception as e:
            print(f"[ERROR] Migration error: {str(e)}")
            import traceback
            traceback.print_exc()
            return 1

if __name__ == '__main__':
    sys.exit(main())
