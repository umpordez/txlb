const path = require('path');
const tameWild = (wild) => wild.replace(/\*/g, '_');

module.exports = {
    certificatesPath: (options, id, fileName) => {
        const filePath = path.join(options.configDir, 'live', tameWild(id), fileName);
        return filePath;
    },

    accountsPath: (options, id) => {
        const filePath = path.join(options.configDir, options.accountsDir, `${tameWild(id)}.json`);
        return filePath;
    }
};
