const logger = require('tektrans-logger');
const config = require('./config');
const configFiller = require('./config-filler');

function replace(new_config) {
    for (let key in new_config) {
        config[key] = new_config[key];
    }

    _removeIfNotExists(new_config);
    configFiller.go();
}

function reload() {
    const configFile = process.cwd() + "/config.json";
    const new_config = require(configFile);

    replace(new_config);
}

function _removeIfNotExists(new_config) {
    for (let key in config) {
        if (!new_config[key]) {
            logger.verbose('Removing old config key: ' + key);
            delete config[key];
        }
    }
}

exports.replace = replace;
exports.reload = reload;
