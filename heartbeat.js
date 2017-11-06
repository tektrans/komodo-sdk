"use strict";

const request = require('request');

const config = require('./config');
const logger = require('./logger');
const matrix = require('./matrix');

function sendHeartbeat() {
    if (!config || !config.core_url) { return; }

    const requestOptions =  {
        url: config.core_url + '/heartbeats',
        form: {
            name: config.handler_name,
            module_type: 'gateway',
            config: JSON.stringify(config),
            matrix: JSON.stringify(matrix)
        }
    }

    request.post(requestOptions);
}

sendHeartbeat();
setInterval(
    sendHeartbeat,
    60 * 1000
)
