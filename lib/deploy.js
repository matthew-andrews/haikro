'use strict';
var denodeify = require('denodeify');
var shellpromise = require('shellpromise');
var readFile = denodeify(require('fs').readFile);
var packageJson = require('./package-json');
var nodePrefix = 'export PATH="node_modules/.bin:node-linux-x64/bin:iojs-linux-x64/bin:$PATH"; ';

function parseProcfile (procfile) {
	// Return a map of processes Heroku should run
	var process_types = {};
	var commands = procfile.split('\n')
		.map(function (item) {
			return item.split(':');
		}).forEach(function (item, index) {
			if (item[0].length !== 0) {				
				process_types[item[0]] = nodePrefix + item[1];
			}
		});
	return process_types;
}

module.exports = function(opts) {
	var project = opts.project || process.cwd();
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');
	var commit = opts.commit;
	var authorizedPostHeaders;
	opts = { cwd: project };

	console.log("creating slug tarball");
	console.log("trying to read start script from Procfile");
	return shellpromise('heroku auth:token')
		.then(function(token) {
			authorizedPostHeaders = {
				'Accept': 'application/vnd.heroku+json; version=3',
				'Content-Type': 'application/json',
				'Authorization': 'Bearer ' + token.trim()
			};
			return readFile(project+"/Procfile", { encoding: 'UTF-8' });
		})
		.then(function(procfile) { 
			return parseProcfile(procfile);
		})
		.catch(function() {
			console.log("trying to read start script from package.json");
			return packageJson(project)
				.then(function (data) { return {
					web: nodePrefix + data.scripts.start
				};
			});
		})
		.then(function(process_types) {
			return fetch("https://api.heroku.com/apps/" + app + "/slugs", {
					method: 'post',
					headers: authorizedPostHeaders,
					body: JSON.stringify({
						process_types: process_types,
						commit: commit
					})
				}).then(function(response) {
					return response.json();
				}).then(function(slug) {
					// TODO: Invert me.  Only continue if good.
					if (slug.id === 'bad_request' || slug.id === 'forbidden' || slug.id === 'unauthorized' || slug.id === 'not_found') {
						throw new Error('cannot create slug, are your heroku access token and app name correct?');
					}
					console.log("uploading slug");
					return shellpromise("curl -f -X PUT -H 'Content-Type:' --data-binary @.haikro-cache/slug.tgz \"" + slug.blob.url + "\"", opts)
						.then(function() {
							console.log("releasing slug");
							return fetch("https://api.heroku.com/apps/"+app+"/releases", {
								method: 'post', headers: authorizedPostHeaders, body: JSON.stringify({ slug: slug.id })
							});
						});
				});
		})
		.then(function() {
			console.log('deploy finished');
		});
};
