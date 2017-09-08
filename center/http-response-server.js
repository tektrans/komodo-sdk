"use strict";

/**
 * HTTP Response Server
 *
 * Untuk menangkap respon dari core
 */


const http = require('http');
const url = require('url');

const config = require('../config');
const logger = require('../logger');

let transport;

function onRequest(request, response) {
    response.end('OK');
    var qs = url.parse(request.url, true).query;
    logger.verbose('Got reverse report from CORE', {qs: qs});

    if (transport && transport.send && qs && qs.terminal_name && qs.message) {
        transport.send(qs.terminal_name, qs.message);
    }
}

function setTransport(newTransport) {
    transport = newTransport;
}

function create() {
    let listenPort = config.listen_port;

    http.createServer(onRequest).listen(listenPort, function() {
        logger.info('HTTP Reverse/Report server listen on port ' + listenPort);
    });;
}

create();

exports.setTransport = setTransport;
