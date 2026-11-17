// Temporary server using node:http. Replace once the backend framework (Express/Hapi) is decided.
import 'dotenv/config';
import http from 'node:http';

const PORT = Number(process.env.PORT) || 3000;

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  const { pathname } = new URL(req.url, `http://${req.headers.host ?? 'localhost'}`);

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  sendJson(res, 404, { status: 'fail', message: 'Halaman tidak ditemukan' });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
