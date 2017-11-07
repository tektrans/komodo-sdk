"use strict";

const request = require('request');

const config = require('./config');
const logger = require('./logger');
const matrix = require('./matrix');

let module_type;

function sendHeartbeat() {
    if (!config || !config.core_url || !module_type) { return; }

    let heartbeat_name = config.handler_name || config.origin;
    if (config.username) {
        heartbeat_name += '/' + config.username;
    }

    if (!heartbeat_name) {
        logger.warn('Unknown heartbeat name, skip sending heartbeat');
        return;
    }

    const requestOptions =  {
        uri: config.core_url + '/heartbeats',
        method: 'POST',
        json: {
            name: heartbeat_name,
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
    logger.verbose('Set heartbeat module type as ' + value + ' and starting to send heartbeat per interval');
    module_type = value;
    sendHeartbeat();
}

exports.setModuleType = setModuleType;
