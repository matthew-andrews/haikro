'use strict';
var logger = require('./logger');

module.exports = function(opts) {
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');
	var tag = opts.tag;
	if (!tag) throw new Error('please provide a tag');
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var repository = opts.repository;
	if (!repository) throw new Error('please provide the repository');

	var authorizedPostHeaders = {
		'Accept': 'application/vnd.heroku+json; version=3',
		'Content-Type': 'application/json',
		'Authorization': 'Bearer ' + token
	};

	logger.info("creating slug tarball");
	logger.verbose("trying to read start script from Procfile");
	return fetch("https://raw.githubusercontent.com/" + repository + "/" + tag + "/Procfile")
		.then(function(response) { return response.text(); })
		.then(function(procfile) { return procfile.match(/web:(.*)/)[1]; })
		.catch(function(err) {
			logger.verbose("trying to read start script from package.json");
			return fetch("https://raw.githubusercontent.com/" + repository + "/" + tag + "/package.json")
				.then(function(response) { return response.json(); })
				.then(function(data) { return data.scripts.start; });
		})
		.then(function(script) {
			return fetch("https://api.heroku.com/apps/"+app+"/builds", {
				method: 'post',
				headers: authorizedPostHeaders,
				body: JSON.stringify({
					process_types: { web: 'export PATH="node-linux-x64/bin:$PATH"; ' + script },
					source_blob: { "url": "https://github.com/" + repository + "/releases/download/" + tag + "/" + tag + ".tgz", "version": tag }
				})
			});
		})
		.then(function(response) { return response.json(); })
		.then(function(slug) {
			if (slug.id === 'forbidden' || slug.id === 'unauthorized') {
				throw new Error('cannot create build, are your heroku access token and app name correct?');
			}
			logger.info('deploy finished');
		});
};
