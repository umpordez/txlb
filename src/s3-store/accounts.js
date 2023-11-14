module.exports = (options) => {
    const handlers = {
        check: (opts) => require('./accounts/check').check(opts, options),
        checkKeypair: (opts) => require('./accounts/checkKeypair').checkKeypair(opts, options),
        setKeypair: (opts) => require('./accounts/setKeypair').setKeypair(opts, options),
        set: (opts) => require('./accounts/set').set(opts, options)
    };
    return handlers;
};
