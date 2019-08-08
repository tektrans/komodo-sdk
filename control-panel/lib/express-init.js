"use strict";

const path = require('path');

const express = require('express');
const session = require('express-session');
const nunjucks = require('nunjucks');
const uniqid = require('uniqid');
const numeral = require('numeral');

const config = require('komodo-sdk/config');
const logger = require('komodo-sdk/logger');

const routers = require('./routers');

// skip if no approriate config
if (!config || !config.control_panel || !config.control_panel.listen_port) {
    return;
}

const app = express();

app.locals.config = config;
app.locals.title = config.control_panel.title || config.handler_name || config.username || config.origin;
app.locals.cp_views_dir = path.dirname(__dirname) + '/views';
app.locals.cp_template = app.locals.cp_views_dir + '/template.html';

// session
app.use(session({
    secret: config.control_panel.session_secret || uniqid(),
    resave: true,
    saveUninitialized: false,
    name: config.control_panel.session_name || config.handler_name || config.origin
}));

const static_dir = path.dirname(__dirname) + '/views-static';
app.use(express.static(static_dir, {maxAge: 24 * 3600 * 1000}));

// nunjucks environment
let nunjucksEnv = nunjucks.configure('', {
    autoescape: true,
    express: app,
    noCache: config.control_panel.template_no_cache
});

numeral.register('locale', 'id', {
    delimiters: {
        thousands: '.',
        decimal: ','
    },
    abbreviations: {
        thousand: 'ribu',
        million: 'juta',
        billion: 'miliar',
        trillion: 'triliun'
    },
    currency: {
        symbol: 'Rp.'
    }
});
numeral.locale('id');


nunjucksEnv.addFilter('numeral', function(num) {
    return numeral(num).format();
})

routers.init(app);

// start http server
app.listen(config.control_panel.listen_port, function () {
    logger.info('Web control panel started', {listen_port: config.control_panel.listen_port, cp_views_dir: app.locals.cp_views_dir, static_dir: static_dir});
});
