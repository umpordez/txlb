const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const pathHelper = require('../pathHelper');
const fileNames = require('../fileNames');

const getObjects = (opts, options) => [
    {
        Key: pathHelper.certificatesPath(options, opts.subject, fileNames.cert),
        Body: opts.pems.cert
    },
    {
        Key: pathHelper.certificatesPath(options, opts.subject, fileNames.chain),
        Body: opts.pems.chain
    },
    {
        Key: pathHelper.certificatesPath(options, opts.subject, fileNames.fullchain),
        Body: [opts.pems.cert, opts.pems.chain].join('\n') // for Apache, Nginx, etc
    },
    {
        Key: pathHelper.certificatesPath(options, opts.subject, fileNames.bundle),
        Body: [opts.pems.privkey, opts.pems.cert, opts.pems.chain].join('\n') // for HAProxy
    }
];

const getPromises = (objects, options) => {
    let promises = [];

    for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        const promise = s3
            .putObject({
                Key: obj.Key,
                Body: obj.Body,
                Bucket: options.bucketName
            }).promise();

        promises.push(promise);
    }

    return promises;
};

module.exports.set = (opts, options) => {
    const objects = getObjects(opts, options);
    const promises = getPromises(objects, options);

    return Promise.all(promises).then((values) => null);
};
