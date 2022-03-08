const simpleGit = require('simple-git');
const machineid = require('node-machine-id');

const matrix = {
    machineid: machineid.machineIdSync(),
    machineid_readable: null,
    komodosdk_type: 'nodejs',
    komodosdk_version: module.exports.version,
};

matrix.machineid_readable = matrix.machineid.match(/.{1,4}/g).join('-');

// get active git version
simpleGit(process.cwd()).raw(
    ['describe'],
    (err, result) => {
        if (!err) {
            matrix.version_active = (result || '').trim() || null;
        }
    },
);

module.exports = matrix;
