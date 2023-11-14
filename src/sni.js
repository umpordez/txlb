const sni = module.exports;
const tls = require('tls');
const servernameRe = /^[a-z0-9.-]+$/i;
const logger = require('./logger');

// a nice, round, irrational number - about every 6¼ hours
const refreshOffset = Math.round(Math.PI * 2 * (60 * 60 * 1000));
// and another, about 15 minutes
const refreshStagger = Math.round(Math.PI * 5 * (60 * 1000));
// and another, about 30 seconds
const smallStagger = Math.round(Math.PI * (30 * 1000));

async function tryGetServerNameInDb(servername, greenlock, isValidServerName) {
    const isValid = await isValidServerName(servername);
    if (!isValid) { return null; }

    await greenlock.add({
        subject: servername,
        altnames: [ servername ]
    });

    return greenlock.get({ servername });
}

// secureOpts.SNICallback = sni.create(greenlock, secureOpts);
sni.create = function(greenlock, secureOpts) {
    const _cache = {};
    const defaultServername = greenlock.servername || '';

    if (secureOpts.cert) {
        // Note: it's fine if greenlock.servername is undefined,
        // but if the caller wants this to auto-renew, they should define it
        _cache[defaultServername] = {
            refreshAt: 0,
            secureContext: tls.createSecureContext(secureOpts)
        };
    }

    function notify(ev, args) {
        try {
            // TODO _notify() or notify()?
            (greenlock.notify || greenlock._notify)(ev, args);
        } catch (e) {
            logger.error(e);
            logger.error(ev, args);
        }
    }

    function getSecureContext(servername, cb) {
        if (typeof servername !== 'string') {
            // this will never happen... right? but stranger things have...
            logger.error('[sanity fail] non-string servername:', servername);
            cb(new Error('invalid servername'), null);
            return;
        }

        const secureContext = getCachedContext(servername);
        if (secureContext) {
            cb(null, secureContext);
            return;
        }

        getFreshContext(servername)
            .then(function(secContext) {
                if (secContext) {
                    cb(null, secContext);
                    return;
                }

                notify('servername_unknown', { servername });
                cb(null, getDefaultContext());
            }).catch(function(err) {
                if (!err.context) {
                    err.context = 'sni_callback';
                }
                notify('error', err);
                logger.error(err);
                cb(err);
            });
    }

    function getCachedMeta(servername) {
        const meta = _cache[servername];

        if (!meta) {
            if (!_cache[wildname(servername)]) { return null; }
        }

        return meta;
    }

    function getCachedContext(servername) {
        const meta = getCachedMeta(servername);
        if (!meta) { return null; }

        // always renew in background
        if (!meta.refreshAt || Date.now() >= meta.refreshAt) {
            getFreshContext(servername).catch(function(e) {
                if (!e.context) {
                    e.context = 'sni_background_refresh';
                }
                notify('error', e);
            });
        }

        // under normal circumstances this would never be expired
        // and, if it is expired, something is so wrong it's probably
        // not worth wating for the renewal - it has probably failed
        return meta.secureContext;
    }

    function getFreshContext(servername) {
        const meta = getCachedMeta(servername);
        if (!meta && !validServername(servername)) {
            if (servername) {
                // Change this once
                // A) the 'notify' message passing is verified
                // fixed in cluster mode

                // B) we have a good way to let people know their
                // server isn't configured

                logger.info('debug: invalid servername: ' +
                    `${servername}` +
                '(its probably just a bot trolling for vulnerable servers)');

                notify('servername_invalid', { servername });
            }
            return Promise.resolve(null);
        }

        if (meta) {
            // prevent stampedes
            meta.refreshAt = Date.now() + randomRefreshOffset();
        }

        // TODO don't get unknown certs at all,
        // rely on auto-updates from greenlock
        // Note: greenlock.get() will return an
        // existing fresh cert or issue a new one
        return greenlock.get({ servername }).then(async function(result) {
            if (!result) {
                result = await tryGetServerNameInDb(servername, greenlock);
            }

            let metadata = getCachedMeta(servername);
            if (!metadata) {
                metadata = _cache[servername] = {
                    secureContext: { _valid: false }
                };
            }
            // prevent from being punked by bot trolls
            metadata.refreshAt = Date.now() + smallStagger;

            // nothing to do
            if (!result) {
                return null;
            }

            // we only care about the first one
            const pems = result.pems;
            const site = result.site;
            if (!pems || !pems.cert) {
                // nothing to do
                // (and the error should have been reported already)
                return null;
            }

            metadata = {
                refreshAt: Date.now() + randomRefreshOffset(),
                secureContext: tls.createSecureContext({
                    // TODO support passphrase-protected privkeys
                    key: pems.privkey,
                    cert: `${pems.cert}\n${pems.chain}\n`
                })
            };
            metadata.secureContext._valid = true;

            // copy this same object into every place
            (result.altnames || site.altnames ||
                [result.subject || site.subject]
            ).forEach(function(altname) {
                _cache[altname] = metadata;
            });

            return metadata.secureContext;
        });
    }

    function getDefaultContext() {
        return getCachedContext(defaultServername);
    }

    return getSecureContext;
};

// whenever we need to know when to refresh next
function randomRefreshOffset() {
    const stagger = Math.round(refreshStagger / 2) -
                    Math.round(Math.random() * refreshStagger);

    return refreshOffset + stagger;
}

function validServername(servername) {
    // format and (lightly) sanitize sni so that users can be naive
    // and not have to worry about SQL injection or fs discovery

    servername = (servername || '').toLowerCase();
    // hostname labels allow a-z, 0-9, -, and are separated by dots
    // _ is sometimes allowed, but not as a "hostname",
    // and not by Let's Encrypt ACME

    // REGEX
    // eslint-disable-next-line max-len
    // https://www.codeproject.com/Questions/1063023/alphanumeric-validation-javascript-without-regex
    return servernameRe.test(servername) && servername.indexOf('..') === -1;
}

function wildname(servername) {
    return `*.${servername.split('.').slice(1).join('.')}`;
}
