#!/usr/bin/env python3
"""
Script to start LiteLLM proxy for ApplyPilot
Run this in a separate terminal or in the background
"""

import subprocess
import os
import sys
import time
import logging
from pathlib import Path

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def start_litellm_proxy():
    """Start LiteLLM proxy server"""

    # Ensure we have required API keys
    anthropic_key = os.getenv('ANTHROPIC_API_KEY')
    gemini_key = os.getenv('GEMINI_API_KEY')

    if not anthropic_key and not gemini_key:
        logger.error("❌ Error: Set ANTHROPIC_API_KEY or GEMINI_API_KEY in .env")
        return False

    if not anthropic_key:
        logger.warning("⚠️  Warning: ANTHROPIC_API_KEY not set, Claude model won't work")

    if not gemini_key:
        logger.warning("⚠️  Warning: GEMINI_API_KEY not set, Gemini fallback won't work")

    # Get config path
    config_path = Path(__file__).parent.parent / 'config' / 'litellm_config.yaml'

    if not config_path.exists():
        logger.error(f"❌ Config file not found: {config_path}")
        return False

    logger.info(f"📂 Using config: {config_path}")
    logger.info("🚀 Starting LiteLLM proxy...")

    try:
        # Start LiteLLM proxy
        process = subprocess.Popen([
            'litellm',
            '--config', str(config_path),
            '--port', '4000',
            '--host', '0.0.0.0'
        ])

        logger.info("✅ LiteLLM proxy started on http://localhost:4000")
        logger.info("Press Ctrl+C to stop")

        # Wait for process
        process.wait()

    except FileNotFoundError:
        logger.error("❌ litellm command not found. Install with: pip install litellm")
        return False
    except KeyboardInterrupt:
        logger.info("\n⛔ Stopping LiteLLM proxy...")
        process.terminate()
        process.wait()
        logger.info("✅ LiteLLM proxy stopped")
    except Exception as e:
        logger.error(f"❌ Error starting LiteLLM: {str(e)}")
        return False

    return True

if __name__ == '__main__':
    # Load .env file
    from dotenv import load_dotenv
    load_dotenv()

    success = start_litellm_proxy()
    sys.exit(0 if success else 1)
