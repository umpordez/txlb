const V = require('argument-validator');
const path = require('path');

const logger = require('./logger');

module.exports.create = async function(opts) {
    V.string(opts.maintainerEmail, 'opts.maintainerEmail');

    opts.aws = opts.aws || {};

    V.string(opts.aws.user, 'opts.aws.user');
    V.string(opts.aws.password, 'opts.aws.password');
    V.string(opts.aws.region, 'opts.aws.region');
    V.string(opts.aws.bucket, 'opts.aws.bucket');

    opts = opts || {};

    opts.packageAgent = 'txlb/0.0.1';

    const Greenlock = require('@root/greenlock');
    const greenlock = Greenlock.create(opts);

    greenlock.manager.defaults({
        store: {
            packageRoot: __dirname,
            accessKeyId: opts.aws.user,
            secretAccessKey: opts.aws.password,
            regionName: opts.aws.region,
            bucketName: opts.aws.bucket,
            debug: true,
            module: path.resolve(__dirname, './s3-store')
        }
    });

    greenlock.getAcmeHttp01ChallengeResponse = function(op) {
        return greenlock.challenges.get(op);
    };

    return greenlock;
};
