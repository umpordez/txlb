const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const pathHelper = require('../pathHelper');
const fileNames = require('../fileNames');

const getPaths = (opts, options, id) => [
    pathHelper.certificatesPath(options, id, fileNames.privkey.pem),
    pathHelper.certificatesPath(options, id, fileNames.cert),
    pathHelper.certificatesPath(options, id, fileNames.chain)
];

const getPromises = (options, paths) => {
    let promises = [];

    for (let i = 0; i < paths.length; i++) {
        const key = paths[i];

        const promise = s3
            .getObject({ Key: key, Bucket: options.bucketName })
            .promise()
            .then((data) => {
                return data.Body.toString();
            });

        promises.push(promise);
    }

    return promises;
};

module.exports.check = (opts, options) => {
    const id = opts.certificate && opts.certificate.id || opts.subject;

    const paths = getPaths(opts, options, id);
    const promises = getPromises(options, paths);

    return Promise.all(promises).then((values) => ({
        privkey: values[0],
        cert: values[1],
        chain: values[2]
    })).catch((ex) => null);
};
