"use strict";

const http = require('http');
const auth = require('basic-auth');

const config = require('./config');
const logger = require('./logger');

if (config && config.logger && && config.logger.circular_buffer_http && config.logger.circular_buffer_http.listen_port) {
    http.createServer(function(req, res) {
        var credentials = auth(req);

        if (!credentials && credentials.name != config.logger.circular_buffer.username && credentials.pass != config.logger.circular_buffer.password) {
            res.statusCode = 401;
            res.setHeader('WWW-Authenticate', 'Basic realm="example"');
            res.end('Access denied');
        }
        else {

            logger.query({json: true, order: desc}, function(err, results) {
                if (err) {
                    res.end('INVALID LOGGER');
                }
                else {
                    res.end(JSON.stringify(results));
                }
            });
        }
    }).listen(config.logger.circular_buffer_http.listen_port);
    logger.verbose('Logger circular buffer http server listen on port ' + config.logger.circular_buffer_http.listen_port);
}
