const http = require('node:http');
const next = require('next');

const rawPort = process.env.PORT;
const listenTarget = rawPort
  ? (/^\d+$/.test(rawPort) ? Number(rawPort) : rawPort)
  : 3000;
const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  http
    .createServer((request, response) => handle(request, response))
    .listen(listenTarget);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
