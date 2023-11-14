module.exports = (options) => {
    const handlers = {
        check: (opts) =>
            require('./certificates/check').check(opts, options),
        checkKeypair: (opts) =>
            require('./certificates/checkKeypair').checkKeypair(opts, options),

        setKeypair: (opts) =>
            require('./certificates/setKeypair').setKeypair(opts, options),

        set: (opts) =>
            require('./certificates/set').set(opts, options)
    };

    return handlers;
};
