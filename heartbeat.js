"use strict";

const request = require('request');

const config = require('./config');
const logger = require('./logger');
const matrix = require('./matrix');

let module_type;

function sendHeartbeat() {
    if (!config || !config.core_url || !module_type) { return; }

    const requestOptions =  {
        uri: config.core_url + '/heartbeats',
        method: 'POST',
        json: {
            name: config.handler_name,
            module_type: module_type,
            config: config,
            matrix: matrix
        }
    }

    request.post(requestOptions);
}

setInterval(
    sendHeartbeat,
    60 * 1000
)

function setModuleType(value) {
    module_type = value;
    sendHeartbeat();
}

exports.setModuleType = setModuleType;
