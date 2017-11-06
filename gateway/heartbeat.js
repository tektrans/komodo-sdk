"use strict";

const request = require('request');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');

function sendHeartbeat() {
    if (!config || !config.core_url) { return; }

    const requestOptions =  {
        url: config.core_url + '/heartbeat/gateway',
        form: {
            name: config.handler_name,
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
