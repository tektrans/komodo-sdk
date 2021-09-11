require('winston-circular-buffer');

// THIS MODULE IS OBSOLETED

const http = require('http');
const auth = require('basic-auth');

const logger = require('./logger');

function listen(options) {
    if (options && options.port && options.username && options.password) {

        http.createServer(function(req, res) {
            var credentials = auth(req);

            if (!credentials && credentials.name != options.username && credentials.pass != options.password) {
                res.statusCode = 401;
                res.setHeader('WWW-Authenticate', 'Basic realm="example"');
                res.end('Access denied');
            }
            else {

                res.json([]);
                /*
                logger.query({json: true, order: desc}, function(err, results) {
                    if (err) {
                        res.end('INVALID LOGGER');
                    }
                    else {
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(results));
                    }
                });
                */
            }
        }).listen(options.port);

        logger.verbose('Logger circular buffer http server listen on port ' + options.port);
    }
    else {
        logger.verbose('Circular buffer logger http server viewer is not configured. Please set options.port, options.username, options.password');
    }

}

exports.listen = listen;
