"use strict";

const request = require('request');

const config = require('komodo-sdk/config');
const logger = require('komodo-sdk/logger');
const core_url = require('../../core-url');


function coreUrl() {
    return core_url;
}

function doRequest(core_path, qs, cb) {

    let requestOptions = {
        url: coreUrl() + core_path,
        qs: qs
    }

    request(requestOptions, function(error, response, body) {
        if (error) {
            logger.warn('Error requesting to core', {requestOptions: requestOptions, error: error});
            if (cb) {
                cb(error);
            }
            return;
        }

        if (response.statusCode != 200) {
            logger.warn('Core return http status code ' + response.statusCode, {requestOptions: requestOptions, httpStatus: response.statusCode});
            if (cb) {
                cb('ER_HTTP_STATUS');
            }
            return;
        }

        logger.verbose('Core response on request');
        //logger.verbose('Core response on request', {body: body});

        if (cb) {
            cb(null, body);
        }
    });
}

function doRequestAndParse(core_path, qs, cb) {
    doRequest(core_path, qs, function(error, core_response_body) {
        if (error) {
            cb(error);
            return;
        }

        let core_response_object;

        try {
            core_response_object = JSON.parse(core_response_body);
        }
        catch(e) {
            logger.warn(
                'ER_CORE_RESPONSE_IS_NOT_VALID_JSON',
                {
                    error: e,
                    core_path: core_path,
                    qs: qs,
                    core_response_body: core_response_body
                }
            );

            cb('ER_CORE_RESPONSE_IS_NOT_VALID_JSON');
            return;
        }

        cb(null, core_response_object);
    });
}

exports.doRequest = doRequest;
exports.doRequestAndParse = doRequestAndParse;
