const MODULE_NAME = 'KOMODO-SDK.COREAPI';

const request = require('request');
const logger = require('tektrans-logger');
const coreUrl = require('../core-url');

function isLogDisabled() {
    return global.KOMODO_SDK_NO_LOG_ON_COREAPI;
}

if (!isLogDisabled()) {
    logger.verbose(`${MODULE_NAME} 229BAC11: Initialized`, {
        coreUrl,
    });
}

function doRequest(params, cb) {
    return new Promise((resolve) => {
        const options = {
            url: `${coreUrl}/${params.path.replace(/^\/+/, '')}`,
            method: params.method || 'GET',
            qs: params.qs || null,
        };

        if (!isLogDisabled()) {
            logger.verbose(`${MODULE_NAME} 73C28396: Requesting to CORE`, {
                xid: params.xid, method: options.method, fullpath: options.url, qs: options.qs,
            });
        }

        request(options, (err, res, body) => {
            if (err) {
                if (!isLogDisabled()) {
                    logger.warn(`${MODULE_NAME} 01738CB9: Error doing HTTP ${options.method} to CORE`, {
                        xid: params.xid,
                        eCode: err.code,
                        eMessage: err.message || err.toString(),
                    });
                }

                resolve([err]);
                if (typeof cb === 'function') cb(err);
                return;
            }

            if (res.statusCode !== 200) {
                const errStatusCode = new Error(`${MODULE_NAME} 39685CF2: CORE responded with non HTTP STATUS CODE 200`);
                if (!isLogDisabled()) {
                    logger.warn(errStatusCode, {
                        xid: params.xid,
                        httpStatus: res.statusCode,
                        body,
                    });
                }

                resolve([errStatusCode]);
                if (typeof cb === 'function') cb(errStatusCode);
                return;
            }

            let bodyObject;
            try {
                bodyObject = JSON.parse(body);
            } catch (e) {
                const errNoJson = new Error('COREAPI: CORE responded with non JSON body');
                if (!isLogDisabled()) logger.verbose(errNoJson, { body });

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
