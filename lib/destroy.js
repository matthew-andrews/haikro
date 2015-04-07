'use strict';
var logger = require('../lib/logger');

module.exports = function(opts) {
	var token = opts.token;
	if (!token) throw new Error('please provide a heroku access token');
	var app = opts.app;
	if (!app) throw new Error('please provide an app name');

	logger.verbose("destroying app");
	return fetch("https://api.heroku.com/apps/" + app, {
		method: 'delete',
		headers: {
			"Accept": "application/vnd.heroku+json; version=3",
			"Authorization": "Bearer " + token
		}
	})
		.then(function(response) { return response.json(); })
		.then(function(info) {
			if (info.id === 'forbidden') {
				throw new Error('cannot delete app, make sure you have permission to delete the app on Heroku');
			}
			if (info.id === 'not_found') {
				throw new Error('cannot delete app, are your heroku access token and app name correct?');
			}
			logger.info("deleted app with name " + app);
		});
};
