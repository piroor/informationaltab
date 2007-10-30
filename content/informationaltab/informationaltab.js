var InformationalTabService = { 
	ID       : 'informationaltab@piro.sakura.ne.jp',
	PREFROOT : 'extensions.informationaltab@piro.sakura.ne.jp',

	disabled : false,

	thumbnailEnabled : false,

	POSITION_BEFORE_FAVICON  : 0,
	POSITION_BEFORE_LABEL    : 1,
	POSITION_BEFORE_CLOSEBOX : 2,

	thumbnailSizeMode  : 0,
	SIZE_MODE_FIXED    : 0,
	SIZE_MODE_FLEXIBLE : 1,

	thumbnailMinSize     : 20,
	thumbnailMaxSize     : 0,
	thumbnailMaxSizePow  : 1,
	thumbnailUpdateDelay : 0,
	thumbnailBG          : 'rgba(0,0,0,0.5)',

	progressMode  : 1,
	PROGRESS_STATUSBAR : 0,
	PROGRESS_TAB       : 1,
	PROGRESS_BOTH      : 2,

	UPDATE_INIT     : 0,
	UPDATE_PAGELOAD : 1,
	UPDATE_RESIZE   : 2,
	UPDATE_SCROLL   : 3,
	UPDATE_REFLOW   : 4,
	 
/* Utilities */ 
	
	get browser() 
	{
		return gBrowser;
	},
 
	ObserverService : Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService), 
  
