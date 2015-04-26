'use strict';
var logger = module.exports = require('winston');
logger.setLevel = function(newLevel) {
	logger.remove(logger.transports.Console);
	logger.add(logger.transports.Console, { level: newLevel, colorize: true });
	logger.verbose(newLevel + " logging enabled");
};
logger.setLevel('info');
