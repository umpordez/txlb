const AWS = require('aws-sdk');
const pathHelper = require('../pathHelper');
const fileNames = require('../fileNames');

module.exports.checkKeypair = (opts, options) => {
    const s3 = new AWS.S3({ apiVersion: '2006-03-01' });

    const id = (
        opts.certificate && (
            opts.certificate.kid ||
            opts.certificate.id
        )) || opts.subject;

    const pemKeyPath = pathHelper
        .certificatesPath(options, id, fileNames.privkey.pem);

    return s3
        .getObject({ Key: pemKeyPath, Bucket: options.bucketName })
        .promise()
        .then((data) => {
            return {
                privateKeyPem: data.Body.toString()
            };
        }).catch((ex) => null);
};
