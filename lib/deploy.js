'use strict';
require('es6-promise').polyfill();
require('isomorphic-fetch');

var denodeify = require('denodeify');
var logger = require('./logger');
var exec = denodeify(require('child_process').exec, function(err, stdout, stderr) { return [err, stdout]; });
var readFile = denodeify(require('fs').readFile);

module.exports = function(opts) {
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var commit = opts.commit;
	var project = opts.project;

	if (token.indexOf("-") === -1) {
		logger.warn("use of base64 encoded token is deprecated, please use raw auth:token");
	} else {
		logger.verbose("prefixing token with 'Bearer'");
		token = "Bearer " + token;
	}

	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Content-Type': 'application/json',
		'Authorization': token
	};

	logger.info("creating slug tarball");
	return readFile(project+"/Procfile", { encoding: 'UTF-8' })
		.then(function(procfile) {
			return fetch("https://api.heroku.com/apps/"+app+"/slugs", {
					method: 'post',
					headers: authorizedPostHeaders,
					body: JSON.stringify({ process_types: { web: 'export PATH="node-v0.10.32-linux-x64/bin:$PATH"; ' + procfile.match(/web:(.*)/)[1] }, commit: commit })
				}).then(function(response) {
					return response.json();
				}).then(function(slug) {
					if (slug.id === 'forbidden') {
						throw new Error('cannot create slug, are your heroku access token and app name correct?');
					}
					logger.info("uploading slug");
					return exec("curl -f -X PUT -H 'Content-Type:' --data-binary @tmp/slug.tgz \""+slug.blob.url+"\"", { cwd: project })
						.then(function() {
							logger.info("releasing slug");
							return fetch("https://api.heroku.com/apps/"+app+"/releases", {
								method: 'post', headers: authorizedPostHeaders, body: JSON.stringify({ slug: slug.id })
							});
						});
				});
		})
		.then(function() {
			logger.info('deploy finished');
		});
};
