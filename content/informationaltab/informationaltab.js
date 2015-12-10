(function() {
var prefs = window['piro.sakura.ne.jp'].prefs;

var { InformationalTabConstants } = Components.utils.import('resource://informationaltab-modules/constants.js', {});
var { inherit } = Components.utils.import('resource://informationaltab-modules/inherit.jsm', {});
var { visuallyselectedTabs } = Components.utils.import('resource://informationaltab-modules/visuallyselectedTabs.jsm', {});

var { calculateCanvasSize, getThumbnailImageURI, drawImageFromURI } = Components.utils.import('resource://informationaltab-modules/thumbnail-utils.js', {});

var InformationalTabService = window.InformationalTabService = inherit(InformationalTabConstants, { 
	disabled : false,

	thumbnailEnabled : false,

	thumbnailPartial      : true,
	thumbnailPartialMaxPixels     : 200,
	thumbnailPartialMaxPercentage : 0.5,
	thumbnailPartialBaseX : 0,
	thumbnailPartialBaseY : 0,

	thumbnailScrolled : true,

	thumbnailSizeMode  : 0,

	thumbnailMinSize     : 20,
	thumbnailMaxSize     : 0,
	thumbnailMaxSizePow  : 1,
	thumbnailFixAspectRatio   : true,
	thumbnailFixedAspectRatio : 1,
	thumbnailUpdateDelay : 0,
	thumbnailUpdateAllDelay : 500,
	thumbnailBG          : 'rgba(0,0,0,0.5)',

	progressMode  : 1,
	progressStyle : 'modern',

	readMethod : 0,
	
/* Utilities */ 
	
	get browser() 
	{
		return gBrowser;
	},
 
	ObserverService : Components
		.classes['@mozilla.org/observer-service;1']
		.getService(Components.interfaces.nsIObserverService), 
 
	getTabBrowserFromChild : function ITS_getTabBrowserFromChild(aNode) 
	{
		if (!aNode) return null;
		var b = aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[local-name()="tabbrowser"] | '+
				'ancestor-or-self::*[local-name()="tabs"][@tabbrowser]',
				aNode,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
		return (b && b.tabbrowser) || b;
	},
 
	getTabs : function ITS_getTabs(aTabBrowser) 
	{
		return aTabBrowser.ownerDocument.evaluate(
				'descendant::*[local-name()="tab"]',
				aTabBrowser.mTabContainer,
				null,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
	},
 
	get SessionStore() 
	{
		delete this.SessionStore;
		return this.SessionStore = Components
					.classes['@mozilla.org/browser/sessionstore;1']
					.getService(Components.interfaces.nsISessionStore);
	},
 
	get XULAppInfo() 
	{
		delete this.XULAppInfo;
		return this.XULAppInfo = Components.classes['@mozilla.org/xre/app-info;1']
								.getService(Components.interfaces.nsIXULAppInfo)
								.QueryInterface(Components.interfaces.nsIXULRuntime);
	},
	
	getTabValue : function ITS_getTabValue(aTab, aKey) 
	{
		var value = '';
		try {
			value = this.SessionStore.getTabValue(aTab, aKey);
		}
		catch(e) {
		}
		return value;
	},
 
	setTabValue : function ITS_setTabValue(aTab, aKey, aValue) 
	{
		if (!aValue) return this.deleteTabValue(aTab, aKey);

		aTab.setAttribute(aKey, aValue);
		try {
			this.checkCachedSessionDataExpiration(aTab);
			this.SessionStore.setTabValue(aTab, aKey, String(aValue));
		}
		catch(e) {
		}
		return aValue;
	},
 
	deleteTabValue : function ITS_deleteTabValue(aTab, aKey) 
	{
		aTab.removeAttribute(aKey);
		try {
			this.checkCachedSessionDataExpiration(aTab);
			this.SessionStore.setTabValue(aTab, aKey, '');
			this.SessionStore.deleteTabValue(aTab, aKey);
		}
		catch(e) {
		}
	},
 
	// workaround for http://piro.sakura.ne.jp/latest/blosxom/mozilla/extension/treestyletab/2009-09-29_debug.htm 
	// This is obsolete for lately Firefox and no need to be updated. See: https://github.com/piroor/treestyletab/issues/508#issuecomment-17526429
	checkCachedSessionDataExpiration : function ITS_checkCachedSessionDataExpiration(aTab)
	{
		var data = aTab.linkedBrowser.__SS_data;
		if (data &&
			data._tabStillLoading &&
			aTab.getAttribute('busy') != 'true' &&
			aTab.linkedBrowser.__SS_restoreState != 1)
			data._tabStillLoading = false;
	},
 
	getLabel : function ITS_getLabel(aTab) 
	{
		return document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text tab-label');
	},
	getLabelTextElement : function ITS_getLabelTextElement(aTab) 
	{
		var label = this.getLabel(aTab);
		if (!label)
			return null;
		return document.getAnonymousElementByAttribute(label, 'class', 'tab-real-text') || label;
	},
	getLabelBox : function ITS_getLabelBox(aTab) 
	{
		return document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text-stack') || // Mac OS X
				document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text-container') || // Tab Mix Plus
				this.getLabel(aTab);
	},
  
  
/* Initializing */ 
	
	preInit : function ITS_preInit() 
	{
		if (this.preInitialized) return;
		this.preInitialized = true;

		window.removeEventListener('DOMContentLoaded', this, true);

		this.applyPlatformDefaultPrefs();
		this.overrideExtensionsPreInit();
	},
	preInitialized : false,
 
	init : function ITS_init() 
	{
		if (!('gBrowser' in window) || this.initialized) return;

		if (!this.preInitialized)
			this.preInit();

		window.removeEventListener('load', this, false);

		visuallyselectedTabs(gBrowser);

		window.addEventListener('beforecustomization', this, true);
		window.addEventListener('aftercustomization', this, false);

		this.styleStringBundle = document.getElementById('informationaltab-tab-style-bundle');

		this.thumbnailMinSize = parseInt(this.styleStringBundle.getString('thumbnail_min_size'));

		this.thumbnailStyle = {
			vertical : {
				foreground : {
					tab : this.styleStringBundle.getString('thumbnail_vtab_height_selected'),
					contents : this.styleStringBundle.getString('thumbnail_vtab_contents_height_selected')
				},
				background : {
					tab : this.styleStringBundle.getString('thumbnail_vtab_height'),
					contents : this.styleStringBundle.getString('thumbnail_vtab_contents_height')
				}
			},
			horizontal : {
				foreground : {
					tab : this.styleStringBundle.getString('thumbnail_htab_height_selected'),
					contents : this.styleStringBundle.getString('thumbnail_htab_contents_height_selected')
				},
				background : {
					tab : this.styleStringBundle.getString('thumbnail_htab_height'),
					contents : this.styleStringBundle.getString('thumbnail_htab_contents_height')
				}
			}
		};
		this.thumbnailStyle.background = this.styleStringBundle.getString('thumbnail_background') || '';


		prefs.addPrefListener(this);
		this.onChangePref('extensions.informationaltab.progress.mode');
		this.onChangePref('extensions.informationaltab.progress.style');
		this.onChangePref('extensions.informationaltab.unread.enabled');
		this.onChangePref('extensions.informationaltab.unread.readMethod');
		this.onChangePref('extensions.informationaltab.thumbnail.enabled');
		this.onChangePref('extensions.informationaltab.thumbnail.scrolled');
		this.onChangePref('extensions.informationaltab.thumbnail.partial');
		this.onChangePref('extensions.informationaltab.thumbnail.partial.maxPixels');
		this.onChangePref('extensions.informationaltab.thumbnail.partial.maxPercentage');
		this.onChangePref('extensions.informationaltab.thumbnail.partial.startX');
		this.onChangePref('extensions.informationaltab.thumbnail.partial.startY');
		this.onChangePref('extensions.informationaltab.thumbnail.animation');
		this.onChangePref('extensions.informationaltab.thumbnail.size_mode');
		this.onChangePref('extensions.informationaltab.thumbnail.max');
		this.onChangePref('extensions.informationaltab.thumbnail.pow');
		this.onChangePref('extensions.informationaltab.thumbnail.fix_aspect_ratio');
		this.onChangePref('extensions.informationaltab.thumbnail.fixed_aspect_ratio');
		this.onChangePref('extensions.informationaltab.thumbnail.update_delay');
		this.onChangePref('extensions.informationaltab.thumbnail.update_all_delay');
		this.onChangePref('extensions.informationaltab.close_buttons.force_show.last_tab');
		this.onChangePref('browser.tabs.tabClipWidth');

		this.ObserverService.addObserver(this, 'em-action-requested', false);
		this.ObserverService.addObserver(this, 'quit-application', false);


		if ('PrintUtils' in window) {
			eval('PrintUtils.printPreview = '+PrintUtils.printPreview.toSource().replace(
				'{',
				'{ InformationalTabService.disableAllFeatures();'
			));
			eval('PrintUtils.exitPrintPreview = '+PrintUtils.exitPrintPreview.toSource().replace(
				/(\}\)?)$/,
				'InformationalTabService.enableAllFeatures(); $1'
			));
		}

		this.overrideExtensionsOnInitAfter();

		window.messageManager.loadFrameScript(this.CONTENT_SCRIPT, true);

		this.initTabBrowser(gBrowser);

		this.initialized = true;
	},
	
	migratePrefs : function ITS_migratePrefs() 
	{
		// migrate old prefs
		switch (prefs.getPref('extensions.informationaltab.prefsVersion'))
		{
			case 0:
				var maxPixels = prefs.getPref('extensions.informationaltab.thumbnail.partial.maxPixcels');
				if (maxPixels !== null) {
					prefs.setPref('extensions.informationaltab.thumbnail.partial.maxPixels', maxPixels);
					prefs.clearPref('extensions.informationaltab.thumbnail.partial.maxPixcels');
				}
			case 1:
				switch (prefs.getPref('extensions.informationaltab.progress.style'))
				{
					case 'modern':
						prefs.setPref('extensions.informationaltab.progress.position', 'top');
						prefs.setPref('extensions.informationaltab.progress.style', 'default');
						break;
					case 'classic':
						prefs.setPref('extensions.informationaltab.progress.position', 'bottom');
						prefs.setPref('extensions.informationaltab.progress.style', 'default');
						break;
				}
			default:
				break;
		}
		prefs.setPref('extensions.informationaltab.prefsVersion', this.kPREF_VERSION);
	},
 
	applyPlatformDefaultPrefs : function ITS_applyPlatformDefaultPrefs() 
	{
		var OS = this.XULAppInfo.OS;
		var processed = {};
		var originalKeys = prefs.getDescendant('extensions.informationaltab.platform.'+OS);
		for (let i = 0, maxi = originalKeys.length; i < maxi; i++)
		{
			let originalKey = originalKeys[i];
			let key = originalKey.replace('platform.'+OS+'.', '');
			prefs.setDefaultPref(key, prefs.getPref(originalKey));
			processed[key] = true;
		}
		originalKeys = prefs.getDescendant('extensions.informationaltab.platform.default');
		for (let i = 0, maxi = originalKeys.length; i < maxi; i++)
		{
			let originalKey = originalKeys[i];
			let key = originalKey.replace('platform.default.', '');
			if (!(key in processed))
				prefs.setDefaultPref(key, prefs.getPref(originalKey));
		}
	},
 
	initTabBrowser : function ITS_initTabBrowser(aTabBrowser) 
	{
		var tabs = this.getTabs(aTabBrowser);
		for (let i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			this.initTab(tabs.snapshotItem(i), aTabBrowser);
		}

		var listener = new InformationalTabPrefListener(aTabBrowser);
		aTabBrowser.__informationaltab__prefListener = listener;

		aTabBrowser.__informationaltab__eventListener = new InformationalTabBrowserEventListener(aTabBrowser);
		aTabBrowser.mTabContainer.addEventListener('TabSelect',      this, false);
		aTabBrowser.mTabContainer.addEventListener('TabOpen',        this, false);
		aTabBrowser.mTabContainer.addEventListener('TabClose',       this, false);
		aTabBrowser.mTabContainer.addEventListener('TabMove',        this, false);
		aTabBrowser.mTabContainer.addEventListener('TabPinned',      this, false);
		aTabBrowser.mTabContainer.addEventListener('TabUnpinned',    this, false);
		aTabBrowser.mTabContainer.addEventListener('SSTabRestoring', this, false);
		aTabBrowser.mTabContainer.addEventListener('TreeStyleTabCollapsedStateChange', this, false);
	},
 
	initTab : function ITS_initTab(aTab, aTabBrowser) 
	{
		if (aTab.__informationaltab__eventListener) return;

		aTabBrowser = aTabBrowser || this.getTabBrowserFromChild(aTab);
		aTab.__informationaltab__parentTabBrowser = aTabBrowser;

		aTab.__informationaltab__label = this.getLabel(aTab);
		aTab.__informationaltab__eventListener = new InformationalTabEventListener(aTab, aTabBrowser);

		// Tab Mix Plus
		aTab.__informationaltab__progress = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text-container');
		if (aTab.__informationaltab__progress)
			aTab.__informationaltab__progress = aTab.__informationaltab__progress.getElementsByAttribute('class', 'tab-progress')[0];
		else
			aTab.__informationaltab__progress = null;

		aTab.linkedBrowser.__informationaltab__tab = aTab;

		this.initThumbnail(aTab, aTabBrowser);
	},
 
	overrideExtensionsPreInit : function ITS_overrideExtensionsPreInit() 
	{
		// DragNDrop Toolbars
		// https://addons.mozilla.org/firefox/addon/dragndrop-toolbars/
		if ('globDndtb' in window && globDndtb.setTheStuff && this.isGecko2) {
			let self = this;
			let reinitTabbar = function ITS_callback_reinitTabbar() {
					if (!self.initialized)
						return;
					self.destroyTabbrowser(gBrowser);
					window.setTimeout(function ITS_callback_reinitTabbarWithDelay() {
						self.initTabbrowser(gBrowser);
					}, 100);
				};
			globDndtb.__informationaltab__setOrder = globDndtb.setOrder;
			globDndtb.setOrder = function ITS_globDndtb_setOrder() {
				reinitTabbar();
				return this.__informationaltab__setOrder.apply(this, arguments);
			};
			globDndtb.__informationaltab__setTheStuff = globDndtb.setTheStuff;
			globDndtb.setTheStuff = function ITS_globDndtb_setTheStuff() {
				var result = this.__informationaltab__setTheStuff.apply(this, arguments);
				if (this.dndObserver &&
					this.dndObserver.onDrop &&
					!this.dndObserver.__informationaltab__onDrop) {
					this.dndObserver.__informationaltab__onDrop = this.dndObserver.onDrop;
					this.dndObserver.onDrop = function ITS_globDndtb_onDrop(aEvent, aDropData, aSession) {
						var toolbar = document.getElementById(aDropData.data);
						if (toolbar.getElementsByAttribute('id', 'tabbrowser-tabs').length)
							reinitTabbar();
						return this.__informationaltab__onDrop.apply(this, arguments);
					};
				}
				return result;
			};
		}
	},
 
	overrideExtensionsOnInitAfter : function ITS_overrideExtensionsOnInitAfter() 
	{
		var addons = [];
		// CookiePie
		// http://www.nektra.com/products/cookiepie-tab-firefox-extension
		if ('CookiePieStartup' in window) addons.push('cookiepie');
		document.documentElement.setAttribute(this.kCOMPATIBLE_ADDONS, addons.join(' '));
	},
 
	overrideSessionRestore : function ITS_overrideSessionRestore(aWindow)
	{
		aWindow = aWindow.wrappedJSObject || aWindow;
		var doc = aWindow.document;
		const XULNS = 'http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul';
		const kTHUMBNAIL = this.kTHUMBNAIL;

		var tree = doc.getElementById('tabList');

		var width = 45;
		var height = 35;

		var fragment = doc.createDocumentFragment();
		var splitter = doc.createElementNS(XULNS, 'splitter');
		splitter.setAttribute('class', 'tree-splitter');
		fragment.appendChild(splitter);
		var treecol = doc.createElementNS(XULNS, 'treecol');
		treecol.setAttribute('id', kTHUMBNAIL);
		treecol.setAttribute('width', width + 32);
		fragment.appendChild(treecol);
		tree.getElementsByTagName('treecols')[0].appendChild(fragment);

		var view = aWindow.treeView;

		view.__informationaltab__getCellText = view.getCellText;
		view.getCellText = function ITS_treeview_getCellText(aIndex, aColumn) {
			if (aColumn.id == kTHUMBNAIL)
				return null;
			return this.__informationaltab__getCellText(aIndex, aColumn);
		};

		view.__informationaltab__getCellProperties = view.getCellProperties;
		view.getCellProperties = function ITS_treeview_getCellProperties(aIndex, aColumn, aProperties) {
			if (aColumn.id == kTHUMBNAIL) {
				aProperties.AppendElement(this._getAtom(kTHUMBNAIL));
				return;
			}
			this.__informationaltab__getCellProperties(aIndex, aColumn, aProperties);
		};

		view.__informationaltab__getRowProperties = view.getRowProperties;
		view.getRowProperties = function ITS_treeview_getRowProperties(aIndex, aProperties) {
			if (aWindow.gTreeData && aWindow.gTreeData[aIndex].parent)
				aProperties.AppendElement(this._getAtom(kTHUMBNAIL));
			this.__informationaltab__getRowProperties(aIndex, aProperties);
		};

		view.__informationaltab__getImageSrc = view.getImageSrc;
		view.getImageSrc = function ITS_treeview_getImageSrc(aIndex, aColumn) {
			if (aColumn.id == kTHUMBNAIL && aWindow.gTreeData)
				return aWindow.gTreeData[aIndex][kTHUMBNAIL] || null;
			return this.__informationaltab__getImageSrc(aIndex, aColumn);
		};

		var style = doc.createElementNS('http://www.w3.org/1999/xhtml', 'style');
		style.setAttribute('type', 'text/css');
		style.appendChild(doc.createTextNode(
			'@namespace url("' + XULNS + '");\n' +
			'treechildren::-moz-tree-image(' + kTHUMBNAIL + '):not(::-moz-tree-image(container)) {\n' +
			'  width: ' + width + 'px;\n' +
			'  height: ' + height + 'px;\n' +
			'}\n' +
			'treechildren::-moz-tree-row(' + kTHUMBNAIL + ') {\n' +
			'  height: ' + height + 'px;\n' +
			'}'
		));
		doc.getElementsByTagName('head')[0].appendChild(style);

		var sessionData = aWindow.gStateObject;
		var index = 0;
		for (let i = 0, maxi = sessionData.windows.length; i < maxi; i++)
		{
			let windowState = sessionData.windows[i];
			index++;
			for (let i = 0, maxi = windowState.tabs.length; i < maxi; i++)
			{
				let tabState = windowState.tabs.windows[i];
				if ('extData' in tabState && this.kTHUMBNAIL in tabState.extData)
					aWindow.gTreeData[index][this.kTHUMBNAIL] = tabState.extData[this.kTHUMBNAIL];
				index++;
			}
		}

		tree.treeBoxObject.invalidate();

		var panel = document.getElementById('informationaltab-tab-thumbnail-panel');
		var offset = 16;
		var listener = function ITS_treeview_listener(aEvent) {
				switch (aEvent.type)
				{
					case 'mousemove':
						var row = {}, col = {};
						tree.treeBoxObject.getCellAt(aEvent.clientX, aEvent.clientY, row, col, {});
						if (row.value > -1 && aWindow.gTreeData[row.value][kTHUMBNAIL]) {
							panel.firstChild.setAttribute('src', aWindow.gTreeData[row.value][kTHUMBNAIL]);
							if (panel.state == 'open')
								panel.moveTo(aEvent.screenX + offset, aEvent.screenY + offset);
							else
								panel.openPopupAtScreen(aEvent.screenX + offset, aEvent.screenY + offset, false, aEvent);
						}
						else {
							panel.hidePopup();
						}
						break;

					case 'mouseout':
						panel.hidePopup();
						break;

					case 'unload':
						tree.removeEventListener('mousemove', listener, false);
						tree.removeEventListener('mouseout', listener, false);
						aWindow.removeEventListener('unload', listener, false);
						break;
				}
			};
		tree.addEventListener('mousemove', listener, false);
		tree.addEventListener('mouseout', listener, false);
		aWindow.addEventListener('unload', listener, false);
	},
  
	destroy : function ITS_destroy() 
	{
		window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
			command : this.COMMAND_SHUTDOWN
		});

		this.destroyTabBrowser(gBrowser);

		window.messageManager.removeDelayedFrameScript(this.CONTENT_SCRIPT);

		window.removeEventListener('unload', this, false);

		window.removeEventListener('beforecustomization', this, true);
		window.removeEventListener('aftercustomization', this, false);

		this.ObserverService.removeObserver(this, 'em-action-requested');
		this.ObserverService.removeObserver(this, 'quit-application');

		prefs.removePrefListener(this);
	},
	
	destroyTabBrowser : function ITS_destroyTabBrowser(aTabBrowser) 
	{
		aTabBrowser.__informationaltab__prefListener.destroy();
		delete aTabBrowser.__informationaltab__prefListener;

		aTabBrowser.__informationaltab__eventListener.destroy();
		delete aTabBrowser.__informationaltab__eventListener;

		aTabBrowser.mTabContainer.removeEventListener('TabSelect',      this, false);
		aTabBrowser.mTabContainer.removeEventListener('TabOpen',        this, false);
		aTabBrowser.mTabContainer.removeEventListener('TabClose',       this, false);
		aTabBrowser.mTabContainer.removeEventListener('TabMove',        this, false);
		aTabBrowser.mTabContainer.removeEventListener('TabPinned',      this, false);
		aTabBrowser.mTabContainer.removeEventListener('TabUnpinned',    this, false);
		aTabBrowser.mTabContainer.removeEventListener('SSTabRestoring', this, false);
		aTabBrowser.mTabContainer.removeEventListener('TreeStyleTabCollapsedStateChange', this, false);

		var tabs = this.getTabs(aTabBrowser);
		for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			this.destroyTab(tabs.snapshotItem(i));
		}
	},
 
	destroyTab : function ITS_destroyTab(aTab) 
	{
		try {
			if (aTab.__informationaltab__canvas) {
				aTab.__informationaltab__canvas.parentNode.removeChild(aTab.__informationaltab__canvas);
				delete aTab.__informationaltab__canvas;
			}

			delete aTab.__informationaltab__parentTabBrowser;
			delete aTab.__informationaltab__label;
			delete aTab.__informationaltab__progress;
			delete aTab.__informationaltab__thumbnailContainer;
			delete aTab.linkedBrowser.__informationaltab__tab;

			if (aTab.__informationaltab__eventListener) {
				aTab.__informationaltab__eventListener.destroy();
				delete aTab.__informationaltab__eventListener;
			}
		}
		catch(e) {
			dump(e+'\n'+e.stack+'\n');
		}
	},
  
	disableAllFeatures : function ITS_disableAllFeatures() 
	{
		this.disabled = true;
	},
	enableAllFeatures : function ITS_enableAllFeatures()
	{
		this.disabled = false;
	},
  
