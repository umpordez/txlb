const path = require('path');

const http = require('http');
const https = require('https');
const fs = require('fs');

const sni = require('./sni.js');
const logger = require('./logger');

const servernameRe = /^[a-z0-9.-]+$/i;
const challengePrefix = '/.well-known/acme-challenge/';

function sanitizeHostname(req) {
    const servername = getHostname(req)
        .toLowerCase()
        .replace(/:.*/, '');

    try {
        req.hostname = servername;
    } catch (e) {
        logger.error(e);
    }


    if (req.headers['x-forwarded-host']) {
        req.headers['x-forwarded-host'] = servername;
    }

    try {
        req.headers.host = servername;
    } catch (e) {
        logger.error(e);
    }

    return (
        servernameRe.test(servername) &&
        servername.indexOf('..') === -1 &&
        servername
    ) || '';
}

function getHostname(req) {
    return req.hostname ||
        req.headers['x-forwarded-host'] ||
        (req.headers.host || '');
}

function explainError(gl, err, ctx, hostname) {
    if (!err.servername) {
        err.servername = hostname;
    }
    if (!err.context) {
        err.context = ctx;
    }
    logger.error('[warning] network connection error:' +
        `${err.context || ''} ${err.message}`);

    (gl.notify || gl._notify)('error', err);
    return err;
}


function respondToError(gl, res, err, ctx, hostname) {
    err = explainError(gl, err, ctx, hostname);
    res.statusCode = 500;
    res.end('Internal Server Error [1004]: See logs for details.');
}

function respondWithGrace(res, result, hostname, token) {
    const keyAuth = result && result.keyAuthorization;

    if (keyAuth && typeof keyAuth === 'string') {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(keyAuth);
        return;
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify({
        error: {
            message: `domain '${hostname}' has no token '${token}'.`
        }
    }));
}

function skipChallenge(req, res, next, handler) {
    if (typeof handler === 'function') {
        return handler(req, res, next);
    } else if (typeof next === 'function') {
        return next();
    }

    res.statusCode = 500;
    res.end('Internal server error!');
}

function getHttpHandler(gl, handler) {
    return function(req, res, next) {
        const hostname = sanitizeHostname(req);

        req.on('error', function(err) {
            explainError(gl, err, 'http_01_middleware_socket', hostname);
        });

        if (!hostname || req.url.indexOf(challengePrefix) !== 0) {
            skipChallenge(req, res, next, handler);
            return;
        }

        let token = req.url.slice(challengePrefix.length);

        let done = false;

        const obj = { type: 'http-01', servername: hostname, token };
        gl.getAcmeHttp01ChallengeResponse(obj).catch((err) => {
            respondToError(
                gl, res, err,
                'http_01_middleware_challenge_response', hostname);

            done = true;

            return { __done: true };
        }).then((result) => {
            if (result && result.__done) { return; }

            if (done) {
                logger.error('Sanity check fail: `done` is in a quantum ' +
                    'state of both true and false... huh?');
                return;
            }

            return respondWithGrace(res, result, hostname, token);
        }).catch((err) => {
            logger.error(err);

            try {
                res.end('Internal Server Error [1003]: See logs for details.');
            } catch (e) {
                logger.error(e);
            }
        });
    };
}

async function initServers(config) {
    const { app } = config;

    const greenlock = await require('./greenlock').create({
        packageRoot: __dirname,
        configDir: './greenlock.d',
        cluster: false,
        aws: config.aws,
        ...config.greenlock
    });

    // eslint-disable-next-line max-len
    // https://git.rootprojects.org/root/greenlock-express.js/src/branch/master/servers.js
    const _http = http.createServer(getHttpHandler(greenlock, app));

    _http.listen(80, '0.0.0.0', () => {
        logger.info('Listening port 80');

        const secureOpts = {};
        secureOpts.SNICallback = sni.create(greenlock, secureOpts);

        const _https = https.createServer(secureOpts, app);

        _https.listen(443, '0.0.0.0', function() {
            logger.info('Listening port 443');
        });
    });
}

module.exports = initServers;
