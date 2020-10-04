'use strict';

var shellpromise = require('shellpromise');

module.exports = function(name) {
	return shellpromise('heroku apps:create ' + (name ? '--app ' + name : '') + ' --org financial-times --no-remote 2> /dev/null', { verbose: true })
		.then(function(name) {
			var match = name.match(/^Creating ([a-z-0-9]+) /);
			if (match[1]) {
				var app = match[1];
				console.log('Created app ' + app);
				return app;
			} else {
				throw new Error("Could not extract app name from '" + name + "'");
			}
		});
};