/* thumbnail */ 
	
	initThumbnail : function ITS_initThumbnail(aTab, aTabBrowser) 
	{
		var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		canvas.mozOpaque = true;
		canvas.mozImageSmoothingEnabled = true;
		canvas.setAttribute('class', this.kTHUMBNAIL);
		canvas.width = canvas.height = canvas.style.width = canvas.style.height = 1;
		canvas.style.display = 'none';

		this.insertThumbnailTo(canvas, aTab, aTabBrowser, prefs.getPref('extensions.informationaltab.thumbnail.position'));

		aTab.__informationaltab__canvas = canvas;
		this.updateThumbnailNow(aTab, aTabBrowser, this.UPDATE_INIT);
	},
 
	insertThumbnailTo : function ITS_insertThumbnailTo(aCanvas, aTab, aTabBrowser, aPosition) 
	{
		var container = document.createElement('hbox');
		container.setAttribute('class', this.kCONTAINER);
		container.appendChild(aCanvas);

		var label = this.getLabel(aTab);
		var labelBox = this.getLabelBox(aTab);

		var pack = (aPosition > 100) ? (aPosition % 100) : 0 ;
		pack = pack == 1 ? 'start' : pack == 3 ? 'end' : 'center' ;

		switch (aPosition)
		{
			case this.POSITION_ABOVE_LEFT:
			case this.POSITION_ABOVE_CENTER:
			case this.POSITION_ABOVE_RIGHT:
				if (label.labelTopBox) {
					label.labelTopBox.setAttribute('pack', pack);
					label.labelTopBox.appendChild(container);
					break;
				}

			case this.POSITION_BELOW_LEFT:
			case this.POSITION_BELOW_CENTER:
			case this.POSITION_BELOW_RIGHT:
				if (label.labelBottomBox) {
					label.labelBottomBox.setAttribute('pack', pack);
					label.labelBottomBox.appendChild(container);
					break;
				}

			case this.POSITION_BEHIND_LEFT:
			case this.POSITION_BEHIND_CENTER:
			case this.POSITION_BEHIND_RIGHT:
				if (label.labelBehindBox) {
					label.labelBehindBox.setAttribute('pack', pack);
					label.labelBehindBox.appendChild(container);
					break;
				}

				aPosition = this.POSITION_BEFORE_LABEL;

			default:
				labelBox.parentNode.appendChild(container);
				break;
		}

		aTab.__informationaltab__thumbnailContainer = container;

		this.initTabContentsOrder(aTab, aTabBrowser, aPosition);
	},
	initTabContentsOrder : function ITS_initTabContentsOrder(aTab, aTabBrowser, aPosition) 
	{
		var labelBox = this.getLabelBox(aTab);

		var container = aTab.__informationaltab__thumbnailContainer;
		if (!container)
			return;

		var isTreeAvailable = 'TreeStyleTabService' in window && TreeStyleTabService.initTabContents;
		if (isTreeAvailable)
			TreeStyleTabService.initTabContents(aTab, aTabBrowser);

		var nodes = labelBox.parentNode.childNodes;
		if (!isTreeAvailable) {
			for (let i = 0, maxi = nodes.length; i < maxi; i++)
			{
				nodes[i].setAttribute('ordinal', (i + 1) * 100);
			}
		}

		var orderedNodes = Array.slice(nodes).sort(function(aA, aB) {
				return parseInt(aA.getAttribute('ordinal') || 0) - parseInt(aB.getAttribute('ordinal') || 0);
			});
		if (isTreeAvailable &&
			prefs.getPref('extensions.treestyletab.tabbar.position') == 'right' &&
			prefs.getPref('extensions.treestyletab.tabbar.invertTabContents')) {
			container.setAttribute('ordinal',
				(aPosition == this.POSITION_BEFORE_FAVICON) ? parseInt(orderedNodes[orderedNodes.length-1].getAttribute('ordinal')) + 5 :
				(aPosition == this.POSITION_BEFORE_LABEL) ? parseInt(labelBox.getAttribute('ordinal')) + 5 :
				1
			);
		}
		else {
			container.setAttribute('ordinal',
				(aPosition == this.POSITION_BEFORE_FAVICON) ? parseInt(orderedNodes[0].getAttribute('ordinal')) - 5 :
				(aPosition == this.POSITION_BEFORE_LABEL) ? parseInt(labelBox.getAttribute('ordinal')) - 5 :
				parseInt(labelBox.getAttribute('ordinal')) + 5
			);
		}
	},
 
	updateThumbnail : function ITS_updateThumbnail(aTab, aTabBrowser, aReason) 
	{
		// compatibility for Suspend Tab (https://github.com/piroor/suspendtab)
		if (
			'SuspendTab' in window &&
			SuspendTab.isSuspended(aTab) &&
			!(aReason & this.UPDATE_RESTORING)
			)
			return;

		if (!('__informationaltab__lastReason' in aTab)) {
			aTab,__informationaltab__lastReason = 0;
		}
		if (aReason && !(aTab.__informationaltab__lastReason & aReason)) {
			aTab.__informationaltab__lastReason |= aReason;
		}

		if (this.disabled || aTab.updateThumbnailTimer) return;

		aTab.setAttribute(this.kTHUMBNAIL_UPDATING, true);

		aTab.updateThumbnailTimer = window.setTimeout(function ITS_updateThumbnailWithDelay(aSelf, aTab, aTabBrowser) {
			aSelf.updateThumbnailNow(aTab, aTabBrowser);
		}, this.thumbnailUpdateDelay, this, aTab, aTabBrowser);
	},
	updateThumbnailNow : function ITS_updateThumbnailNow(aTab, aTabBrowser, aReason)
	{
		if (!aReason) {
			aReason = aTab.__informationaltab__lastReason;
			aTab.__informationaltab__lastReason = 0;
		}

		if (aTab.updateThumbnailTimer) {
			window.clearTimeout(aTab.updateThumbnailTimer);
			aTab.updateThumbnailTimer = null;
		}

		var canvas = aTab.__informationaltab__canvas;
		if (!canvas) {
			aTab.removeAttribute(this.kTHUMBNAIL_UPDATING);
			return;
		}

		if (this.thumbnailEnabled) {
			let params = {
				reason:               aReason,
				viewportWidth:        aTab.linkedBrowser.boxObject.width,
				viewportHeight:       aTab.linkedBrowser.boxObject.height,
				partial:              this.thumbnailPartial,
				partialMaxPercentage: this.thumbnailPartialMaxPercentage,
				partialMaxPixels:     this.thumbnailPartialMaxPixels,
				partialBaseX:         this.thumbnailPartialBaseX,
				partialBaseY:         this.thumbnailPartialBaseY,
				fixAspectRatio:       this.thumbnailFixAspectRatio,
				fixedAspectRatio:     this.thumbnailFixedAspectRatio,
				sizeMode:             this.thumbnailSizeMode,
				maxSize:              this.thumbnailMaxSize,
				maxSizePow:           this.thumbnailMaxSizePow,
				minSize:              this.thumbnailMinSize,
				tabWidth:             aTab.boxObject.width,
				windowWidth:          aTab.ownerDocument.defaultView.innerWidth,
				scroll:               this.thumbnailScrolled,
				background:           this.thumbnailStyle.background
			};

			let canvasSize = calculateCanvasSize(params);
			if (canvas.width != canvasSize.width ||
				canvas.height != canvasSize.height) {
				canvas.width  = canvasSize.width;
				canvas.height = canvasSize.height;
				canvas.style.width  = canvasSize.width+'px';
				canvas.style.height = canvasSize.height+'px';
				canvas.style.display = 'block';
				this.updateTabStyle(aTab);
			}

			if (this.isBlankTab(aTab)) {
				let cachedThumbnailImageURI = this.getTabValue(aTab, this.kTHUMBNAIL);
				if (cachedThumbnailImageURI) {
					drawImageFromURI(cachedThumbnailImageURI, canvas, (function() {
						aTab.removeAttribute(this.kTHUMBNAIL_UPDATING);
						return;
					}).bind(this));
				}
				else {
					aTab.removeAttribute(this.kTHUMBNAIL_UPDATING);
				}
				return;
			}

			var manager = aTab.linkedBrowser.messageManager;
			manager.sendAsyncMessage(this.MESSAGE_TYPE, {
				command : this.COMMAND_REQUEST_THUMBNAIL_URI,
				params  : params
			});
			// continue to ITEL_handleMessage!
		}
		else {
			canvas.width = canvas.height = canvas.style.width = canvas.style.height = 0;
			canvas.style.display = 'none';
			this.updateTabStyle(aTab);
			aTab.removeAttribute(this.kTHUMBNAIL_UPDATING);
		}
	},
	isBlankTab : function ITS_isBlankTab(aTab) {
		return (
			(window.isBlankPageURL ?
				isBlankPageURL(aTab.linkedBrowser.currentURI.spec) :
				(aTab.linkedBrowser.currentURI.spec == 'about:blank') // BarTab
			) ||
			this.isTabNeedToBeRestored(aTab) // Firefox native
		);
	},
	isTabNeedToBeRestored : function ITS_isTabNeedToBeRestored(aTab)
	{
		var browser = aTab.linkedBrowser;
		// Firefox 25 and later. See: https://bugzilla.mozilla.org/show_bug.cgi?id=867142
		if (this.TabRestoreStates &&
			this.TabRestoreStates.has(browser))
			return this.TabRestoreStates.isNeedsRestore(browser);

		return browser.__SS_restoreState == 1;
	},
	get TabRestoreStates() {
		return this.SessionStoreNS.TabRestoreStates;
	},
	get SessionStoreNS() {
		if (!this._SessionStoreNS) {
			try {
				// resource://app/modules/sessionstore/SessionStore.jsm ?
				this._SessionStoreNS = Components.utils.import('resource:///modules/sessionstore/SessionStore.jsm', {});
			}
			catch(e) {
				this._SessionStoreNS = {};
			}
		}
		return this._SessionStoreNS;
	},
 
	updateAllThumbnails : function ITS_updateAllThumbnails(aTabBrowser, aReason) 
	{
		if (this.disabled ||
			this.updatingAllThumbnails ||
			this.hasUpdatingThumbnail(aTabBrowser))
			return;

		if (aTabBrowser.updateAllThumbnailsTimer)
			window.clearTimeout(aTabBrowser.updateAllThumbnailsTimer);

		var delay = aReason && aReason & this.UPDATE_INIT ?
				this.thumbnailUpdateDelay :
				this.thumbnailUpdateAllDelay ;
		this.lastUpdateAllThumbnailsDelay = Math.max(delay, this.lastUpdateAllThumbnailsDelay || 0);
		aTabBrowser.updateAllThumbnailsTimer = window.setTimeout(this.updateAllThumbnailsNow, this.lastUpdateAllThumbnailsDelay, aTabBrowser, aReason, this);
	},
	updateAllThumbnailsNow : function ITS_updateAllThumbnailsNow(aTabBrowser, aReason, aThis)
	{
		aThis = aThis || this;
		aThis.lastUpdateAllThumbnailsDelay = 0;
		aThis.updatingAllThumbnails = true;

		var tabs = aThis.getTabs(aTabBrowser);
		for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			tabs.snapshotItem(i).setAttribute(aThis.kTHUMBNAIL_UPDATING, true);
			aThis.updateThumbnailNow(tabs.snapshotItem(i), aTabBrowser, aReason);
		}

		window.setTimeout(function ITS_updateAllThumbnailsNowFinishProcess() {
			if (aThis.hasUpdatingThumbnail(aTabBrowser)) {
				window.setTimeout(arguments.callee, aThis.thumbnailUpdateDelay);
				return;
			}
			aTabBrowser.updateAllThumbnailsTimer = null;
			aThis.updatingAllThumbnails = false;
		}, aThis.thumbnailUpdateDelay);
	},
 
	repositionThumbnail : function ITS_repositionThumbnail(aTabBrowser) 
	{
		if (this.disabled) return;

		var tabs = this.getTabs(aTabBrowser);
		var tab;
		var canvas;
		var pos = prefs.getPref('extensions.informationaltab.thumbnail.position');
		for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			tab = tabs.snapshotItem(i);
			canvas = tab.__informationaltab__canvas;
			canvas.parentNode.parentNode.removeChild(canvas.parentNode);
			canvas.parentNode.removeChild(canvas);
			this.insertThumbnailTo(canvas, tab, aTabBrowser, pos);
			this.updateThumbnail(tab, aTabBrowser, this.UPDATE_REFRESH);
		}
	},
 
	hasUpdatingThumbnail : function ITS_hasUpdatingThumbnail(aTabBrowser) 
	{
		return aTabBrowser.ownerDocument.evaluate(
					'descendant::*[@'+this.kTHUMBNAIL_UPDATING+'="true"]',
					aTabBrowser.mTabContainer,
					null,
					XPathResult.BOOLEAN_TYPE,
					null
				).booleanValue;
	},
 
	updateTabStyle : function ITS_updateTabStyle(aTab) 
	{
		if (this.disabled) return;

		this.updateTabBoxStyle(aTab);
		this.updateProgressStyle(aTab);
	},
 
	updateTabBoxStyle : function ITS_updateTabBoxStyle(aTab) 
	{
		var tabContent = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-content');
		var nodes = Array.slice(tabContent ? tabContent.childNodes : document.getAnonymousNodes(aTab) );

		if (this.thumbnailEnabled &&
			!aTab.pinned &&
			aTab.__informationaltab__canvas) {
			let label =this.getLabelTextElement(aTab);
			let style = window.getComputedStyle(aTab.__informationaltab__canvas, null);
			let borderWidth = parseInt(style.borderTopWidth)+
						parseInt(style.borderBottomWidth);
			let canvasHeight = Math.max(parseInt(aTab.__informationaltab__canvas.height) + borderWidth, label.boxObject.height);

			let b = aTab.__informationaltab__parentTabBrowser;
			let box = b.mTabContainer.mTabstrip || b.mTabContainer ;
			let orient = box.getAttribute('orient') || window.getComputedStyle(box, '').MozBoxOrient;
			let selected = aTab.getAttribute('selected') == 'true' ? 'foreground' : 'background' ;

			let key = canvasHeight+':'+orient+':'+selected;
			if (key == nodes[0].getAttribute(this.kLAST_STYLE_KEY)) return;
			nodes[0].setAttribute(this.kLAST_STYLE_KEY, key);

			let contentsHeight = this.thumbnailStyle[orient][selected].contents
							.replace(/%canvas_height%/g, canvasHeight + 'px') || '0px';
			if (/[-+\/\*]/.test(contentsHeight))
				contentsHeight = 'calc(' + contentsHeight + ')';

			let containerStyle = window.getComputedStyle(aTab.__informationaltab__canvas.parentNode, null);
			let margin = parseInt(containerStyle.marginTop)+
						parseInt(containerStyle.marginBottom);
			let tabHeight = this.thumbnailStyle[orient][selected].tab
							.replace(/%canvas_height%/g, canvasHeight + 'px') || '0px';
			tabHeight += '0 - ' + margin + 'px';
			tabHeight = 'calc(' + tabHeight + ')';

			for (let i = 0, maxi = nodes.length; i < maxi; i++)
			{
				let node = nodes[i];
				node.style.setProperty('height', contentsHeight, 'important');
			}
			aTab.style.setProperty('height', tabHeight, 'important');
		}
		else {
			let key = '';
			if (key == nodes[0].getAttribute(this.kLAST_STYLE_KEY)) return;
			nodes[0].setAttribute(this.kLAST_STYLE_KEY, key);
			nodes.push(aTab);
			for (let i = 0, maxi = nodes.length; i < maxi; i++)
			{
				let node = nodes[i];
				node.style.height = '';
			}
		}
	},
 
	updateProgressStyle : function ITS_updateProgressStyle(aTab) 
	{
		var label = this.getLabel(aTab);
		var progress = document.getAnonymousElementByAttribute(label, 'class', 'tab-progress');
		if (!progress)
			return;

		var progressBox = progress.parentNode.boxObject;
		if (!progressBox.width || !progressBox.height)
			progressBox = label.boxObject;

		var key = progressBox.width && progressBox.height ?
				aTab.boxObject.height+':'+
					(progressBox.screenX - aTab.boxObject.screenX)+':'+
					(progressBox.screenY - aTab.boxObject.screenY)+':'+
					this.progressStyle :
				'hidden' ;
		if (key == progress.getAttribute(this.kLAST_STYLE_KEY)) return;
		progress.setAttribute(this.kLAST_STYLE_KEY, key);

		if (this.progressStyle.indexOf('top') > -1 &&
			aTab.__informationaltab__canvas) {
			progress.style.marginBottom = '';
			progress.style.marginTop = '-'+(progressBox.screenY - aTab.boxObject.screenY)+'px';

			let tabX = aTab.boxObject.screenX;

			let canvas = aTab.__informationaltab__canvas;
			let canvasBox = canvas.parentNode.boxObject;
			let marginForCanvas = canvasBox.width ? progressBox.screenX - Math.max(canvasBox.screenX, tabX) : 0 ;

			let favicon = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-icon') || // Tab Mix Plus
						document.getAnonymousElementByAttribute(aTab, 'class', 'tab-icon-image');
			let faviconBox = favicon.boxObject;
			let throbber = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-throbber');
			let throbberBox = throbber.boxObject;
			let iconBox = throbberBox.width && throbberBox.height ? throbberBox : faviconBox ;
			let marginForIcon = iconBox.width ? progressBox.screenX - Math.max(iconBox.screenX, tabX) : 0 ;

			let close = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-close-button always-right') || // Tab Mix Plus
						document.getAnonymousElementByAttribute(aTab, 'anonid', 'close-button') || // with Australis
						document.getAnonymousElementByAttribute(aTab, 'class', 'tab-close-button');
			let closeBox = close.boxObject;
			let marginForClose = closeBox.width ? progressBox.screenX - Math.max(closeBox.screenX, tabX) : 0 ;

			progress.style.marginLeft = '-'+Math.max(marginForCanvas, marginForIcon, marginForClose, 0)+'px';
			// progress.style.marginRight = '-'+(close.boxObject.screenX - progressBox.screenX + progressBox.width)+'px';
		}
		else {
			progress.style.margin = progress.style.marginTop = progress.style.marginLeft = '';
			progress.style.marginBottom = '0';
		}
	},
  