/* Initializing */ 
	 
	init : function() 
	{
		if (!('gBrowser' in window)) return;

		window.removeEventListener('load', this, false);


		this.styleStringBundle = document.getElementById('informationaltab-tab-style-bundle');

		eval('this.thumbnailMinSize = '+this.styleStringBundle.getString('thumbnail_min_size'));

		this.thumbnailHTabH   = this.styleStringBundle.getString('thumbnail_htab_height');
		this.thumbnailHTabCH  = this.styleStringBundle.getString('thumbnail_htab_contents_height');
		this.thumbnailHTabS   = this.styleStringBundle.getString('thumbnail_htab_style');
		this.thumbnailHTabHS  = this.styleStringBundle.getString('thumbnail_htab_height_selected');
		this.thumbnailHTabCHS = this.styleStringBundle.getString('thumbnail_htab_contents_height_selected');
		this.thumbnailHTabSS  = this.styleStringBundle.getString('thumbnail_htab_style_selected');
		this.thumbnailVTabH   = this.styleStringBundle.getString('thumbnail_vtab_height');
		this.thumbnailVTabCH  = this.styleStringBundle.getString('thumbnail_vtab_contents_height');
		this.thumbnailVTabS   = this.styleStringBundle.getString('thumbnail_vtab_style');
		this.thumbnailVTabHS  = this.styleStringBundle.getString('thumbnail_vtab_height_selected');
		this.thumbnailVTabCHS = this.styleStringBundle.getString('thumbnail_vtab_contents_height_selected');
		this.thumbnailVTabSS  = this.styleStringBundle.getString('thumbnail_vtab_style_selected');

		eval('this.thumbnailBG = "'+this.styleStringBundle.getString('thumbnail_background')+'"');


		this.addPrefListener(this);
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.enabled');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.size_mode');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.max');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.pow');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.update_delay');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.progress.mode');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.unread.enabled');
		this.observe(null, 'nsPref:changed', 'browser.tabs.tabClipWidth');

		this.ObserverService.addObserver(this, 'em-action-requested', false);
		this.ObserverService.addObserver(this, 'quit-application', false);


		if ('PrintUtils' in window) {
			eval('PrintUtils.printPreview = '+
				PrintUtils.printPreview.toSource().replace(
					'{',
					'{ InformationalTabService.disableAllFeatures();'
				)
			);
			eval('PrintUtils.exitPrintPreview = '+
				PrintUtils.exitPrintPreview.toSource().replace(
					'_content.focus();',
					'_content.focus(); InformationalTabService.enableAllFeatures();'
				)
			);
		}

		this.initTabBrowser(gBrowser);

		this.initialized = true;
	},
	
	initTabBrowser : function(aTabBrowser) 
	{
		aTabBrowser.thumbnailUpdateCount = 0;

		var tabs = aTabBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.initTab(tabs[i], aTabBrowser);
		}

		var listener = new InformationalTabPrefListener(aTabBrowser);
		aTabBrowser.__informationaltab__prefListener = listener;
		this.addPrefListener(listener);
		listener.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.enabled');
		listener.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.size_mode');
		listener.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.max');
		listener.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.pow');

		aTabBrowser.__informationaltab__eventListener = new InformationalTabBrowserEventListener(aTabBrowser);
		window.addEventListener('resize', aTabBrowser.__informationaltab__eventListener, false);
		aTabBrowser.addEventListener('TabOpen',  this, false);
		aTabBrowser.addEventListener('TabClose', this, false);
		aTabBrowser.addEventListener('TabMove',  this, false);

		delete i;
		delete maxi;
		delete tabs;
	},
 
	initTab : function(aTab, aTabBrowser) 
	{
		if (aTab.__informationaltab__progressListener) return;

		aTab.__informationaltab__parentTabBrowser = aTabBrowser;

		var filter = Components.classes['@mozilla.org/appshell/component/browser-status-filter;1'].createInstance(Components.interfaces.nsIWebProgress);
		var listener = new InformationalTabProgressListener(aTab, aTabBrowser);
		filter.addProgressListener(listener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		aTab.linkedBrowser.webProgress.addProgressListener(filter, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		aTab.__informationaltab__progressListener = listener;
		aTab.__informationaltab__progressFilter   = filter;

		this.insertCanvasToTab(aTab, aTabBrowser);

		aTab.__informationaltab__eventListener = new InformationalTabEventListener(aTab, aTabBrowser);
		aTab.linkedBrowser.addEventListener('scroll', aTab.__informationaltab__eventListener, false);
		aTab.addEventListener('DOMAttrModified', aTab.__informationaltab__eventListener, false);
	},
	insertCanvasToTab : function(aTab, aTabBrowser)
	{
		var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		canvas.setAttribute('class', 'informationaltab-thumbnail');
		canvas.width = canvas.height = canvas.style.width = canvas.style.height = 0;
		canvas.style.display = 'none';

		var label = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text');
		switch(this.getPref('extensions.informationaltab.thumbnail.position'))
		{
			case this.POSITION_BEFORE_FAVICON:
				if (aTabBrowser.getAttribute('treestyletab-vertical') == 'true' &&
					aTabBrowser.getAttribute('treestyletab-appearance-inverted') == 'true') {
					var left = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-image-left');
					if (left) left.appendChild(canvas);
				}
				else {
					label.parentNode.insertBefore(canvas, label.parentNode.firstChild);
				}
				break;
			case this.POSITION_BEFORE_LABEL:
				if (aTabBrowser.getAttribute('treestyletab-vertical') == 'true' &&
					aTabBrowser.getAttribute('treestyletab-appearance-inverted') == 'true') {
					label.parentNode.insertBefore(canvas, label.parentNode.firstChild);
				}
				else {
					label.parentNode.insertBefore(canvas, label);
				}
				break;
			case this.POSITION_BEFORE_CLOSEBOX:
				label.parentNode.appendChild(canvas);
				break;
		}
		aTab.__informationaltab__canvas = canvas;
		this.updateThumbnail(aTab, aTabBrowser, this.UPDATE_INIT);
	},
  
	destroy : function() 
	{
		this.destroyTabBrowser(gBrowser);

		window.removeEventListener('unload', this, false);

		this.ObserverService.removeObserver(this, 'em-action-requested');
		this.ObserverService.removeObserver(this, 'quit-application');

		this.removePrefListener(this);
	},
	
	destroyTabBrowser : function(aTabBrowser) 
	{
		this.removePrefListener(aTabBrowser.__informationaltab__prefListener);
		delete aTabBrowser.__informationaltab__prefListener.mTabBrowser;
		delete aTabBrowser.__informationaltab__prefListener;

		window.removeEventListener('resize', aTabBrowser.__informationaltab__eventListener, false);
		delete aTabBrowser.__informationaltab__eventListener.mTabBrowser;
		delete aTabBrowser.__informationaltab__eventListener;

		aTabBrowser.removeEventListener('TabOpen',  this, false);
		aTabBrowser.removeEventListener('TabClose', this, false);
		aTabBrowser.removeEventListener('TabMove',  this, false);

		var tabs = aTabBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			this.destroyTab(tabs[i]);
		}
	},
 
	destroyTab : function(aTab) 
	{
		try {
			if (aTab.__informationaltab__canvas)
				aTab.__informationaltab__canvas.parentNode.removeChild(aTab.__informationaltab__canvas);
			delete aTab.__informationaltab__canvas;

			delete aTab.__informationaltab__parentTabBrowser;

			aTab.linkedBrowser.webProgress.removeProgressListener(aTab.__informationaltab__progressFilter);
			aTab.__informationaltab__progressFilter.removeProgressListener(aTab.__informationaltab__progressListener);

			delete aTab.__informationaltab__progressListener.mLabel;
			delete aTab.__informationaltab__progressListener.mTab;
			delete aTab.__informationaltab__progressListener.mTabBrowser;

			delete aTab.__informationaltab__progressFilter;
			delete aTab.__informationaltab__progressListener;

			aTab.linkedBrowser.removeEventListener('scroll', aTab.__informationaltab__eventListener, false);
			aTab.removeEventListener('DOMAttrModified', aTab.__informationaltab__eventListener, false);
			delete aTab.__informationaltab__eventListener.mTab;
			delete aTab.__informationaltab__eventListener.mTabBrowser;
			delete aTab.__informationaltab__eventListener;
		}
		catch(e) {
			dump(e+'\n');
		}
	},
  
	disableAllFeatures : function() 
	{
		this.disabled = true;
	},
	enableAllFeatures : function()
	{
		this.disabled = false;
	},
 	 
/* thumbnail */ 
	
	updateThumbnail : function(aTab, aTabBrowser, aReason) 
	{
		if (this.disabled || aTab.updateThumbnailTimer) return;

		aTabBrowser.thumbnailUpdateCount++;

		aTab.updateThumbnailTimer = window.setTimeout(this.updateThumbnailNow, this.thumbnailUpdateDelay, aTab, aTabBrowser, aReason, this);
	},
	updateThumbnailNow : function(aTab, aTabBrowser, aReason, aThis, aImage)
	{
		if (!aThis) aThis = this;

		var canvas = aTab.__informationaltab__canvas;

		if (aThis.thumbnailEnabled) {
			var b   = aTab.linkedBrowser;
			var win = b.contentWindow;
			var w   = win.innerWidth;
			var h   = win.innerHeight;
			var aspectRatio = aThis.getPref('extensions.informationaltab.thumbnail.fix_aspect_ratio') ? (1 / 0.75) : (w / h) ;

			var size = aThis.thumbnailSizeMode == aThis.SIZE_MODE_FIXED ?
						aThis.thumbnailMaxSize :
						aTab.boxObject.width * aThis.thumbnailMaxSizePow / 100 ;
			size = Math.max(size, aThis.thumbnailMinSize);
			var canvasW = Math.floor((aspectRatio < 1) ? (size * aspectRatio) : size );
			var canvasH = Math.floor((aspectRatio > 1) ? (size / aspectRatio) : size );

			var isImage = b.contentDocument.contentType.indexOf('image') == 0;

			if (
				(
					aReason == aThis.UPDATE_RESIZE ||
					aReason == aThis.UPDATE_REFLOW
				) ?
					!(
						Math.abs(parseInt(canvas.width) - canvasW) <= 1 &&
						Math.abs(parseInt(canvas.height) - canvasH) <= 1
					) :
				aReason == aThis.UPDATE_SCROLL ?
					!isImage :
					true
				) {

				canvas.width  = canvasW;
				canvas.height = canvasH;
				canvas.style.width  = canvasW+'px';
				canvas.style.height = canvasH+'px';
				canvas.style.display = 'block';
				aThis.updateTabStyle(aTab, aTab.getAttribute('selected') == 'true');

				try {
					var ctx = canvas.getContext('2d');
					ctx.clearRect(0, 0, canvasW, canvasH);
					if (!isImage) {
						ctx.save();
						if (h * canvasW/w < canvasH)
							ctx.scale(canvasH/h, canvasH/h);
						else
							ctx.scale(canvasW/w, canvasW/w);
						ctx.drawWindow(win, 0/*win.scrollX*/, win.scrollY, w, h, aThis.thumbnailBG);
						ctx.restore();
					}
					else {
						if (aImage && aImage instanceof Image) {
							ctx.fillStyle = aThis.thumbnailBG;
							ctx.fillRect(0, 0, canvasW, canvasH);
							var iW = parseInt(aImage.width);
							var iH = parseInt(aImage.height);
							var x = 0;
							var y = 0;
							ctx.save();
							if ((iW / iH) < 1) {
								iW = iW * canvasH / iH;
								x = Math.floor((canvasW - iW) / 2 );
								iH = size;
							}
							else {
								iH = iH * canvasW / iW;
								y = Math.floor((canvasH - iH) / 2 );
								iW = size;
							}
							ctx.drawImage(aImage, x, y, iW, iH);
							ctx.restore();
						}
						else {
							var img = new Image();
							img.src = b.currentURI.spec;
							var self = arguments.callee;
							img.addEventListener('load', function() {
								img.removeEventListener('load', arguments.callee, false);
								self(aTab, aTabBrowser, aThis.UPDATE_PAGELOAD, aThis, img);
								delete self;
								delete img;
								delete canvas;
								delete ctx;
								delete b;
								delete win;
							}, false);
							return;
						}
					}
				}
				catch(e) {
				}
			}
		}
		else {
			canvas.width = canvas.height = canvas.style.width = canvas.style.height = 0;
			canvas.style.display = 'none';
			aThis.updateTabStyle(aTab, aTab.getAttribute('selected') == 'true');
		}

		if (aTab.updateThumbnailTimer) {
			window.clearTimeout(aTab.updateThumbnailTimer);
		}
		aTab.updateThumbnailTimer = null;
		aTabBrowser.thumbnailUpdateCount--;
	},
 
	updateAllThumbnails : function(aTabBrowser, aReason) 
	{
		if (this.disabled ||
			aTabBrowser.updateAllThumbnailsTimer ||
			aTabBrowser.thumbnailUpdateCount) return;

		aTabBrowser.updateAllThumbnailsTimer = window.setTimeout(this.updateAllThumbnailsNow, this.thumbnailUpdateDelay, aTabBrowser, aReason, this);
	},
	updateAllThumbnailsNow : function(aTabBrowser, aReason, aThis)
	{
		if (!aThis) aThis = this;

		var tabs = aTabBrowser.mTabContainer.childNodes;
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			aTabBrowser.thumbnailUpdateCount++;
			aThis.updateThumbnailNow(tabs[i], aTabBrowser, aReason);
		}

		window.setTimeout(function() {
			if (aTabBrowser.thumbnailUpdateCount) {
				window.setTimeout(arguments.callee, aThis.thumbnailUpdateDelay);
				return;
			}
			aTabBrowser.updateAllThumbnailsTimer = null;
		}, aThis.thumbnailUpdateDelay);
	},
 
	repositionThumbnail : function(aTabBrowser) 
	{
		if (this.disabled) return;

		var tabs = aTabBrowser.mTabContainer.childNodes;
		var label;
		var canvas;
		var pos = this.getPref('extensions.informationaltab.thumbnail.position');
		for (var i = 0, maxi = tabs.length; i < maxi; i++)
		{
			canvas = tabs[i].__informationaltab__canvas;
			label  = document.getAnonymousElementByAttribute(tabs[i], 'class', 'tab-text');
			canvas.parentNode.removeChild(canvas);
			switch(pos)
			{
				case this.POSITION_BEFORE_FAVICON:
					label.parentNode.insertBefore(canvas, label.parentNode.firstChild);
					break;
				case this.POSITION_BEFORE_LABEL:
					label.parentNode.insertBefore(canvas, label);
					break;
				case this.POSITION_BEFORE_CLOSEBOX:
					label.parentNode.appendChild(canvas);
					break;
			}
			this.updateThumbnail(tabs[i], aTabBrowser, this.UPDATE_INIT);
		}
	},
 
	updateTabStyle : function(aTab, aSelected) 
	{
		if (this.disabled) return;

		var canvasH = parseInt(aTab.__informationaltab__canvas.height);
		var nodes = document.getAnonymousNodes(aTab);

		if (this.thumbnailEnabled) {
			var b = aTab.__informationaltab__parentTabBrowser;
			var box = b.mTabContainer.mTabstrip || b.mTabContainer ;
			var isVertical = ((box.getAttribute('orient') || window.getComputedStyle(box, '').getPropertyValue('-moz-box-orient')) == 'vertical');

			if (aSelected) {
				if (isVertical) {
					eval('var tabH = '+this.thumbnailVTabHS.replace(/%canvas_height%/g, canvasH)+','+
							'tabCH = '+this.thumbnailVTabCHS.replace(/%canvas_height%/g, canvasH)+','+
							'tabS = "'+this.thumbnailVTabSS.replace(/%canvas_height%/g, canvasH)+'"');
				}
				else {
					eval('var tabH = '+this.thumbnailHTabHS.replace(/%canvas_height%/g, canvasH)+','+
							'tabCH = '+this.thumbnailHTabCHS.replace(/%canvas_height%/g, canvasH)+','+
							'tabS = "'+this.thumbnailHTabSS.replace(/%canvas_height%/g, canvasH)+'"');
				}
			}
			else {
				if (isVertical) {
					eval('var tabH = '+this.thumbnailVTabHS.replace(/%canvas_height%/g, canvasH)+','+
							'tabCH = '+this.thumbnailVTabCHS.replace(/%canvas_height%/g, canvasH)+','+
							'tabS = "'+this.thumbnailVTabSS.replace(/%canvas_height%/g, canvasH)+'"');
				}
				else {
					eval('var tabH = '+this.thumbnailHTabH.replace(/%canvas_height%/g, canvasH)+','+
							'tabCH = '+this.thumbnailHTabCH.replace(/%canvas_height%/g, canvasH)+','+
							'tabS = "'+this.thumbnailHTabS.replace(/%canvas_height%/g, canvasH)+'"');
				}
			}
			for (var i = 0, maxi = nodes.length; i < maxi; i++)
			{
				nodes[i].setAttribute('style', nodes[i].getAttribute('style')+';height:'+tabCH+'px !important;');
			}
			aTab.setAttribute('style', aTab.getAttribute('style')+';'+tabS+';height:'+tabH+'px !important;');
		}
		else {
			for (var i = 0, maxi = nodes.length; i < maxi; i++)
			{
				nodes[i].setAttribute('style', nodes[i].getAttribute('style').replace(/(^|;)height\s*:\s*[^;]*/, '$1'));
			}
			aTab.setAttribute('style', aTab.getAttribute('style').replace(/(^|;)height\s*:\s*[^;]*/, '$1'));
		}
	},
  
