NODE_ENV ?= development

ifeq ($(NODE_ENV),production)
    NPM_FLAGS := --prod
endif

node_modules: package.json
	npm install $(NPM_FLAGS)
	touch node_modules

test: node_modules
	npm run test
.PHONY: test

deploy:
	now -e NODE_ENV=production \
        -e baseurl=@baseurl \
        -e mongouri=@mongouri \
        -e loggly_token=@loggly_token \
        -e loggly_subdomain=@loggly_subdomain \
        -e password=@password \
        -e cookiekeys=@cookiekeys \
        -e slack_id=@slack_id \
        -e slack_secret=@slack_secret \
        -e slack_verification=@slack_verification
.PHONY: deploy
