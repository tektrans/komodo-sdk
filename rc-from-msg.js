"use strict";

function logOnDebug(msg) {
    if (process.env.KOMODO_SDK_DEBUG_RC_FROM_MSG) {
        console.log(msg);
    }
}

function run(msg, rules) {
    if (typeof msg !== 'string') return;
    if (!rules) return;
    if (!rules.length) return;

    const rules_count = rules.length;
    for(let i = 0; i < rules_count; i++) {
        const rule = rules[i];

        logOnDebug('RC-FROM-MSG: checking with rule: ' + JSON.stringify(rule));
        const re = (typeof rule.flags === 'string') ? new RegExp(rule.pattern, rule.flags) : new RegExp(rule.pattern);
        if (msg.search(re) > 0) {
            logOnDebug('RC-FROM-MSG: match with rule: ' + JSON.stringify(rule));
            return rule.rc || rule.result;
        }
    }
}

module.exports = run;