/* Event Handling */ 
	
	handleEvent : function ITS_handleEvent(aEvent) 
	{
		var b;
		switch (aEvent.type)
		{
			case 'DOMContentLoaded':
				this.preInit();
				return;

			case 'load':
				this.init();
				return;

			case 'unload':
				this.destroy();
				return;

			case 'TabSelect':
				if (this.disabled) return;
				var tab = aEvent.originalTarget;
				b = this.getTabBrowserFromChild(aEvent.currentTarget);
				this.updateThumbnailNow(tab, b, this.UPDATE_REFRESH);
				tab.linkedBrowser.messageManager.sendAsyncMessage(this.MESSAGE_TYPE, {
					command : this.COMMAND_REQUEST_PAGE_READ,
					event   : aEvent.type
				});
				return;

			case 'TabOpen':
				b = this.getTabBrowserFromChild(aEvent.currentTarget);
				this.initTab(aEvent.originalTarget, b);
				this.updateAllThumbnails(b, this.UPDATE_REFLOW);
				return;

			case 'TabClose':
				b = this.getTabBrowserFromChild(aEvent.currentTarget);
				this.destroyTab(aEvent.originalTarget, b);
				window.setTimeout(function ITS_onTabCloseWithDelay(aSelf, aBrowser) {
					aSelf.updateAllThumbnails(aBrowser, aSelf.UPDATE_REFLOW);
				}, 0, this, b);
				return;

			case 'TabMove':
				if (this.disabled) return;
				b = this.getTabBrowserFromChild(aEvent.currentTarget);
				this.destroyTab(aEvent.originalTarget);
				this.initTab(aEvent.originalTarget, b);

			case 'TabPinned':
			case 'TabUnpinned':
				return this.updateTabStyle(aEvent.originalTarget);

			case 'SSTabRestoring':
				b = this.getTabBrowserFromChild(aEvent.currentTarget);
				this.updateThumbnailNow(aEvent.originalTarget, b, this.UPDATE_RESTORING);
				return;

			// toolbar customizing on Firefox 4 or later
			case 'beforecustomization':
				this.toolbarCustomizing = true;
				return this.destroyTabBrowser(gBrowser);
			case 'aftercustomization':
				// Ignore it, because 'aftercustomization' fired not
				// following to 'beforecustomization' is invalid.
				// Personal Titlebar addon (or others) fires a fake
				// event on its startup process.
				if (!this.toolbarCustomizing) return;
				this.toolbarCustomizing = false;
				return this.initTabBrowser(gBrowser);

			case 'TreeStyleTabCollapsedStateChange':
				if (aEvent.collapsed) return;
				var tab = aEvent.originalTarget;
				this.updateTabStyle(tab);
				return;
		}
	},
	
  
	observe : function ITS_observe(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'nsPref:changed':
				this.onChangePref(aData);
				break;

			case 'em-action-requested':
				if (!(aSubject instanceof Components.interfaces.nsIUpdateItem) ||
					aSubject.id != this.ID)
					return;
				switch (aData)
				{
					case 'item-disabled':
						this._toBeDisabled = true;
						break;
					case 'item-uninstalled':
						this._toBeUninstalled = true;
						break;
					case 'item-cancel-action':
						this._toBeDisabled = false;
						this._toBeUninstalled = false;
						break;
				}
				break;

			case 'quit-application':
				if (
					!(this._toBeDisabled || this._toBeUninstalled) ||
					prefs.getPref('extensions.informationaltab.restoring_backup_prefs')
					)
					return;
				prefs.setPref('extensions.informationaltab.restoring_backup_prefs', true);
				var backupValue;

				backupValue = prefs.getPref('extensions.informationaltab.backup.browser.tabs.closeButtons');
				if (backupValue > -1) {
					prefs.clearPref('extensions.informationaltab.backup.browser.tabs.closeButtons');
					prefs.setPref('browser.tabs.closeButtons', backupValue);
				}

				backupValue = prefs.getPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
				if (backupValue > -1) {
					prefs.clearPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
					prefs.setPref('browser.tabs.tabClipWidth', backupValue);
				}

				prefs.setPref('extensions.informationaltab.restoring_backup_prefs', false);
				break;
		}
	},
	
	adjustTabstrip : function ITS_adjustTabstrip(aTabBrowser) 
	{
		var container = aTabBrowser.mTabContainer;
		container.mTabClipWidth = prefs.getPref('browser.tabs.tabClipWidth');
		container.adjustTabstrip();
	},
 
	get tabMinWidth() 
	{
		var width = prefs.getPref('browser.tabs.tabMinWidth');
		return width === null ? 100 : width ;
	},
   