/* Event Handling */ 
	
	handleEvent : function(aEvent) 
	{
		switch (aEvent.type)
		{
			case 'load':
				this.init();
				break;

			case 'unload':
				this.destroy();
				break;

			case 'select':
				if (this.disabled) return;
				var tab = aEvent.originalTarget.selectedItem;
				alert(tab.localName+'\n');
				if (!this.isScrollable(tab.linkedBrowser.contentWindow))
					tab.removeAttribute('informationaltab-unread');
				break;

			case 'TabOpen':
				this.initTab(aEvent.target, this);
				this.updateAllThumbnails(aEvent.currentTarget, this.UPDATE_REFLOW);
				break;

			case 'TabClose':
				this.destroyTab(aEvent.target);
				window.setTimeout(function(aSelf, aBrowser) {
					aSelf.updateAllThumbnails(aBrowser, aSelf.UPDATE_REFLOW);
				}, 0, this, aEvent.currentTarget);
				break;

			case 'TabMove':
				if (this.disabled) return;
				var b = aEvent.originalTarget;
				while (b.localName != 'tabbrowser')
					b = b.parentNode;
				this.destroyTab(aEvent.originalTarget);
				this.initTab(aEvent.originalTarget, b);
				break;
		}
	},
	
	isScrollable : function(aFrame) 
	{
		if (!aFrame) return false;

		if (aFrame.scrollMaxY > 0)
			return true;

		var children = aFrame.frames;
		if (children && children.length)
			for (var i = 0, maxi = children.length; i  <maxi; i++)
				if (arguments.callee(children[i]))
					return true;

		return false;
	},
  
	observe : function(aSubject, aTopic, aData) 
	{
		switch (aTopic)
		{
			case 'nsPref:changed':
				this.onChangePref(aSubject, aTopic, aData);
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
					this.getPref('extensions.informationaltab.restoring_backup_prefs')
					)
					return;
				this.setPref('extensions.informationaltab.restoring_backup_prefs', true);
				var backupValue;

				backupValue = this.getPref('extensions.informationaltab.backup.browser.tabs.closeButtons');
				if (backupValue > -1) {
					this.clearPref('extensions.informationaltab.backup.browser.tabs.closeButtons');
					this.setPref('browser.tabs.closeButtons', backupValue);
				}

				backupValue = this.getPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
				if (backupValue > -1) {
					this.clearPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
					this.setPref('browser.tabs.tabClipWidth', backupValue);
				}

				this.setPref('extensions.informationaltab.restoring_backup_prefs', false);
				break;
		}
	},
	
	adjustTabstrip : function(aTabBrowser) 
	{
		aTabBrowser.mTabContainer.mTabClipWidth = this.getPref('browser.tabs.tabClipWidth');
		aTabBrowser.mTabContainer.mTabMinWidth  = this.getPref('browser.tabs.tabMinWidth');
		aTabBrowser.mTabContainer.adjustTabstrip();
	},
   
