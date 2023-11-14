const http = require('http');

const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');

const fs = require('fs');
const _ = require('lodash');
const logger = require('./logger');

module.exports = (config = {}) => {
    return async function onRequest(req, res) {
        const pathname = req.url;
        const domain = req.headers.host;

        const static = config.staticFileCheck &&
            config.staticFileCheck(req, domain, pathname);

        if (static) {
            logger.info(`[${ip}] ${req.url} static > ${static.path}`);

            serveStatic(static.path, {
                cacheControl: true,
                etag: true,
                immutable: true,
                maxAge: '360d',
                lastModified: true,
                ...(static.config || {})
            })(req, res, finalhandler(req, res));

            return;
        }

        const options = {
            port: 7000,
            path: req.url,
            method: req.method,

            headers: {
                ...req.headers,
                'x-forwarded-for': req.headers['x-forwarded-for'] ||
                    req.connection.remoteAddress || '0.0.0.0'
            },

            ...(config?.getProxyConfig(req) || {})
        };

        const { hostname, port } = options;
        const ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress || '0.0.0.0';

        logger.info(`[${ip}] ${req.url} > ${hostname}:${port}`);

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
