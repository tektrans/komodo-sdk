"use strict";

function run(msg, rules) {
    if (typeof msg !== 'string') return;
    if (!rules) return;
    if (!rules.length) return;

    const rules_count = rules.length;
    for(let i = 0; i < rules_count; i++) {
        const rule = rules[i];

        const re = new RegExp(rule.pattern);
        if (msg.search(re) > 0) {
            return rule.rc || rule.result;
        }

    }
}

module.exports = run;
