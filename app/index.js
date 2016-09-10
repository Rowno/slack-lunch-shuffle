'use strict';
const path = require('path');
const koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaHelmet = require('koa-helmet');
const koaRoute = require('koa-route');
const koaSession = require('koa-session');
const koaStatic = require('koa-static');
const koaViews = require('koa-views');
const mongoose = require('mongoose');
const nunjucks = require('nunjucks');
const config = require('./config');
const util = require('./util');
const oauthRoute = require('./oauth');
const commandRoute = require('./command');
const buttonsRoute = require('./buttons');

const PUBLIC_DIR = path.join(__dirname, 'public');
const TEMPLATE_DIR = path.join(__dirname, 'templates');
let server;

// Configure mongoose to return native Promises
mongoose.Promise = global.Promise;


/**
 * Gracefully stops the server.
 *
 * @param {number} exitCode Process exit code.
 */
function shutdown(exitCode) {
    console.log('Server stopping...');

    server.close(() => {
        mongoose.disconnect(() => {
            console.log('Server stopped');
        });
    });

    process.exitCode = exitCode;
}


// Gracefully stop the server on system signals

// Termination signal sent by Systemd on stop
process.on('SIGTERM', () => shutdown(0));
// Interrupt signal sent by Ctrl+C
process.on('SIGINT', () => shutdown(0));


// Crash on unhandled Promise rejections (will become default behaviour soon https://github.com/nodejs/node/pull/6375)
process.on('unhandledRejection', (err) => {
    if (err instanceof Error) {
        console.error(err.stack);
    } else {
        console.error(`Promise rejected with value: ${util.inspect(err)}`);
    }

    shutdown(1);
});


const app = koa();

// Signed cookie keys
app.keys = config.get('cookiekeys');
if (!Array.isArray(app.keys)) {
    app.keys = [app.keys];
}

nunjucks.configure(TEMPLATE_DIR);
app.use(koaHelmet());
app.use(koaStatic(PUBLIC_DIR));
app.use(koaViews(TEMPLATE_DIR, { map: { html: 'nunjucks' } }));
app.use(koaBodyParser());
app.use(koaSession(app));


function *home() {
    yield util.login(this.state, this.session, this.request.body.password);

    yield this.render('home');
}

app.use(koaRoute.get('/', home));
app.use(koaRoute.post('/', home));
app.use(koaRoute.get('/oauth', oauthRoute));
app.use(koaRoute.post('/buttons', buttonsRoute));
app.use(koaRoute.post('/command', commandRoute));


console.log('Server starting...');
mongoose.connect(config.get('mongouri')).then(() => {
    server = app.listen(config.get('port'), () => {
        console.log(`Server started at http://localhost:${config.get('port')}`);
    });
});
