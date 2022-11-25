const routerMain = require('./router-main');
const routerLogin = require('./router-login');
const routerConfig = require('./router-config');

function init(app) {
    app.use('/login', routerLogin);
    app.use('/', routerMain);
    app.use('/config', routerConfig);
}

exports.init = init;
