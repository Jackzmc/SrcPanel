import http from 'node:http'
import { LISTEN_PORT } from './util/index.js';

http
    .request(
        { hostname: '127.0.0.1', port: LISTEN_PORT, path: '/api/health' }, 
        (res) => {
            res.on('data', () => {
                // ignore
            })
            res.on('end', () => {
                if(res.statusCode === 204 || res.statusCode === 200) {
                    console.info('OK')
                    process.exit(0)
                } else {
                    console.error('ERROR', res.statusCode, res.statusMessage)
                    process.exit(1)
                }
            });
        })
    .on('error', (err) => {
        console.error('ERROR', -1, err);
        process.exit(2);
    })
  .end();