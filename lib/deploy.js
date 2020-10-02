'use strict';
var denodeify = require('denodeify');
var shellpromise = require('shellpromise');
var readFile = denodeify(require('fs').readFile);
var packageJson = require('./package-json');
var nodePrefix = 'export PATH="node_modules/.bin:node-linux-x64/bin:iojs-linux-x64/bin:$PATH"; ';
var herokuResJson = require('./res-json').heroku;

// Return a map of processes Heroku should run
function parseProcfile(procfile) {
	var processTypes = {};
	var commands = procfile.split('\n')
		.map(function(item) {
			return item.split(':');
		}).forEach(function(item, index) {
			if (item[0].length !== 0) {				
				processTypes[item[0]] = nodePrefix + item[1];
			}
		});

	return processTypes;
}

module.exports = function(opts) {
	var project = opts.project || process.cwd();
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');
	var commit = opts.commit;
	var authorizedPostHeaders;
	var processTypes;
	opts = { cwd: project };

	console.log("creating slug tarball");
	console.log("trying to read start script from Procfile");
	return readFile(project+"/Procfile", { encoding: 'UTF-8' })
		.then(function(procfile) { 
			return parseProcfile(procfile);
		})
		.catch(function(err) {
			console.log(err.stack);
			console.log("trying to read start script from package.json");
			return packageJson(project)
				.then(function (data) { return {
					web: nodePrefix + data.scripts.start
				};
			});
		})
		.then(function(types) {
			processTypes = types;
			if (process.env.HEROKU_AUTH_TOKEN) {
				return process.env.HEROKU_AUTH_TOKEN;
			}
			return shellpromise('heroku auth:token');
		})
		.then(function(token) {
			authorizedPostHeaders = {
				'Accept': 'application/vnd.heroku+json; version=3',
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token.trim()
			};
			return fetch("https://api.heroku.com/apps/" + app + "/slugs", {
					method: 'post',
					headers: authorizedPostHeaders,
					body: JSON.stringify({
						process_types: processTypes,
						commit: commit,
						buildpack_provided_description: 'haikro'
					})
				})
				.then(herokuResJson)
				.then(function(slug) {
					console.log("uploading slug");
					return shellpromise("curl -f -X PUT -H 'Content-Type:' --data-binary @.haikro-cache/slug.tgz \"" + slug.blob.url + "\"", opts)
						.then(function() {
							console.log("releasing slug");
							return fetch("https://api.heroku.com/apps/"+app+"/releases", {
								method: 'post', headers: authorizedPostHeaders, body: JSON.stringify({ slug: slug.id })
							})
								.then(herokuResJson);
						});
				});
		})
		.then(function() {
			console.log('deploy finished');
		});
};
