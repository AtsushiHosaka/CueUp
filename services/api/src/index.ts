import { getRuntimeConfig } from './config.js';
import { createServer } from './server.js';

const config = getRuntimeConfig();
const server = createServer(config);

server.listen(config.port, () => {
  console.log(`CueUp API listening on http://localhost:${config.port}`);
});
