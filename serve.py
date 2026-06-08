#!/usr/bin/env python3
import http.server, sys

class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()
    def log_message(self, *_):
        pass

import os
os.chdir("/Users/parkjihun/Documents/Mindex")
port = int(os.environ.get("PORT", sys.argv[1] if len(sys.argv) > 1 else 4173))
http.server.test(HandlerClass=NoCacheHandler, port=port)
