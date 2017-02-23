node_modules: package.json
	yarn install
	touch node_modules

server: node_modules
	npm start
.PHONY: server

test: node_modules
	npm run test
.PHONY: test
