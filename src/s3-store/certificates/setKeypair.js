const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const pathHelper = require('../pathHelper');
const fileNames = require('../fileNames');

module.exports.setKeypair = (opts, options) => {
    const id = (opts.certificate && (
        opts.certificate.kid ||
        opts.certificate.id
    )) || opts.subject;

    const pemKeyPath = pathHelper
        .certificatesPath(options, id, fileNames.privkey.pem);

    return s3.putObject({
        Key: pemKeyPath,
        Body: opts.keypair.privateKeyPem,
        Bucket: options.bucketName
    }).promise().then((data) => { return null; });
};
