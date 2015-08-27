module.exports = function () {
	var suffix = '-';
	if (process.env.CIRCLE_BUILD_NUM) {
		suffix += process.env.CIRCLE_BUILD_NUM;
	} else {
		suffix += 'local';
	}
	return suffix;
};
