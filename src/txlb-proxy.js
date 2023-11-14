const http = require('http');

const fs = require('fs');
const _ = require('lodash');
const logger = require('./logger');

module.exports = (config) => {
    return async function onRequest(req, res) {
        const pathname = req.url;
        const domain = req.headers.host;

        const options = {
            port: 7000,
            path: req.url,
            method: req.method,

            headers: {
                ...req.headers,
                'x-forwarded-for': req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress || '0.0.0.0'
            },

            ...config.getProxyConfig(req)
        };

        logger.info(`proxy: ${req.url} > ${options.hostname}:${options.port}`);

        const proxy = http.request(options, function(proxyRes) {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
        });

        proxy.on('error', (err) => {
            if ((/socket hang up/).test(err)) {
                return;
            }

            logger.error(err);
        });

        req.pipe(proxy, { end: true });
    };
};
