const AWS = require('aws-sdk');

module.exports = (options) => {
    AWS.config.setPromisesDependency(Promise);

    AWS.config.update({
        region: options.bucketRegion,
        credentials: new AWS.Credentials({
            accessKeyId: options.accessKeyId,
            secretAccessKey: options.secretAccessKey
        })
    });
};
