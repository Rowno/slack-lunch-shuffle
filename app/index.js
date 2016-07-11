'use strict';
const path = require('path');
const got = require('got');
const koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaRoute = require('koa-route');
const koaSession = require('koa-session');
const koaViews = require('koa-views');
const nunjucks = require('nunjucks');
const util = require('./util');

const app = koa();

const PORT = 8000;
const TEMPLATE_DIR = path.join(__dirname, 'templates');
const PASSWORD = 'lunchshuffle';
const CLIENT_ID = '11206583287.53960855157';
const CLIENT_SECRET = '43d68bd92cb3b95f8f71db6a80445c0a';
const VERIFICATION_TOKEN = 'jalEovUWU3MjUGdJcrDwIUul';
app.keys = ['$Jqik9oP9ifvewR*evvH'];

nunjucks.configure(TEMPLATE_DIR);
app.use(koaViews(TEMPLATE_DIR, { map: { html: 'nunjucks' } }));
app.use(koaBodyParser());
app.use(koaSession(app));


function *login(state, session, password) {
    if (password === PASSWORD) {
        session.loggedIn = true;
    }

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

        if (!this.state.loggedIn ||
            !this.state.oauthKey ||
            !oauthKey ||
            !code) {

            return this.redirect('/');
        }

        this.state.success = false;

        // Check that the oauth request is legit using the oauthKey generated on login
        if (oauthKey === this.state.oauthKey) {
            const response = yield got('https://slack.com/api/oauth.access', {
                query: {
                    client_id: CLIENT_ID,
                    client_secret: CLIENT_SECRET,
                    code,
                    timeout: 5000,
                },
                json: true,
            }).then((res) => res.body).catch((error) => ({ ok: false, error }));

            console.log(response);

            if (response.ok) {
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


app.listen(PORT);
console.log(`Starting server at http://localhost:${PORT}`);
