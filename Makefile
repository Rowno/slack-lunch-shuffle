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
