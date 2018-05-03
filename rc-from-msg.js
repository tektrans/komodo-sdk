"use strict";

function logOnDebug(msg) {
    if (process.env.KOMODO_SDK_DEBUG_RC_FROM_MSG) {
        console.log(msg);
    }
}

function run(msg, rules) {
    if (typeof msg !== 'string') {
        logOnDebug('RC-FROM-MSG: invalid msg type === ' + typeof msg);
        return;
    }
    if (!rules) {
        logOnDebug('RC-FROM-MSG: invalid rules');
        return;
    }
    if (!rules.length) {
        logOnDebug('RC-FROM-MSG: rules is empty');
        return;
    }

    const rules_count = rules.length;
    for(let i = 0; i < rules_count; i++) {
        const rule = rules[i];

        if (typeof rule.pattern !== 'string') {
            continue;
        }

        if (typeof rule.rc !== 'string' && typeof rule.result !== 'string') {
            continue;
        }

        logOnDebug('RC-FROM-MSG: checking with rule: ' + JSON.stringify(rule));
        const re = (typeof rule.flags === 'string') ? new RegExp(rule.pattern, rule.flags) : new RegExp(rule.pattern);
        if (msg.search(re) > 0) {
            logOnDebug('RC-FROM-MSG: match with rule: ' + JSON.stringify(rule));
            return rule.rc || rule.result;
        }
    }
}

module.exports = run;
