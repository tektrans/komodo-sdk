const request = require('request');

const logger = require('tektrans-logger');
const coreURLLib = require('../../core-url');

function coreUrl() {
    return coreURLLib;
}

function doRequest(corePath, qs, cb) {
    const requestOptions = {
        url: coreUrl() + corePath,
        qs,
    };

    request(requestOptions, (error, response, body) => {
        if (error) {
            logger.warn('Error requesting to core', {
                requestOptions, error,
            });

            if (cb) {
                cb(error);
            }

            return;
        }

        if (response.statusCode !== 200) {
            logger.warn(`Core return http status code ${response.statusCode}`, {
                requestOptions, httpStatus: response.statusCode,
            });

            if (cb) {
                cb('ER_HTTP_STATUS');
            }
            return;
        }

        logger.verbose('Core response on request');

        if (cb) {
            cb(null, body);
        }
    });
}

function doRequestAndParse(corePath, qs, cb) {
    doRequest(corePath, qs, (error, coreResponseBody) => {
        if (error) {
            cb(error);
            return;
        }

        let coreResponseObj;

        try {
            coreResponseObj = JSON.parse(coreResponseBody);
        } catch (e) {
            logger.warn(
                'ER_CORE_RESPONSE_IS_NOT_VALID_JSON',
                {
                    error: e,
                    core_path: corePath,
                    qs,
                    core_response_body: coreResponseBody,
                },
            );

            cb('ER_CORE_RESPONSE_IS_NOT_VALID_JSON');
            return;
        }

        cb(null, coreResponseObj);
    });
}

exports.doRequest = doRequest;
exports.doRequestAndParse = doRequestAndParse;
