const AWS = require('aws-sdk');
const s3 = new AWS.S3({ apiVersion: '2006-03-01' });
const pathHelper = require('../pathHelper');
const fileNames = require('../fileNames');

module.exports.checkKeypair = (opts, options) => {
    const id = opts.account.id || opts.email || 'single-user';
    const key = pathHelper.accountsPath(options, id);

    return s3.getObject({
        Key: key,
        Bucket: options.bucketName
    }).promise().then((data) => {
        const keypair = JSON.parse(data.Body.toString());

        return {
            privateKeyPem: keypair.privateKeyPem, // string PEM private key
            privateKeyJwk: keypair.privateKeyJwk // object JWK private key
        };
    }).catch((err) => null);
};
