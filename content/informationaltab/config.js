function init()
{
	const XULAppInfo = Components.classes['@mozilla.org/xre/app-info;1']
			.getService(Components.interfaces.nsIXULAppInfo);
	const comparator = Components.classes['@mozilla.org/xpcom/version-comparator;1']
			.getService(Components.interfaces.nsIVersionComparator);

	var progressRadiogroup = document.getElementById('progress-radiogroup');
	var progressCheck = document.getElementById('progress-check');
	if (comparator.compare(XULAppInfo.version, '4.0b1pre') >= 0) {
		progressRadiogroup.setAttribute('hidden', true);
		progressCheck.removeAttribute('hidden');
	}
	else {
		progressRadiogroup.removeAttribute('hidden');
		progressCheck.setAttribute('hidden', true);
	}
}

var gThumbnailItems;
var gThumbnailPartialItems;

function initThumbnailMode()
{
	gThumbnailPartialItems = [
			'config.thumbnail.partial.area.before',
			'config.thumbnail.partial.maxPixels-textbox',
			'config.thumbnail.partial.area.middle',
			'config.thumbnail.partial.maxPercentage-textbox',
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
	if (!gThumbnailPartialItems)
		return;

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
