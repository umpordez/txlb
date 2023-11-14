const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const pathHelper = require('../pathHelper');
const fileNames = require('../fileNames');

module.exports.setKeypair = (opts, options) => {
    const id = opts.account.id || opts.email || 'single-user';
    const key = pathHelper.accountsPath(options, id);

    const body = JSON.stringify({
        privateKeyPem: opts.keypair.privateKeyPem, // string PEM
        privateKeyJwk: opts.keypair.privateKeyJwk // object JWK
    });

    return s3.putObject({
        Key: key,
        Body: body,
        Bucket: options.bucketName
    }).promise().then((data) => null).catch((err) => null);
};
