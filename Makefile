node_modules: package.json
	npm install
	touch node_modules

test: node_modules
	npm run test
.PHONY: test
