node_modules: package.json
	npm install

server: node_modules
	npm run server
.PHONY: server
