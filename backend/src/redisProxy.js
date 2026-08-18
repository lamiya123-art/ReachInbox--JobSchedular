const net = require('net');

const targetHost = process.argv[2] || '172.21.13.144';
const targetPort = 6379;
const listenPort = 6379;

const server = net.createServer((socket) => {
  const client = net.createConnection({ host: targetHost, port: targetPort });
  socket.pipe(client);
  client.pipe(socket);

  socket.on('error', (err) => {
    client.destroy();
  });
  client.on('error', (err) => {
    socket.destroy();
  });
});

server.listen(listenPort, '127.0.0.1', () => {
  console.log(`[Redis Proxy] Active on 127.0.0.1:${listenPort} -> ${targetHost}:${targetPort}`);
});
