let path = require('path');

const defaultOptions = {
    accessKeyId: null,
    secretAccessKey: null,
    bucketName: null,
    bucketRegion: null,
    accountsDir: 'accounts/',
    configDir: 'acme/'
};

const pathHelper = require('./pathHelper');
const fileNames = require('./fileNames');

module.exports.create = (createOptions) => {
    const options = Object.assign({}, defaultOptions, createOptions);

    require('./aws')(options);

    const handlers = {
        certificates: require('./certificates')(options),
        accounts: require('./accounts')(options)
    };

    return handlers;

};
