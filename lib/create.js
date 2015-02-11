'use strict';
var logger = require('../lib/logger');

module.exports = function(opts) {
	
	var host = "https://api.heroku.com/apps";
	var token = opts.token;
	
	if (!token) throw new Error('please provide a heroku access token');

	var o = {};

	if (opts.app) {
		o.name = opts.app;
	}

	if (opts.region) {
		o.region = opts.region;
	}

	if (opts.org) {
		o.organization = opts.org;
		host = "https://api.heroku.com/organizations/apps";
	}

	logger.verbose("creating app via", host, o);
	return fetch(host, {
		method: 'post',
		headers: {
			"Accept": "application/vnd.heroku+json; version=3",
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token
		},
		body: JSON.stringify(o)
	})
		.then(function(response) { 
			logger.warn(response);
            return response.json();
        })
		.then(function(app) {
			if (app.id === 'invalid_params') throw new Error(app.message);
			if (app.name === undefined) throw new Error("app failed to be created");
			logger.info("created app with name " + app.name);
			return app.name;
		});
};
