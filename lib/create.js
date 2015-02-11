'use strict';
var logger = require('../lib/logger');

module.exports = function(opts) {
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var name = opts.app;
	var region = opts.region;
	var organization = opts.organization;

	opts = {};
	if (name) opts.name = name;
	if (region) opts.region = region;
	if (organization) {
		opts.personal = false;
		opts.organization = organization;
	}

	logger.verbose("creating app", opts);
	return fetch("https://api.heroku.com/" + (opts.organization ? "organizations/" : "") + "apps", {
		method: 'post',
		headers: {
			"Accept": "application/vnd.heroku+json; version=3",
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token
		},
		body: JSON.stringify(opts)
	})
		.then(function(response) { return response.json(); })
		.then(function(app) {
			if (app.id === 'invalid_params') throw new Error(app.message);
			if (app.name === undefined) throw new Error("app failed to be created");
			logger.info("created app with name " + app.name);
			return app.name;
		});
};
