'use strict';
const path = require('path');
const koa = require('koa');
const koaBodyParser = require('koa-bodyparser');
const koaRoute = require('koa-route');
const koaStatic = require('koa-static');
const koaSession = require('koa-session');
const koaViews = require('koa-views');
const nunjucks = require('nunjucks');
const util = require('./util');

const app = koa();

const PASSWORD = 'lunchshuffle';
app.keys = ['$Jqik9oP9ifvewR*evvH'];

nunjucks.configure(__dirname);
app.use(koaViews(__dirname, { map: { html: 'nunjucks' } }));
app.use(koaBodyParser());
app.use(koaSession(app));
app.use(koaStatic(path.join(__dirname, 'public')));


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

        if (!this.state.loggedIn ||
            !this.state.oauthKey ||
            !this.request.query.state ||
            !this.request.query.code) {

            return this.redirect('/');
        }

        if (this.request.query.state === this.state.oauthKey) {
            this.state.success = true;
        } else {
            this.state.success = false;
        }

        yield this.render('oauth');
    },
    *buttons() {
        this.body = 'Buttons';
    }
};

app.use(koaRoute.get('/', routes.home));
app.use(koaRoute.post('/', routes.home));
app.use(koaRoute.get('/oauth', routes.oauth));
app.use(koaRoute.post('/buttons', routes.buttons));


app.listen(8000);
