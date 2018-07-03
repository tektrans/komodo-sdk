"use strict";

const pkginfo = require('pkginfo')(module, 'version');
const simpleGit = require('simple-git');
//const macaddress = require('macaddress');
const machineid = require('node-machine-id');
//const sha1 = require('sha1');

const matrix = {
    //host_id: {}
    machineid: machineid.machineIdSync(),
    machineid_readable: null,
    komodosdk_type: 'nodejs',
    komodosdk_version: module.exports.version,
};

matrix.machineid_readable = matrix.machineid.match(/.{1,4}/g).join('-');

// get active git version
simpleGit(process.cwd()).raw(
    ['describe'],
    function(err, result) {
        if (!err) {
            if (result) {
                result = result.trim();
            }
            matrix.version_active = result;
        }
    }
)

/*
macaddress.one(function(err, mac) {
    if (err) return;

    matrix.host_id.mac = mac;
})

matrix.host_id.machineid = machineid.machineIdSync();
matrix.host_id_hash = sha1('KOMODO' + matrix.host_id.machineid + matrix.host_id.mac);
*/

module.exports = matrix;
