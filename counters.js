'use strict';

const redis = require('redis');
const config = require('./config');

const redisClient = redis.createClient(config.redis || { host: '127.0.0.1' });

function composeKeyword(name, subname) {
    return `CHONGLEE_MODEM_COUNTER_${name}_${subname || ''}`;
}

exports.increment = (name, subname) => {
    redisClient.INCR(composeKeyword(name, subname));
}

exports.reset = (name, subname) => {
    redisClient.DEL(composeKeyword(name, subname));
}

exports.set = (name, subname, value) => {
    redisClient.SET(composeKeyword(name, subname), Number(value));
}

exports.get = (name, subname) => {
    return new Promise((resolve) => {
        redisClient.GET(composeKeyword(name, subname), (err, reply) => {
            if (err) {
                resolve(0);
                return;
            }

            resolve(Number(reply) || 0);
        });
    });
}