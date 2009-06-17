function init()
{
	var animation = document.getElementById('config.thumbnail.animation-check');
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

var gThumbnailItems;
var gThumbnailPartialItems;

function initThumbnailMode()
{
	gThumbnailPartialItems = [
			'config.thumbnail.partial.area.before',
			'config.thumbnail.partial.startX-textbox',
			'config.thumbnail.partial.area.middle1',
			'config.thumbnail.partial.startY-textbox',
			'config.thumbnail.partial.area.middle2',
			'config.thumbnail.partial.max-textbox',
			'config.thumbnail.partial.area.after'
		].map(document.getElementById, document);

	gThumbnailItems = gThumbnailPartialItems
		.concat([
			'config.thumbnail.partial-full',
			'config.thumbnail.partial-partial',
			'config.thumbnail.animation-check',
			'config.thumbnail.scrolled-check'
		].map(document.getElementById, document));

	onThumbnailModeChange();
}

function onThumbnailModeChange()
{
	if (document.getElementById('config.thumbnail.enabled-check').checked) {
		gThumbnailItems.forEach(function(aItem) {
			if (aItem) aItem.removeAttribute('disabled');
		});
		if (document.getElementById('config.thumbnail.partial-radiogroup').value == 'true') {
			gThumbnailPartialItems.forEach(function(aItem) {
				if (aItem) aItem.removeAttribute('disabled');
			});
		}
		else {
			gThumbnailPartialItems.forEach(function(aItem) {
				if (aItem) aItem.setAttribute('disabled', true);
			});
		}
	}
	else {
		gThumbnailItems.forEach(function(aItem) {
			if (aItem) aItem.setAttribute('disabled', true);
		});
	}
}
