'use strict';

const redis = require('redis');
const config = require('./config');

const redisClient = config.redis && redis.createClient(config.redis);

function composeKeyword(name) {
    return `CHONGLEE_COUNTER_${name}}`;
}

exports.increment = (name) => {
    redisClient && redisClient.INCR(composeKeyword(name), () => {});
}

exports.reset = (name) => {
    redisClient && redisClient.DEL(composeKeyword(name), () => {});
}

exports.set = (name, value) => {
    redisClient && redisClient.SET(composeKeyword(name), Number(value), () => {});
}

exports.get = (name) => {
    return new Promise((resolve) => {
        if (!redisClient) {
            resolve(0);
            return;
        }

        redisClient.GET(composeKeyword(name), (err, reply) => {
            if (err) {
                resolve(0);
                return;
            }

            resolve(Number(reply) || 0);
        });
    });
}