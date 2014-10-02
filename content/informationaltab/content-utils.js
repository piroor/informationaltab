(function(global) {
	var DEBUG = false;

	function mydump(aMessage) {
		if (DEBUG)
			dump('informationaltab content utils: '+aMessage +'\n');
	}

	var { InformationalTabConstants } = Components.utils.import('resource://informationaltab-modules/constants.js', {});
	var { getThumbnailImageURI } = Components.utils.import('resource://informationaltab-modules/thumbnail-utils.js', {});

	mydump('CONTENT SCRIPT LOADED');

	function free() {
		cleanup =
			messageListener =
			InformationalTabConstants =
			getThumbnailImageURI =
			mydump =
				undefined;
	}

	var messageListener = function(aMessage) {
		mydump('CONTENT MESSAGE LISTENED');
		mydump(JSON.stringify(aMessage.json));
		switch (aMessage.json.command)
		{
			case InformationalTabConstants.COMMAND_SHUTDOWN:
				global.removeMessageListener(InformationalTabConstants.MESSAGE_TYPE, messageListener);
				free();
				return;

			case InformationalTabConstants.COMMAND_REQUEST_THUMBNAIL_URI:
				let params = {
						window:    content,
						__proto__: aMessage.json.params
					};
				getThumbnailImageURI(params, function(aThumbnailImageURI) {
					global.sendAsyncMessage(InformationalTabConstants.MESSAGE_TYPE, {
						command: InformationalTabConstants.COMMAND_REPORT_THUMBNAIL_URI,
						uri:     aThumbnailImageURI
					});
				});
				return;
		}
	};
	global.addMessageListener(InformationalTabConstants.MESSAGE_TYPE, messageListener);
})(this);