/* Pref Listener */ 
	
	domains : [ 
		'extensions.informationaltab',
		'browser.tabs'
	],
 
	onChangePref : function(aSubject, aTopic, aPrefName) 
	{
		if (aTopic != 'nsPref:changed') return;

		var value = this.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'extensions.informationaltab.thumbnail.enabled':
				this.thumbnailEnabled = value;
				if (value) {
					document.documentElement.setAttribute('informationaltab-thumbnail-enabled', true);
				}
				else {
					document.documentElement.removeAttribute('informationaltab-thumbnail-enabled');
				}
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

			case 'extensions.informationaltab.thumbnail.update_delay':
				this.thumbnailUpdateDelay = value;
				break;

			case 'extensions.informationaltab.progress.mode':
				this.progressMode = value;
				var panel = document.getElementById('statusbar-progresspanel');
				if (value == this.PROGRESS_STATUSBAR ||
					value == this.PROGRESS_BOTH)
					panel.removeAttribute('informationaltab-hidden');
				else
					panel.setAttribute('informationaltab-hidden', true);
				break;

			case 'extensions.informationaltab.unread.enabled':
				if (value)
					document.documentElement.setAttribute('informationaltab-indicate-unread', true);
				else
					document.documentElement.removeAttribute('informationaltab-indicate-unread');
				break;


			case 'browser.tabs.closeButtons':
				if (this.updatingTabCloseButtonPrefs ||
					this.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabCloseButtonPrefs = true;
				var backupValue = this.getPref('extensions.informationaltab.backup.browser.tabs.closeButtons');
				if (backupValue < 0) {
					this.setPref('extensions.informationaltab.backup.browser.tabs.closeButtons', value);
				}
				this.updatingTabCloseButtonPrefs = false;
				break;


			case 'extensions.informationaltab.close_buttons.force_show':
				if (!value) {
					var backupValue = this.getPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
					if (backupValue < 0) return;
					this.updatingTabWidthPrefs = true;
					if (backupValue > this.getPref('browser.tabs.tabMinWidth'))
						this.setPref('browser.tabs.tabClipWidth', backupValue);
					else
						this.clearPref('browser.tabs.tabClipWidth');
					this.clearPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth');
					this.updatingTabWidthPrefs = false;
				}
				else {
					this.updatingTabWidthPrefs = true;
					this.setPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth', this.getPref('browser.tabs.tabClipWidth'));
					this.setPref('browser.tabs.tabClipWidth', this.getPref('browser.tabs.tabMinWidth'));
					this.updatingTabWidthPrefs = false;
				}
				this.adjustTabstrip(gBrowser);
				break;

			case 'browser.tabs.tabClipWidth':
				if (this.updatingTabWidthPrefs ||
					!this.getPref('extensions.informationaltab.close_buttons.force_show') ||
					this.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabWidthPrefs = true;
				this.setPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth', this.getPref('browser.tabs.tabClipWidth'));
				this.setPref('browser.tabs.tabClipWidth', this.getPref('browser.tabs.tabMinWidth'));
				this.updatingTabWidthPrefs = false;
				this.adjustTabstrip(gBrowser);
				break;

			case 'browser.tabs.tabMinWidth':
				if (this.updatingTabWidthPrefs ||
					!this.getPref('extensions.informationaltab.close_buttons.force_show') ||
					this.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabWidthPrefs = true;
				this.setPref('browser.tabs.tabClipWidth', this.getPref('browser.tabs.tabMinWidth'));
				this.updatingTabWidthPrefs = false;
				this.adjustTabstrip(gBrowser);
				break;


			default:
				break;
		}
	},
	updatingTabCloseButtonPrefs : false,
	updatingTabWidthPrefs : false,
  
/* Save/Load Prefs */ 
	 
	get Prefs() 
	{
		if (!this._Prefs) {
			this._Prefs = Components.classes['@mozilla.org/preferences;1'].getService(Components.interfaces.nsIPrefBranch);
		}
		return this._Prefs;
	},
	_Prefs : null,
 
	getPref : function(aPrefstring) 
	{
		try {
			switch (this.Prefs.getPrefType(aPrefstring))
			{
				case this.Prefs.PREF_STRING:
					return decodeURIComponent(escape(this.Prefs.getCharPref(aPrefstring)));
					break;
				case this.Prefs.PREF_INT:
					return this.Prefs.getIntPref(aPrefstring);
					break;
				default:
					return this.Prefs.getBoolPref(aPrefstring);
					break;
			}
		}
		catch(e) {
		}

		return null;
	},
 
	setPref : function(aPrefstring, aNewValue) 
	{
		var pref = this.Prefs ;
		var type;
		try {
			type = typeof aNewValue;
		}
		catch(e) {
			type = null;
		}

		switch (type)
		{
			case 'string':
				pref.setCharPref(aPrefstring, unescape(encodeURIComponent(aNewValue)));
				break;
			case 'number':
				pref.setIntPref(aPrefstring, parseInt(aNewValue));
				break;
			default:
				pref.setBoolPref(aPrefstring, aNewValue);
				break;
		}
		return true;
	},
 
	clearPref : function(aPrefstring) 
	{
		try {
			this.Prefs.clearUserPref(aPrefstring);
		}
		catch(e) {
		}

		return;
	},
 
	addPrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.addObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	},
 
	removePrefListener : function(aObserver) 
	{
		var domains = ('domains' in aObserver) ? aObserver.domains : [aObserver.domain] ;
		try {
			var pbi = this.Prefs.QueryInterface(Components.interfaces.nsIPrefBranchInternal);
			for (var i = 0; i < domains.length; i++)
				pbi.removeObserver(domains[i], aObserver, false);
		}
		catch(e) {
		}
	}
   
}; 

