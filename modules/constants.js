var EXPORTED_SYMBOLS = ['InformationalTabConstants'];

var InformationalTabConstants = {
	ID       : 'informationaltab@piro.sakura.ne.jp',
	PREFROOT : 'extensions.informationaltab@piro.sakura.ne.jp',

	kPREF_VERSION : 2,

	POSITION_BEFORE_FAVICON  : 0,
	POSITION_BEFORE_LABEL    : 1,
	POSITION_BEFORE_CLOSEBOX : 2,
	POSITION_ABOVE_LEFT      : 301,
	POSITION_ABOVE_CENTER    : 302,
	POSITION_ABOVE_RIGHT     : 303,
	POSITION_BELOW_LEFT      : 401,
	POSITION_BELOW_CENTER    : 402,
	POSITION_BELOW_RIGHT     : 403,
	POSITION_BEHIND_LEFT     : 501,
	POSITION_BEHIND_CENTER   : 502,
	POSITION_BEHIND_RIGHT    : 503,

	SIZE_MODE_FIXED    : 0,
	SIZE_MODE_FLEXIBLE : 1,

	kTHUMBNAIL : 'informationaltab-thumbnail',
	kCONTAINER : 'informationaltab-thumbnail-container',

	kUNREAD : 'informationaltab-unread',
	kHIDDEN : 'informationaltab-hidden',
	kPROGRESS : 'informationaltab-progress',
	kTHUMBNAIL_ENABLED : 'informationaltab-thumbnail-enabled',
	kTHUMBNAIL_POSITION : 'informationaltab-thumbnail-position',
	kTHUMBNAIL_UPDATING : 'informationaltab-thumbnail-updating',
	kCOMPATIBLE_ADDONS : 'informationaltab-installed-compatible-addons',
	kPROGRESS_STYLE : 'informationaltab-progressbar-style',
	kINDICATE_UNREAD : 'informationaltab-indicate-unread',
	kSHOW_LAST_CLOSE_BUTTON : 'informationaltab-show-last-tab-close-button',
	kLAST_STYLE_KEY : 'informationaltab-last-style-key',

	PROGRESS_STATUSBAR : 0,
	PROGRESS_TAB       : 1,
	PROGRESS_BOTH      : 2,

	UPDATE_INIT      : 1,
	UPDATE_PAGELOAD  : 2,
	UPDATE_RESIZE    : 4,
	UPDATE_SCROLL    : 8,
	UPDATE_REFLOW    : 16,
	UPDATE_REPAINT   : 32,
	UPDATE_RESTORING : 64
};
