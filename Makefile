install-local: package.json
	npm install

install-prod: package.json
	npm install --prod

server: install-local
	npm run server
.PHONY: server

deploy:
	rsync -avzh --delete --no-owner --no-group --exclude='/.git' --filter="dir-merge,- .gitignore" . lunch-shuffle@162.243.133.80:/home/lunch-shuffle/files/
	ssh lunch-shuffle@162.243.133.80 'cd files; make install-prod; kill $$(systemctl -p MainPID show lunch-shuffle | sed -e "s/MainPID=//")'
.PHONY: deploy