window.addEventListener('load', InformationalTabService, false);
window.addEventListener('unload', InformationalTabService, false);
 
function InformationalTabProgressListener(aTab, aTabBrowser) 
{
	this.mTab = aTab;
	this.mLabel = document.getAnonymousElementByAttribute(this.mTab, 'class', 'tab-text');
	this.mTabBrowser = aTabBrowser;
}
InformationalTabProgressListener.prototype = {
	mTab        : null,
	mLabel      : null,
	mTabBrowser : null,
	onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if (aMaxTotalProgress < 1)
			return;

		if (InformationalTabService.progressMode == InformationalTabService.PROGRESS_STATUSBAR) {
			this.mLabel.removeAttribute('informationaltab-progress');
			return;
		}

		var percentage = parseInt((aCurTotalProgress * 100) / aMaxTotalProgress);
		if (percentage > 0 && percentage < 100)
			this.mLabel.setAttribute('informationaltab-progress', percentage);
		else if (percentage <= 0 || percentage >= 100)
			this.mLabel.removeAttribute('informationaltab-progress');
	},
	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
		if (
			aStateFlags & nsIWebProgressListener.STATE_STOP &&
			aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK
			) {
			InformationalTabService.updateThumbnail(this.mTab, this.mTabBrowser, InformationalTabService.UPDATE_PAGELOAD);
			if (
				!this.mTab.linkedBrowser.currentURI ||
				this.mTab.linkedBrowser.currentURI.spec == 'about:config' ||
				(
					(this.mTab.getAttribute('selected') == 'true') &&
					!InformationalTabService.isScrollable(this.mTab.linkedBrowser.contentWindow)
				)
				)
				this.mTab.removeAttribute('informationaltab-unread');
		}
	},
	onLocationChange : function(aWebProgress, aRequest, aLocation)
	{
		this.mTab.setAttribute('informationaltab-unread', true);
	},
	onStatusChange : function(aWebProgress, aRequest, aStatus, aMessage)
	{
	},
	onSecurityChange : function(aWebProgress, aRequest, aState)
	{
	},
	QueryInterface : function(aIID)
	{
		if (aIID.equals(Components.interfaces.nsIWebProgressListener) ||
			aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
			aIID.equals(Components.interfaces.nsISupports))
			return this;
		throw Components.results.NS_NOINTERFACE;
	}
};
 