/* Pref Listener */ 
	
	domains : [ 
		'extensions.informationaltab',
		'extensions.treestyletab',
		'browser.tabs'
	],
 
	onChangePref : function ITS_onChangePref(aPrefName) 
	{
		var value = prefs.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'extensions.informationaltab.thumbnail.enabled':
				this.thumbnailEnabled = value;
				if (value) {
					document.documentElement.setAttribute(this.kTHUMBNAIL_ENABLED, true);
				}
				else {
					document.documentElement.removeAttribute(this.kTHUMBNAIL_ENABLED);
				}
				window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
					command : this.COMMAND_NOTIFY_CONFIG_UPDATED,
					config  : {
						thumbnailEnabled : value
					}
				});
			case 'extensions.informationaltab.thumbnail.position':
				if (this.thumbnailEnabled) {
					document.documentElement.setAttribute(this.kTHUMBNAIL_POSITION,
						prefs.getPref('extensions.informationaltab.thumbnail.position'));
				}
				else {
					document.documentElement.removeAttribute(this.kTHUMBNAIL_POSITION);
				}
				break;

			case 'extensions.informationaltab.thumbnail.scrolled':
				this.thumbnailScrolled = value;
				window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
					command : this.COMMAND_NOTIFY_CONFIG_UPDATED,
					config  : {
						thumbnailScrolled : value
					}
				});
				break;
			case 'extensions.informationaltab.thumbnail.partial':
				this.thumbnailPartial = value;
				break;
			case 'extensions.informationaltab.thumbnail.partial.maxPixels':
				this.thumbnailPartialMaxPixels = value;
				break;
			case 'extensions.informationaltab.thumbnail.partial.maxPercentage':
				this.thumbnailPartialMaxPercentage = Math.max(1, value) / 100;
				break;
			case 'extensions.informationaltab.thumbnail.partial.startX':
				this.thumbnailPartialBaseX = value;
				break;
			case 'extensions.informationaltab.thumbnail.partial.startY':
				this.thumbnailPartialBaseY = value;
				break;

			case 'extensions.informationaltab.thumbnail.animation':
				this.thumbnailWatchAnimation = value;
				window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
					command : this.COMMAND_NOTIFY_CONFIG_UPDATED,
					config  : {
						thumbnailWatchAnimation : value
					}
				});
				break;

			case 'extensions.informationaltab.thumbnail.size_mode':
				this.thumbnailSizeMode = value;
				break;

			case 'extensions.informationaltab.thumbnail.max':
				this.thumbnailMaxSize = value;
				break;

			case 'extensions.informationaltab.thumbnail.pow':
				this.thumbnailMaxSizePow = value;
				break;

			case 'extensions.informationaltab.thumbnail.fix_aspect_ratio':
				this.thumbnailFixAspectRatio = value;
				break;

			case 'extensions.informationaltab.thumbnail.fixed_aspect_ratio':
				this.thumbnailFixedAspectRatio = 1 / Number(value);
				break;

			case 'extensions.informationaltab.thumbnail.update_delay':
				this.thumbnailUpdateDelay = value;
				window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
					command : this.COMMAND_NOTIFY_CONFIG_UPDATED,
					config  : {
						thumbnailUpdateDelay : value
					}
				});
				break;

			case 'extensions.informationaltab.thumbnail.update_all_delay':
				this.thumbnailUpdateAllDelay = value;
				break;

			case 'extensions.informationaltab.progress.mode':
				this.progressMode = value;
				var panel = document.getElementById('statusbar-progresspanel');
				if (panel) {
					if (value == this.PROGRESS_STATUSBAR ||
						value == this.PROGRESS_BOTH)
						panel.removeAttribute(this.kHIDDEN);
					else
						panel.setAttribute(this.kHIDDEN, true);
				}
				break;
			case 'extensions.informationaltab.progress.position':
			case 'extensions.informationaltab.progress.style':
				this.progressStyle = prefs.getPref('extensions.informationaltab.progress.position')+' '+prefs.getPref('extensions.informationaltab.progress.style');
				if (this.progressStyle) {
					document.documentElement.setAttribute(this.kPROGRESS_STYLE, this.progressStyle);
				}
				else {
					document.documentElement.removeAttribute(this.kPROGRESS_STYLE);
				}
				break;

			case 'extensions.informationaltab.unread.enabled':
				if (value)
					document.documentElement.setAttribute(this.kINDICATE_UNREAD, true);
				else
					document.documentElement.removeAttribute(this.kINDICATE_UNREAD);
				break;

			case 'extensions.informationaltab.unread.readMethod':
				this.readMethod = value;
				window.messageManager.broadcastAsyncMessage(this.MESSAGE_TYPE, {
					command : this.COMMAND_NOTIFY_CONFIG_UPDATED,
					config  : {
						readMethod : value
					}
				});
				break;


			case 'browser.tabs.closeButtons':
				if (this.updatingTabCloseButtonPrefs ||
					prefs.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabCloseButtonPrefs = true;
				var backupValue = prefs.getPref('extensions.informationaltab.backup.browser.tabs.closeButtons');
				if (backupValue < 0) {
					prefs.setPref('extensions.informationaltab.backup.browser.tabs.closeButtons', value);
				}
				this.updatingTabCloseButtonPrefs = false;
				break;


			case 'extensions.informationaltab.close_buttons.force_show':
				if (!value) {
					var backupValue = prefs.getPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
					if (backupValue < 0) return;
					this.updatingTabWidthPrefs = true;
					if (backupValue > prefs.getPref('browser.tabs.tabMinWidth'))
						prefs.setPref('browser.tabs.tabClipWidth', backupValue);
					else
						prefs.clearPref('browser.tabs.tabClipWidth');
					prefs.clearPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
					this.updatingTabWidthPrefs = false;
				}
				else {
					this.updatingTabWidthPrefs = true;
					this.overrideTabClipWidth(this.tabMinWidth);
					this.updatingTabWidthPrefs = false;
				}
				this.adjustTabstrip(gBrowser);
				break;

			case 'extensions.informationaltab.close_buttons.force_show.last_tab':
			case 'browser.tabs.closeWindowWithLastTab':
				var mode = prefs.getPref('extensions.informationaltab.close_buttons.force_show.last_tab');
				var closable = !prefs.getPref('browser.tabs.closeWindowWithLastTab');
				if (mode == 2 || (mode == 0 && closable))
					document.documentElement.setAttribute(this.kSHOW_LAST_CLOSE_BUTTON, true);
				else
					document.documentElement.setAttribute(this.kSHOW_LAST_CLOSE_BUTTON, false);
				break;

			case 'browser.tabs.tabClipWidth':
				if (this.updatingTabWidthPrefs ||
					!prefs.getPref('extensions.informationaltab.close_buttons.force_show') ||
					prefs.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabWidthPrefs = true;
				this.overrideTabClipWidth(this.tabMinWidth);
				this.updatingTabWidthPrefs = false;
				this.adjustTabstrip(gBrowser);
				break;

			case 'browser.tabs.tabMinWidth':
				if (this.updatingTabWidthPrefs ||
					!prefs.getPref('extensions.informationaltab.close_buttons.force_show') ||
					prefs.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabWidthPrefs = true;
				this.overrideTabClipWidth(this.tabMinWidth);
				this.updatingTabWidthPrefs = false;
				this.adjustTabstrip(gBrowser);
				break;

			case 'extensions.treestyletab.tabbar.position':
			case 'extensions.treestyletab.tabbar.autoHide.mode':
			case 'extensions.treestyletab.tabbar.width':
			case 'extensions.treestyletab.tabbar.shrunkenWidth':
				if (!('TreeStyleTabService' in window) ||
					!prefs.getPref('extensions.informationaltab.close_buttons.force_show'))
					return;
				var pos = prefs.getPref('extensions.treestyletab.tabbar.position');
				if (pos == 'left' || pos == 'right') {
					var width = prefs.getPref('extensions.treestyletab.tabbar.width');
					switch (prefs.getPref('extensions.treestyletab.tabbar.autoHide.mode'))
					{
						case gBrowser.treeStyleTab.autoHide.kMODE_DISABLED:
							break;

						case gBrowser.treeStyleTab.autoHide.kMODE_HIDE:
							break;

						default:
						case gBrowser.treeStyleTab.autoHide.kMODE_SHRINK:
							width = prefs.getPref('extensions.treestyletab.tabbar.shrunkenWidth');
							break;
					}
					this.overrideTabClipWidth(width);
				}
				else {
					this.overrideTabClipWidth(this.tabMinWidth);
				}
				break;

			default:
				break;
		}
	},
	overrideTabClipWidth : function ITS_overrideTabClipWidth(aWidth)
	{
		if (!prefs.getPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth'))
			prefs.setPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth', prefs.getPref('browser.tabs.tabClipWidth'));
		prefs.setPref('browser.tabs.tabClipWidth', aWidth || 0);
	},
	updatingTabCloseButtonPrefs : false,
	updatingTabWidthPrefs : false,
  
  
}); 

