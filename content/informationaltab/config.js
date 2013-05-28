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

	var thumbnailMinSize = Components.utils.evalInSandbox(
		Components.classes['@mozilla.org/intl/stringbundle;1']
			.getService(Components.interfaces.nsIStringBundleService)
			.createBundle('chrome://informationaltab/skin/tabstyle.properties')
			.GetStringFromName('thumbnail_min_size'),
		new Components.utils.Sandbox('about:blank')
	);
	document.getElementById('extensions.informationaltab.thumbnail.max-textbox').setAttribute('min', thumbnailMinSize);
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
		for (let i = 0, maxi = gThumbnailItems.length; i < maxi; i++)
		{
			let item = gThumbnailItems[i];
			if (item) item.removeAttribute('disabled');
		}
		if (document.getElementById('config.thumbnail.partial-radiogroup').value == 'true') {
			for (let i = 0, maxi = gThumbnailPartialItems.length; i < maxi; i++)
			{
				let item = gThumbnailPartialItems[i];
				if (item) item.removeAttribute('disabled');
			}
		}
		else {
			for (let i = 0, maxi = gThumbnailPartialItems.length; i < maxi; i++)
			{
				let item = gThumbnailPartialItems[i];
				if (item) item.setAttribute('disabled', true);
			}
		}
	}
	else {
		for (let i = 0, maxi = gThumbnailItems.length; i < maxi; i++)
		{
			let item = gThumbnailItems[i];
			if (item) item.setAttribute('disabled', true);
		}
	}
}
