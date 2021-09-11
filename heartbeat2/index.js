/**
 * heartbeat2, blm ready
 */


const config = require('../config');

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
