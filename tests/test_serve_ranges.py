import functools
import http.client
import http.server
import pathlib
import sys
import tempfile
import threading
import unittest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from serve import NoCacheHandler


class RangeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.directory = tempfile.TemporaryDirectory()
        cls.data = bytes(range(256)) * 1024
        pathlib.Path(cls.directory.name, 'video.mp4').write_bytes(cls.data)
        pathlib.Path(cls.directory.name, 'empty.mp4').write_bytes(b'')
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0),
            functools.partial(NoCacheHandler, directory=cls.directory.name))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()
        cls.directory.cleanup()

    def request(self, range_value='', method='GET', path='/video.mp4', extra=None):
        connection = http.client.HTTPConnection(*self.server.server_address)
        headers = {'Range': range_value} if range_value else {}
        headers.update(extra or {})
        connection.request(method, path, headers=headers)
        response = connection.getresponse()
        result = response.status, dict(response.getheaders()), response.read()
        connection.close()
        return result

    def test_partial_ranges(self):
        for value, start, end in [('bytes=0-1', 0, 1), ('bytes=65530-65540', 65530, 65540),
                                  ('bytes=262140-', 262140, 262143), ('bytes=-4', 262140, 262143),
                                  ('bytes=262140-999999', 262140, 262143)]:
            with self.subTest(value=value):
                status, headers, data = self.request(value)
                self.assertEqual(status, 206)
                self.assertEqual(headers['Content-Range'], f'bytes {start}-{end}/{len(self.data)}')
                self.assertEqual(int(headers['Content-Length']), end - start + 1)
                self.assertEqual(data, self.data[start:end + 1])

    def test_unsatisfiable_ranges(self):
        for value in ['bytes=999999-', 'bytes=-0', 'bytes=10-5']:
            self.assertEqual(self.request(value)[0], 416)
        self.assertEqual(self.request('bytes=0-1', path='/empty.mp4')[0], 416)

    def test_full_and_head_requests(self):
        self.assertEqual(self.request()[2], self.data)
        status, headers, data = self.request('bytes=0-1', method='HEAD')
        self.assertEqual((status, data), (200, b''))
        self.assertEqual(int(headers['Content-Length']), len(self.data))
        self.assertEqual(self.request('bytes=0-1', extra={'If-Range': 'stale'})[2], self.data)
        self.assertEqual(self.request('bytes=0-1,4-5')[2], self.data)
        self.assertEqual(self.request('bytes=0-1', path='/missing.mp4')[0], 404)


if __name__ == '__main__':
    unittest.main()
