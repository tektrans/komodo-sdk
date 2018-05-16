"use strict";

/**
 * heartbeat2, blm ready
 */

const request = require('request');

const config = require('../config');
const logger = require('../logger');
const matrix = require('../matrix');
const core_url = require('../core-url');

let module_type;

function setModuleType(value) {
    module_type = value;
    send();
}


function send() {
    const data = {
        name: config.handler_name || config.origin,
        module_type: module_type,
        products: config.products,
        remote_products: config.remote_products
    }
}

exports.setModuleType = setModuleType;
exports.send = send;