window.addEventListener('DOMContentLoaded', InformationalTabService, true);
window.addEventListener('load', InformationalTabService, false);
window.addEventListener('unload', InformationalTabService, false);
 
function InformationalTabEventListener(aTab, aTabBrowser) 
{
	this.init(aTab, aTabBrowser);
}
InformationalTabEventListener.prototype = inherit(InformationalTabConstants, {
	mTab : null,
	mTabBrowser : null,
	init : function ITEL_init(aTab, aTabBrowser)
	{
		this.mTab = aTab;
		this.mTabBrowser = aTabBrowser;
		this.lastSelected = this.mTabBrowser.selectedTab == this.mTab;
		this.handleMessage = this.handleMessage.bind(this);

		var manager = window.messageManager;
		manager.addMessageListener(this.MESSAGE_TYPE, this.handleMessage);
		this.notifyConfigUpdatedMessage();

		this.mTabBrowser.mTabContainer.addEventListener('select', this, false);
		this.mTab.addEventListener('TabRemotenessChange', this, false);
	},
	notifyConfigUpdatedMessage : function ITEL_notifyConfigUpdatedMessage()
	{
		this.mTab.linkedBrowser.messageManager.sendAsyncMessage(this.MESSAGE_TYPE, {
			command : this.COMMAND_NOTIFY_CONFIG_UPDATED,
			config  : {
				thumbnailEnabled     : InformationalTabService.thumbnailEnabled,
				thumbnailScrolled    : InformationalTabService.thumbnailScrolled,
				thumbnailUpdateDelay : InformationalTabService.thumbnailUpdateDelay,
				thumbnailWatchAnimation : InformationalTabService.thumbnailWatchAnimation,
				readMethod           : InformationalTabService.readMethod
			}
		});
	},
	destroy : function ITEL_destroy()
	{
		this.mTab.removeEventListener('TabRemotenessChange', this, false);

		var manager = window.messageManager;
		manager.removeMessageListener(this.MESSAGE_TYPE, this.handleMessage);

		this.mTabBrowser.mTabContainer.removeEventListener('select', this, false);
		prefs.removePrefListener(this);

		delete this.mTab;
		delete this.mTabBrowser;
	},
	handleEvent: function ITEL_handleEvent(aEvent)
	{
		const ITS = InformationalTabService;
		switch (aEvent.type)
		{
			case 'select':
				var selected = this.mTabBrowser.selectedTab == this.mTab;
				if (ITS.thumbnailEnabled && this.lastSelected != selected)
					ITS.updateTabStyle(this.mTab);
				this.lastSelected = selected;
				break;

			case 'TabRemotenessChange':
				return this.notifyConfigUpdatedMessage();
		}
	},
	handleMessage : function ITEL_handleMessage(aMessage)
	{
//		dump('*********************handleMessage*******************\n');
//		dump('TARGET IS: '+aMessage.target.localName+'\n');
//		dump(JSON.stringify(aMessage.json)+'\n');

		if (aMessage.target != this.mTab.linkedBrowser)
		  return;

		switch (aMessage.json.command)
		{
			case this.COMMAND_REPORT_THUMBNAIL_URI:
				return this.handleThumbnailURI(aMessage.json.uri);

			case this.COMMAND_REPORT_PROGRESS:
				return this.handleProgress(aMessage.json.percentage);

			case this.COMMAND_REPORT_PAGE_LOADED:
				return this.handlePageLoaded(aMessage.json);

			case this.COMMAND_REPORT_LOCATION_CHANGED:
				return this.handleLocationChanged();

			case this.COMMAND_REPORT_PAGE_SCROLLED:
				return this.handlePageScrolled();

			case this,COMMAND_REPORT_PAGE_READ:
				if (aMessage.json.read)
					this.mTab.removeAttribute(this.kUNREAD);
				return;
		}
	},
	handleThumbnailURI : function ITEL_handleThumbnailURI(aURI)
	{
		if (!InformationalTabService.thumbnailEnabled)
			return;

		// continued from ITS_updateThumbnailNow!
		if (!aURI) {
			this.mTab.removeAttribute(this.kTHUMBNAIL_UPDATING);
			return;
		}
		InformationalTabService.setTabValue(this.mTab, this.kTHUMBNAIL, aURI);
		drawImageFromURI(aURI, this.mTab.__informationaltab__canvas, (function() {
			this.mTab.removeAttribute(this.kTHUMBNAIL_UPDATING);
		}).bind(this));
	},
	handleProgress : function ITEL_handleProgress(aPercentage)
	{
		var shouldUpdateStyle = false;
		if (this.mTab.__informationaltab__progress) { // Tab Mix Plus
			shouldUpdateStyle = !this.mTab.__informationaltab__progress.hasAttribute('value');
			this.updateProgress(this.mTab, 'tab-progress', aPercentage);
			this.updateProgress(this.mTab.__informationaltab__progress, 'value', aPercentage);
		}
		else {
			if (InformationalTabService.progressMode == this.PROGRESS_STATUSBAR) {
				this.mTab.__informationaltab__label.removeAttribute(this.kPROGRESS);
			}
			else {
				shouldUpdateStyle = !this.mTab.__informationaltab__label.hasAttribute(this.kPROGRESS);
				this.updateProgress(this.mTab.__informationaltab__label, this.kPROGRESS, aPercentage);
			}
		}
		if (aPercentage && shouldUpdateStyle)
			InformationalTabService.updateProgressStyle(this.mTab);
	},
	updateProgress : function ITEL_updateProgress(aTarget, aAttr, aPercentage)
	{
		if (aPercentage > 0 && aPercentage < 100) {
			aTarget.setAttribute(aAttr, aPercentage);
		}
		else if (aPercentage <= 0 || aPercentage >= 100) {
			aTarget.removeAttribute(aAttr);
		}
	},
	handlePageLoaded : function ITEL_handlePageLoaded(aState)
	{
		this.mTab.__informationaltab__label.removeAttribute(this.kPROGRESS);

		if (!aState.uri ||
			aState.uri == 'about:config' ||
			aState.read &&
			this.mTab.selected)
			this.mTab.removeAttribute(this.kUNREAD);

		if (aState.uri == 'about:sessionrestore')
			InformationalTabService.overrideSessionRestore(this.mTab.linkedBrowser.contentWindow);
	},
	handleLocationChanged : function ITEL_handleLocationChanged()
	{
		this.mTab.setAttribute(this.kUNREAD, true);
	},
	handlePageScrolled : function ITEL_handlePageScrolled()
	{
		if (this.mTab.selected)
			this.mTab.removeAttribute(this.kUNREAD);
	}
});
window.InformationalTabEventListener = InformationalTabEventListener;
 
