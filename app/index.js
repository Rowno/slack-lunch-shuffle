'use strict';
const path = require('path');
const got = require('got');
const koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaRoute = require('koa-route');
const koaSession = require('koa-session');
const koaViews = require('koa-views');
const mongoose = require('mongoose');
const nunjucks = require('nunjucks');
const util = require('./util');
const Team = require('./schema').Team;

const PORT = 8000;
const DATABASE_HOST = 'localhost';
const DATABASE_NAME = 'lunch-shuffle';
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const PASSWORD = 'lunchshuffle'; // Lunch shuffle login password
const SLACK_CLIENT_ID = '11206583287.53960855157';
const SLACK_CLIENT_SECRET = '43d68bd92cb3b95f8f71db6a80445c0a';
const SLACK_VERIFICATION_TOKEN = 'jalEovUWU3MjUGdJcrDwIUul';


// Configure mongoose to return native Promises
mongoose.Promise = global.Promise;
let server;


/**
 * Gracefully stops the server
 *
 * @param {number} exitCode Process exit code
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
app.keys = ['$Jqik9oP9ifvewR*evvH']; // Signed cookie keys
nunjucks.configure(TEMPLATE_DIR);
app.use(koaViews(TEMPLATE_DIR, { map: { html: 'nunjucks' } }));
app.use(koaBodyParser());
app.use(koaSession(app));


/**
 * Tries to log in the user to lunch shuffle
 *
 * @param {object} state Koa this.state
 * @param {object} session Koa this.session
 * @param {string} password Password the user entered
 */
function *login(state, session, password) {
    // Check against hard coded password 😆
    if (password === PASSWORD) {
        session.loggedIn = true;
    }

    // Generate a key for validating the Slack oauth response
    if (session.loggedIn && !session.oauthKey) {
        session.oauthKey = yield util.generateKey();
    }

    state.loggedIn = session.loggedIn;
    state.oauthKey = session.oauthKey;
}


const routes = {
    *home() {
        yield login(this.state, this.session, this.request.body.password);

        yield this.render('home');
    },
    *oauth() {
        yield login(this.state, this.session);
        const code = this.request.query.code;
        const oauthKey = this.request.query.state;

        // If you don't have all these things you probably shouldn't be here
        if (!this.state.loggedIn ||
            !this.state.oauthKey ||
            !oauthKey ||
            !code) {

            return this.redirect('/');
        }

        this.state.success = false;

        // Check that the oauth request is legit using the oauthKey generated on login
        if (oauthKey === this.state.oauthKey) {
            // Get the access token
            const response = yield got('https://slack.com/api/oauth.access', {
                query: {
                    client_id: SLACK_CLIENT_ID,
                    client_secret: SLACK_CLIENT_SECRET,
                    code,
                    timeout: 5000,
                },
                json: true,
            })
            // Normalise the response object
            .then((res) => res.body)
            .catch((error) => ({ ok: false, error }));

            if (response.ok) {
                // Save/update the team info and access tokens
                yield Team.findOneAndUpdate(
                    {}, {
                        id: response.team_id,
                        name: response.team_name,
                        accessToken: response.access_token,
                        botUserId: response.bot.bot_user_id,
                        botAccessToken: response.bot.bot_access_token,
                    }, {
                        upsert: true
                    }
                ).exec();

                this.state.success = true;
            } else {
                console.error(response.error);
            }
        }

        return yield this.render('oauth');
    },
    *buttons() {
        this.body = 'Buttons';
    }
};

app.use(koaRoute.get('/', routes.home));
app.use(koaRoute.post('/', routes.home));
app.use(koaRoute.get('/oauth', routes.oauth));
app.use(koaRoute.post('/buttons', routes.buttons));


console.log('Server starting...');
mongoose.connect(`mongodb://${DATABASE_HOST}/${DATABASE_NAME}`)
    .then(() => {
        server = app.listen(PORT, () => {
            console.log(`Server started at http://localhost:${PORT}`);
        });
    });
