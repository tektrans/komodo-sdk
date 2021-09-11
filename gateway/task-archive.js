const redis = require("redis");

const config = require('../config');

let redis_client;

function init() {
    if (!config.redis) {
        return;
    }

    redis_client = redis.createClient(config.redis);
}

function keyword(task) {
    return 'geckoo_' + config.handler_name + '_' + task.trx_id;
}

function put(task) {
    if (!redis_client) {
        return;
    }

    const keyword = keyword(task);

    redis_client.set(keyword, JSON.stringify(task));
    redis_client.expire(keyword, 3600 * 24 * 15);
}

function get(task, cb) {
    if (!redis_client) {
        cb(null);
        return;
    }

    redis_client.get(keyword(task), function(res) {
        if (!res) {
            cb(null);
        }
        else {
            let resObj;

            try {
                resObj = JSON.parse(res);
            }
            catch(e) {
                cb(null);
                return;
            }
            
            cb(resObj);
        }
    });
}

init();

exports.put = put;
exports.get = get;
