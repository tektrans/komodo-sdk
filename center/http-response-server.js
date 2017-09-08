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
    logger.vebose('CEKIDOT');
    response.end('OK');
    const qs = url.parse(request.url, true).query;
    logger.verbose('Got reverse report from CORE', {qs: qs});

    if (!transport || !transport.send) {
        logger.warn('UNDEFINED TRANSPORT, not forwarding message from CORE');
        return;
    }

    if (!qs.terminal_name || !qs.message) {
        return;
    }

    transport.send(qs.terminal_name, qs.message, qs);
}

function setTransport(newTransport) {
    transport = newTransport;
}

function create() {
    let listenPort = config.listen_port;

    http.createServer(onRequest).listen(listenPort, function() {
        logger.info('HTTP Reverse/Report server listen on port ' + listenPort + ' to process CORE message');
    });;
}

create();

exports.setTransport = setTransport;