function InformationalTabBrowserEventListener(aTabBrowser) 
{
	this.init(aTabBrowser);
}
InformationalTabBrowserEventListener.prototype = {
	mTabBrowser : null,
	init : function ITS_init(aTabBrowser)
	{
		this.mTabBrowser = aTabBrowser;
		window.addEventListener('resize', this, false);
	},
	destroy : function ITS_destroy()
	{
		window.removeEventListener('resize', this, false);
		delete this.mTabBrowser;
	},
	handleEvent: function ITS_handleEvent(aEvent)
	{
		const ITS = InformationalTabService;
		switch (aEvent.type)
		{
			case 'resize':
				ITS.updateAllThumbnails(this.mTabBrowser, ITS.UPDATE_RESIZE);
				break;
		}
	}
};
window.InformationalTabBrowserEventListener = InformationalTabBrowserEventListener;
 
function InformationalTabPrefListener(aTabBrowser) 
{
	this.init(aTabBrowser);
}
InformationalTabPrefListener.prototype = {
	mTabBrowser : null,
	init : function ITPL_init(aTabBrowser)
	{
		this.mTabBrowser = aTabBrowser;
		prefs.addPrefListener(this);
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.enabled');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.size_mode');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.max');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.pow');
	},
	destroy : function ITPL_destroy()
	{
		prefs.removePrefListener(this);
		delete this.mTabBrowser;
	},
	domains : [
		'extensions.informationaltab',
		'extensions.treestyletab'
	],
 	observe : function ITPL_observe(aSubject, aTopic, aPrefName)
	{
		if (aTopic != 'nsPref:changed') return;
		const ITS = InformationalTabService;

		var value = prefs.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'extensions.informationaltab.thumbnail.enabled':
			case 'extensions.informationaltab.thumbnail.partial':
			case 'extensions.informationaltab.thumbnail.partial.maxPixels':
			case 'extensions.informationaltab.thumbnail.partial.maxPercentage':
			case 'extensions.informationaltab.thumbnail.partial.startX':
			case 'extensions.informationaltab.thumbnail.partial.startY':
				if (ITS.initialized)
					ITS.updateAllThumbnails(this.mTabBrowser, ITS.UPDATE_INIT);
				break;

			case 'extensions.treestyletab.tabbar.invertTabContents':
			case 'extensions.informationaltab.thumbnail.position':
			case 'extensions.treestyletab.tabbar.position':
			case 'extensions.informationaltab.progress.style':
				ITS.repositionThumbnail(this.mTabBrowser);
				return;

			case 'extensions.treestyletab.tabbar.style':
				window.setTimeout(function ITS_onChangeTabbarStyleWithDelay(aTabBrowser) {
					var tabs = ITS.getTabs(aTabBrowser);
					for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
					{
						ITS.updateTabStyle(tabs.snapshotItem(i));
					}
				}, 0, this.mTabBrowser);
				return;

			case 'extensions.informationaltab.thumbnail.size_mode':
			case 'extensions.informationaltab.thumbnail.fix_aspect_ratio':
			case 'extensions.informationaltab.thumbnail.fixed_aspect_ratio':
				if (ITS.initialized)
					ITS.updateAllThumbnails(this.mTabBrowser, ITS.UPDATE_RESIZE);
				break;

			case 'extensions.informationaltab.thumbnail.max':
				if (ITS.initialized &&
					ITS.thumbnailSizeMode == ITS.SIZE_MODE_FIXED)
					ITS.updateAllThumbnails(this.mTabBrowser, ITS.UPDATE_RESIZE);
				break;

			case 'extensions.informationaltab.thumbnail.pow':
				if (ITS.initialized &&
					ITS.thumbnailSizeMode == ITS.SIZE_MODE_FLEXIBLE)
					ITS.updateAllThumbnails(this.mTabBrowser, ITS.UPDATE_RESIZE);
				break;

			default:
				break;
		}
	}
};
window.InformationalTabPrefListener = InformationalTabPrefListener;
 
})();
