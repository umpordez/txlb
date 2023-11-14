const initServers = require('./src/txlb-server');
const initProxy = require('./src/txlb-proxy');

(async () => {
    try {
        await initServers({
            greenlock: {
                maintainerEmail: 'deividyz@gmail.com',
            },

            aws: {
                user: 'AKIA52DEAA3NQNGDO2GC',
                password: 'BB4ZJroc/ydzDmsTvzWEa0rcNL/QTd+fTd08LorQoLwI',
                region: 'sa-east-1',
                bucket: 'ssl.isei'
            },

            app: initProxy({
                getProxyConfig(req) {
                    return {
                        hostname: 'localhost'
                    };
                }
            })
        });
    } catch (ex) {
        console.error(ex);
    }
})();
