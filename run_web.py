"""Serve the browser-based ion irradiation laboratory."""

from __future__ import annotations

import os
from http.server import ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent
HOST = os.environ.get("ION_LAB_HOST", "0.0.0.0")
PORT = int(os.environ.get("PORT", os.environ.get("ION_LAB_PORT", "8000")))


def main() -> None:
    os.chdir(ROOT)
    from lab_server import LabRequestHandler

    server = ThreadingHTTPServer((HOST, PORT), LabRequestHandler)
    print("Ion Beam Irradiation Laboratory web server")
    print(f"Local URL: http://127.0.0.1:{PORT}/website/")
    print(f"Python API: http://127.0.0.1:{PORT}/api/health")
    print("In GitHub Codespaces, open the forwarded port and append /website/.")
    print("Press Ctrl+C to stop.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
