(function(global) {
	var DEBUG = false;
	function mydump(aMessage) {
		if (DEBUG)
			dump('informationaltab content utils: '+aMessage +'\n');
	}
	mydump('CONTENT SCRIPT LOADED');

	var Cc = Components.classes;
	var Ci = Components.interfaces;
	var Cu = Components.utils;
	var Cr = Components.results;

	var { InformationalTabConstants } = Cu.import('resource://informationaltab-modules/constants.js', {});
	var { getThumbnailImageURI } = Cu.import('resource://informationaltab-modules/thumbnail-utils.js', {});

	function free() {
		cleanup =
			Cc = Ci = Cu = Cr =
			config =
			messageListener =
			lastThumbnailParams =
			reportThumbnailImageURI =
			isPageRead =
			isFrameScrollable =
			webProgress =
			progressListener =
			progressFilter =
			InformationalTabConstants =
			getThumbnailImageURI =
			mydump =
				undefined;
	}

	var config = {
			thumbnailEnabled : false,
			readMethod       : 0
		};

	var messageListener = function(aMessage) {
		mydump('CONTENT MESSAGE LISTENED');
		mydump(JSON.stringify(aMessage.json));
		switch (aMessage.json.command)
		{
			case InformationalTabConstants.COMMAND_SHUTDOWN:
				global.removeMessageListener(InformationalTabConstants.MESSAGE_TYPE, messageListener);
				webProgress.removeProgressListener(progressFilter);
				progressFilter.removeProgressListener(progressListener);
				free();
				return;

			case InformationalTabConstants.COMMAND_NOTIFY_CONFIG_UPDATED:
				Object.keys(aMessage.json.config).forEach(function(aKey) {
					config[aKey] = aMessage.json.config[aKey];
					switch (aKey)
					{
						case 'thumbnailEnabled':
							reportThumbnailImageURI(InformationalTabConstants.UPDATE_INIT);
							break;
					}
				});
				return;

			case InformationalTabConstants.COMMAND_REQUEST_THUMBNAIL_URI:
				lastThumbnailParams = aMessage.json.params;
				let reason = lastThumbnailParams.reason;
				delete lastThumbnailParams.reason;
				reportThumbnailImageURI(reason);
				return;
		}
	};
	global.addMessageListener(InformationalTabConstants.MESSAGE_TYPE, messageListener);

	var lastThumbnailParams = null;
	function reportThumbnailImageURI(aReason) {
		if (!config.thumbnailEnabled || !lastThumbnailParams)
			return;
		let params = {
				window    : content,
				reason    : aReason,
				__proto__ : lastThumbnailParams
			};
		getThumbnailImageURI(params, function(aThumbnailImageURI) {
			global.sendAsyncMessage(InformationalTabConstants.MESSAGE_TYPE, {
				command : InformationalTabConstants.COMMAND_REPORT_THUMBNAIL_URI,
				uri     : aThumbnailImageURI
			});
		});
	}

	function isPageRead(aEventType) {
		var d = content.document;
		if (d.contentType &&
			d.contentType.toLowerCase().indexOf('image/') == 0)
			return true;

		var isScrollable = isFrameScrollable(content);
		switch (config.readMethod)
		{
			case 1:
				return !isScrollable || aEventType == 'scroll';

			default:
				return true;
		}
	}

	function isFrameScrollable(aFrame) {
		if (!aFrame)
			return false;

		if (aFrame.scrollMaxY > 0)
			return true;

		var children = aFrame.frames;
		if (children && children.length)
			for (var i = 0, maxi = children.length; i  <maxi; i++)
				if (isFrameScrollable(children[i]))
					return true;

		return false;
	}

	var webProgress = global.docShell
		.QueryInterface(Ci.nsIInterfaceRequestor)
		.getInterface(Ci.nsIWebProgress);
	var progressListener = {
		// nsIWebProgressListener
		onProgressChange : function ITS_onProgressChange(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
		{
			if (aMaxTotalProgress < 1)
				return;

			var percentage = parseInt((aCurTotalProgress * 100) / aMaxTotalProgress);
			global.sendAsyncMessage(InformationalTabConstants.MESSAGE_TYPE, {
				command    : InformationalTabConstants.COMMAND_REPORT_PROGRESS,
				percentage : percentage
			});
		},
		onStatusChange : function ITS_onStatusChange() {},
		onSecurityChange : function ITS_onSecurityChange() {},
		onStateChange : function ITS_onStateChange(aWebProgress, aRequest, aStateFlags, aStatus)
		{
			if (!aWebProgress || !aWebProgress.isTopLevel)
				return;

			if (
				aStateFlags & Ci.nsIWebProgressListener.STATE_STOP &&
				aStateFlags & Ci.nsIWebProgressListener.STATE_IS_NETWORK
				) {
				reportThumbnailImageURI(InformationalTabConstants.UPDATE_PAGELOAD);
				global.sendAsyncMessage(InformationalTabConstants.MESSAGE_TYPE, {
					command : InformationalTabConstants.COMMAND_REPORT_PAGE_LOADED,
					uri     : content.location.href,
					read    : isPageRead('load')
				});
			}
		},
		onLocationChange : function ITS_onLocationChange(aWebProgress, aRequest, aLocation)
		{
			if (!aWebProgress || !aWebProgress.isTopLevel)
				return;

			global.sendAsyncMessage(InformationalTabConstants.MESSAGE_TYPE, {
				command : InformationalTabConstants.COMMAND_REPORT_LOCATION_CHANGED
			});
		},
		// nsIWebProgressListener
		onProgressChange64 : function ITS_onProgressChange64() {},
		onRefreshAttempted : function ITS_onRefreshAttempted() { return true; },
		// nsISupports
		QueryInterface : function (aIID)
		{
			if (aIID.equals(Ci.nsIWebProgressListener) ||
				aIID.equals(Ci.nsIWebProgressListener2) ||
				aIID.equals(Ci.nsISupports))
				return this;
			throw Cr.NS_NOINTERFACE;
		}
	};
	var progressFilter = Cc['@mozilla.org/appshell/component/browser-status-filter;1']
							.createInstance(Ci.nsIWebProgress);
	progressFilter.addProgressListener(progressListener, Ci.nsIWebProgress.NOTIFY_ALL);
	webProgress.addProgressListener(progressFilter, Ci.nsIWebProgress.NOTIFY_ALL);
})(this);
