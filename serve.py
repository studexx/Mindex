#!/usr/bin/env python3
import html
import http.server
import json
import os
import pathlib
import sys

ROOT = pathlib.Path("/Users/parkjihun/Mindex")
ENV_PATHS = (
    ROOT / ".env.supabase.local",
    ROOT / ".env.supabase",
    pathlib.Path("/Users/parkjihun/Documents/INDEX/.env.supabase"),
)


def read_env_files():
    values = {}
    for path in ENV_PATHS:
        if not path.exists():
            continue
        try:
            lines = path.read_text(errors="ignore").splitlines()
        except OSError:
            continue
        for line in lines:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, value = line.split("=", 1)
            values[key.strip()] = value.strip().strip("\"'")
    return values


def local_supabase_config():
    values = {**read_env_files(), **os.environ}
    url = values.get("MINDEX_SUPABASE_URL") or values.get("SUPABASE_URL") or ""
    anon_key = (
        values.get("MINDEX_SUPABASE_ANON_KEY")
        or values.get("SUPABASE_ANON_KEY")
        or values.get("SUPABASE_PUBLIC_ANON_KEY")
        or ""
    )
    if not url or not anon_key:
        return ""
    return json.dumps({"url": url, "anonKey": anon_key})


def inject_local_config(markup):
    config = local_supabase_config()
    if not config or "window.MINDEX_SUPABASE" in markup:
        return markup
    script = f"<script>window.MINDEX_SUPABASE={html.escape(config, quote=False)};</script>"
    return markup.replace("</head>", f"    {script}\n  </head>", 1)

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path in ("", "/") or self.path.split("?", 1)[0] == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            markup = (ROOT / "index.html").read_text(encoding="utf-8")
            self.wfile.write(inject_local_config(markup).encode("utf-8"))
            return
        super().do_GET()

    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def log_message(self, *_):
        pass

def main():
    os.chdir(ROOT)
    port = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 4173))
    http.server.test(HandlerClass=NoCacheHandler, port=port)


if __name__ == "__main__":
    main()
