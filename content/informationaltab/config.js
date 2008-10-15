function init()
{
	var animation = document.getElementById('animationCheck');
	var group = document.getElementById('lastTabCloseBoxGroup');

	const XULAppInfo = Components.classes['@mozilla.org/xre/app-info;1']
			.getService(Components.interfaces.nsIXULAppInfo);
	var version = XULAppInfo.platformVersion
			.split('.')
			.map(function(aNum) {
				return parseInt(aNum);
			});
	if (
		version[0] >= 2 ||
		(
			version.length >= 3 &&
			version[0] >= 1 &&
			version[1] >= 9 &&
			version[2] >= 1
		)
		) {
		animation.removeAttribute('hidden');
		group.removeAttribute('hidden');
	}
	else {
		animation.setAttribute('hidden', true);
		group.setAttribute('hidden', true);
	}

	window.sizeToContent();
}
