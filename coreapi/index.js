const request = require('request');
const logger = require('tektrans-logger');
const coreUrl = require('../core-url');

function isLogDisabled() {
    return global.KOMODO_SDK_NO_LOG_ON_COREAPI;
}

isLogDisabled() || logger.verbose(`CORE URL: ${coreUrl}`);

function doRequest(params, cb) {
    return new Promise((resolve) => {
        const options = {
            url: `${coreUrl}/${params.path.replace(/^\/+/, '')}`,
            method: params.method || 'GET',
            qs: params.qs || null,
        };

        isLogDisabled() || logger.verbose('Requesting to CORE', {
            xid: params.xid, method: options.method, fullpath: options.url, qs: options.qs,
        });

        request(options, (err, res, body) => {
            if (err) {
                isLogDisabled() || logger.warn(`COREAPI: Error doing HTTP ${options.method} to CORE. ${err.toString()}`, { xid: params.xid });
                
                resolve([err]);
                if (typeof cb === 'function') cb(err);
                return;
            }

            if (res.statusCode !== 200) {
                const errStatusCode = new Error('COREAPI: CORE responded with non HTTP STATUS CODE 200');
                isLogDisabled() || logger.warn(`COREAPI: CORE returning HTTP STATUS CODE ${res.statusCode}, not 200`, { xid: params.xid, body });

                resolve([errStatusCode]);
                if (typeof cb === 'function') cb(errStatusCode);
                return;
            }

            let bodyObject;
            try {
                bodyObject = JSON.parse(body);
            } catch (e) {
                const errNoJson = new Error('COREAPI: CORE responded with non JSON body');
                isLogDisabled() || logger.verbose(errNoJson, {body});

                resolve([errNoJson, body]);
                if (typeof cb === 'function') cb(errNoJson, body);
                return;
            }

            resolve([null, bodyObject]);
            if (typeof cb === 'function') cb(null, bodyObject);
        });
    });
}

module.exports = doRequest;
