'use strict';

function getProcessesProfiles(args) {
	var processes = args.split(',');
	var processProfiles = {};
	processProfiles.updates = processes.map(function(process) {
		var processParts = process.split(':');
		if (processParts.length < 3) {
			throw new Error('A process needs a name, size and quantity');
		}
		return {
			process: processParts[0],
			size: processParts[1],
			quantity: processParts[2]
		};
	});
	return processProfiles;
}
