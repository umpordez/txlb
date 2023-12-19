const http = require('http');

const finalhandler = require('finalhandler');
const serveStatic = require('serve-static');

const httpProxy = require('http-proxy');

const fs = require('fs');
const _ = require('lodash');
const logger = require('./logger');

const proxyServer = httpProxy.createProxyServer({});;

module.exports = (config = {}) => {
    return async function onRequest(req, res) {
        const pathname = req.url;
        const domain = req.headers.host;

        const static = config.staticFileCheck &&
            config.staticFileCheck(req, domain, pathname);

        const ip = req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress || '0.0.0.0';

        if (!req.connection.encrypted) {
            res.writeHead(302, {
                'Location': `https://${domain}${req.originUrl || req.url}`
            });

            res.end();
            return;
        }

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

        const { port, hostname, redirect } = await config.getProxyConfig(req);

        if (redirect) {
            logger.info(`[${ip}] ${req.url} redirect> ${redirect}`);

            res.writeHead(302, { 'Location': redirect });
            res.end();
            return;
        }

        logger.info(`[${ip}] ${req.url} > ${hostname}:${port}`);

        proxyServer.web(req, res, {
            target: `http://${hostname}:${port}`,
            xfwd: true
        }, function(e) {
            logger.error(e);
        });
    };
};
