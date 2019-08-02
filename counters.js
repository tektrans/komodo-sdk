'use strict';

const redis = require('redis');
const config = require('./config');

const redisClient = redis.createClient(config.redis || { host: '127.0.0.1' });

function composeKeyword(name) {
    return `CHONGLEE_COUNTER_${name}}`;
}

exports.increment = (name) => {
    redisClient.INCR(composeKeyword(name));
}

exports.reset = (name) => {
    redisClient.DEL(composeKeyword(name));
}

exports.set = (name, value) => {
    redisClient.SET(composeKeyword(name), Number(value));
}

exports.get = (name) => {
    return new Promise((resolve) => {
        redisClient.GET(composeKeyword(name), (err, reply) => {
            if (err) {
                resolve(0);
                return;
            }

            resolve(Number(reply) || 0);
        });
    });
}