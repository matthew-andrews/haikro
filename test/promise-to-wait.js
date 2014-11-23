module.exports = function(seconds) {
	return function() {
		return new Promise(function(resolve, reject) { setTimeout(resolve, seconds * 1000); });
	};
};