function InformationalTabEventListener(aTab, aTabBrowser) 
{
	this.mTab = aTab;
	this.mTabBrowser = aTabBrowser;
}
InformationalTabEventListener.prototype = {
	mTab : null,
	mTabBrowser : null,
	handleEvent: function(aEvent)
	{
		const ITS = InformationalTabService;
		switch (aEvent.type)
		{
			case 'scroll':
				if (aEvent.originalTarget.toString().indexOf('Document') < 0)
					return;
				this.mTab.removeAttribute('informationaltab-unread');
				ITS.updateThumbnail(this.mTab, this.mTabBrowser, ITS.UPDATE_SCROLL);
				break;

			case 'DOMAttrModified':
				switch(aEvent.attrName)
				{
					case 'selected':
						if (!ITS.thumbnailEnabled) return;
						ITS.updateTabStyle(this.mTab, aEvent.newValue == 'true');
						break;
				}
				break;
		}
	}
};
 
function InformationalTabBrowserEventListener(aTabBrowser) 
{
	this.mTabBrowser = aTabBrowser;
}
InformationalTabBrowserEventListener.prototype = {
	mTabBrowser : null,
	handleEvent: function(aEvent)
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
 
function InformationalTabPrefListener(aTabBrowser) 
{
	this.mTabBrowser = aTabBrowser;
}
InformationalTabPrefListener.prototype = {
	mTabBrowser : null,
	domains : [
		'extensions.informationaltab',
		'extensions.treestyletab'
	],
 	observe : function(aSubject, aTopic, aPrefName)
	{
		if (aTopic != 'nsPref:changed') return;
		const ITS = InformationalTabService;

		var value = ITS.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'extensions.informationaltab.thumbnail.enabled':
				if (ITS.initialized)
					ITS.updateAllThumbnails(this.mTabBrowser, ITS.UPDATE_INIT);
				break;

			case 'extensions.informationaltab.thumbnail.position':
			case 'extensions.treestyletab.tabbar.position':
				ITS.repositionThumbnail(this.mTabBrowser);
				return;

			case 'extensions.informationaltab.thumbnail.size_mode':
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
 
