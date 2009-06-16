var InformationalTabService = { 
	ID       : 'informationaltab@piro.sakura.ne.jp',
	PREFROOT : 'extensions.informationaltab@piro.sakura.ne.jp',

	disabled : false,

	thumbnailEnabled : false,

	thumbnailPartial      : true,
	thumbnailPartialMax   : 200,
	thumbnailPartialBaseX : 0,
	thumbnailPartialBaseY : 0,

	thumbnailScrolled : true,

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

	thumbnailSizeMode  : 0,
	SIZE_MODE_FIXED    : 0,
	SIZE_MODE_FLEXIBLE : 1,

	thumbnailMinSize     : 20,
	thumbnailMaxSize     : 0,
	thumbnailMaxSizePow  : 1,
	thumbnailFixAspectRatio   : true,
	thumbnailFixedAspectRatio : 1,
	thumbnailUpdateDelay : 0,
	thumbnailBG          : 'rgba(0,0,0,0.5)',

	kCONTAINER : 'informationaltab-thumbnail-container',

	progressMode  : 1,
	PROGRESS_STATUSBAR : 0,
	PROGRESS_TAB       : 1,
	PROGRESS_BOTH      : 2,

	UPDATE_INIT     : 1,
	UPDATE_PAGELOAD : 2,
	UPDATE_RESIZE   : 4,
	UPDATE_SCROLL   : 8,
	UPDATE_REFLOW   : 16,
	UPDATE_REPAINT  : 32,

	readMethod : 0,
	
/* Utilities */ 
	
	get browser() 
	{
		return gBrowser;
	},
 
	ObserverService : Components.classes['@mozilla.org/observer-service;1'].getService(Components.interfaces.nsIObserverService), 
 
	getTabBrowserFromChild : function(aNode) 
	{
		if (!aNode) return null;
		return aNode.ownerDocument.evaluate(
				'ancestor-or-self::*[local-name()="tabbrowser"]',
				aNode,
				null,
				XPathResult.FIRST_ORDERED_NODE_TYPE,
				null
			).singleNodeValue;
	},
 
	getTabs : function(aTabBrowser) 
	{
		return aTabBrowser.ownerDocument.evaluate(
				'descendant::*[local-name()="tab"]',
				aTabBrowser.mTabContainer,
				null,
				XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
				null
			);
	},
  
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
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.scrolled');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.partial');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.partial.max');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.partial.startX');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.partial.startY');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.size_mode');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.max');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.pow');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.fix_aspect_ratio');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.fixed_aspect_ratio');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.update_delay');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.progress.mode');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.unread.enabled');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.unread.readMethod');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.close_buttons.force_show.last_tab');
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

		let (tabs, i, maxi, listener) {
			tabs = this.getTabs(aTabBrowser);
			for (i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
			{
				this.initTab(tabs.snapshotItem(i), aTabBrowser);
			}

			listener = new InformationalTabPrefListener(aTabBrowser);
			aTabBrowser.__informationaltab__prefListener = listener;

			aTabBrowser.__informationaltab__eventListener = new InformationalTabBrowserEventListener(aTabBrowser);
			aTabBrowser.addEventListener('TabSelect', this, false);
			aTabBrowser.addEventListener('TabOpen',  this, false);
			aTabBrowser.addEventListener('TabClose', this, false);
			aTabBrowser.addEventListener('TabMove',  this, false);
			aTabBrowser.addEventListener('TreeStyleTabCollapsedStateChange',  this, false);
		}

		if ('swapBrowsersAndCloseOther' in aTabBrowser) {
			eval('aTabBrowser.swapBrowsersAndCloseOther = '+aTabBrowser.swapBrowsersAndCloseOther.toSource().replace(
				'{',
				'{ InformationalTabService.destroyTab(aOurTab);'
			).replace(
				'if (aOurTab == this.selectedTab) {this.updateCurrentBrowser(',
				'InformationalTabService.initTab(aOurTab); $&'
			));
		}
	},
 
	initTab : function(aTab, aTabBrowser) 
	{
		if (aTab.__informationaltab__progressListener) return;

		if (!aTabBrowser) aTabBrowser = this.getTabBrowserFromChild(aTab);
		aTab.__informationaltab__parentTabBrowser = aTabBrowser;

		var filter = Components
				.classes['@mozilla.org/appshell/component/browser-status-filter;1']
				.createInstance(Components.interfaces.nsIWebProgress);
		var listener = new InformationalTabProgressListener(aTab, aTabBrowser);
		filter.addProgressListener(listener, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		aTab.linkedBrowser.webProgress.addProgressListener(filter, Components.interfaces.nsIWebProgress.NOTIFY_ALL);
		aTab.__informationaltab__progressListener = listener;
		aTab.__informationaltab__progressFilter   = filter;

		this.initThumbnail(aTab, aTabBrowser);

		aTab.__informationaltab__eventListener = new InformationalTabEventListener(aTab, aTabBrowser);
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
		aTabBrowser.__informationaltab__prefListener.destroy();
		delete aTabBrowser.__informationaltab__prefListener;

		aTabBrowser.__informationaltab__eventListener.destroy();
		delete aTabBrowser.__informationaltab__eventListener;

		aTabBrowser.removeEventListener('TabSelect', this, false);
		aTabBrowser.removeEventListener('TabOpen',  this, false);
		aTabBrowser.removeEventListener('TabClose', this, false);
		aTabBrowser.removeEventListener('TabMove',  this, false);
		aTabBrowser.removeEventListener('TreeStyleTabCollapsedStateChange',  this, false);

		var tabs = this.getTabs(aTabBrowser);
		for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			this.destroyTab(tabs.snapshotItem(i));
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

			aTab.__informationaltab__eventListener.destroy();
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
	
	initThumbnail : function(aTab, aTabBrowser) 
	{
		var canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		canvas.setAttribute('class', 'informationaltab-thumbnail');
		canvas.width = canvas.height = canvas.style.width = canvas.style.height = 0;
		canvas.style.display = 'none';

		this.insertThumbnailTo(canvas, aTab, aTabBrowser, this.getPref('extensions.informationaltab.thumbnail.position'));

		aTab.__informationaltab__canvas = canvas;
		this.updateThumbnail(aTab, aTabBrowser, this.UPDATE_INIT);
	},
 
	insertThumbnailTo : function(aCanvas, aTab, aTabBrowser, aPosition) 
	{
		var container = document.createElement('hbox');
		container.setAttribute('class', this.kCONTAINER);
		container.appendChild(aCanvas);

		var icon = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-icon');
		var label = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text');
		var labelBox = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text-stack') || // Mac OS X
					document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text-container') || // Tab Mix Plus
					label;

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

		var isTreeAvailable = 'TreeStyleTabService' in window;
		if (isTreeAvailable)
			TreeStyleTabService.initTabContents(aTab, aTabBrowser);

		var nodes = labelBox.parentNode.childNodes;
		if (isTreeAvailable &&
			TreeStyleTabService.getTreePref('tabbar.position') == 'right' &&
			TreeStyleTabService.getTreePref('tabbar.invertTabContents')) {
			container.setAttribute('ordinal',
				(aPosition == this.POSITION_BEFORE_FAVICON) ? parseInt(icon.getAttribute('ordinal')) + 5 :
				(aPosition == this.POSITION_BEFORE_LABEL) ? parseInt(labelBox.getAttribute('ordinal')) + 5 :
				1
			);
		}
		else {
			if (!isTreeAvailable) {
				for (i = 0, maxi = nodes.length; i < maxi; i++)
				{
					nodes[i].setAttribute('ordinal', (i + 1) * 100);
				}
			}
			container.setAttribute('ordinal',
				(aPosition == this.POSITION_BEFORE_FAVICON) ? parseInt(icon.getAttribute('ordinal')) - 5 :
				(aPosition == this.POSITION_BEFORE_LABEL) ? parseInt(labelBox.getAttribute('ordinal')) - 5 :
				parseInt(labelBox.getAttribute('ordinal')) + 5
			);
		}
	},
 
	updateThumbnail : function(aTab, aTabBrowser, aReason) 
	{
		if (!('__informationaltab__lastReason' in aTab)) {
			aTab,__informationaltab__lastReason = 0;
		}
		if (aReason && !(aTab.__informationaltab__lastReason & aReason)) {
			aTab.__informationaltab__lastReason |= aReason;
		}

		if (this.disabled || aTab.updateThumbnailTimer) return;

		aTabBrowser.thumbnailUpdateCount++;

		aTab.updateThumbnailTimer = window.setTimeout(function(aSelf, aTab, aTabBrowser) {
			aSelf.updateThumbnailNow(aTab, aTabBrowser);
		}, this.thumbnailUpdateDelay, this, aTab, aTabBrowser);
	},
	updateThumbnailNow : function(aTab, aTabBrowser, aReason)
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
		if (!canvas) return;

		if (this.thumbnailEnabled) {
			var b   = aTab.linkedBrowser;
			var win = b.contentWindow;
			var w   = Math.max(win.innerWidth, 200);
			var h   = Math.max(win.innerHeight, 150);
			if (this.thumbnailPartial) {
				w = Math.min(w, this.thumbnailPartialMax);
				h = Math.min(w, this.thumbnailPartialMax);
			}
			var aspectRatio = this.thumbnailFixAspectRatio ? this.thumbnailFixedAspectRatio : (w / h) ;

			var size = this.thumbnailSizeMode == this.SIZE_MODE_FIXED ?
						this.thumbnailMaxSize :
						aTab.boxObject.width * this.thumbnailMaxSizePow / 100 ;
			size = Math.max(size, this.thumbnailMinSize);
			var canvasW = Math.floor((aspectRatio < 1) ? (size * aspectRatio) : size );
			var canvasH = Math.floor((aspectRatio > 1) ? (size / aspectRatio) : size );

			var isImage = b.contentDocument.contentType.indexOf('image') == 0;

			if (
				(
					aReason & this.UPDATE_RESIZE ||
					aReason & this.UPDATE_REFLOW
				) ?
					!(
						Math.abs(parseInt(canvas.width) - canvasW) <= 1 &&
						Math.abs(parseInt(canvas.height) - canvasH) <= 1
					) :
				aReason & this.UPDATE_SCROLL ?
					!isImage :
					true
				) {

				canvas.width  = canvasW;
				canvas.height = canvasH;
				canvas.style.width  = canvasW+'px';
				canvas.style.height = canvasH+'px';
				canvas.style.display = 'block';
				this.updateTabStyle(aTab, aTab.getAttribute('selected') == 'true');

				try {
					var ctx = canvas.getContext('2d');
					ctx.clearRect(0, 0, canvasW, canvasH);
					ctx.save();
					if (!isImage) {
						let x = 0,
							y = 0;
						if (this.thumbnailPartial) {
							x = this.thumbnailPartialBaseX;
							if (x < 0) x += win.innerWidth;
							y = this.thumbnailPartialBaseY;
							if (y < 0) y += win.innerHeight;
						}
						if (this.thumbnailScrolled) {
							if (this.thumbnailPartial) x += win.scrollX;
							y += win.scrollY;
						}
						if (h * canvasW/w < canvasH)
							ctx.scale(canvasH/h, canvasH/h);
						else
							ctx.scale(canvasW/w, canvasW/w);
						ctx.drawWindow(win, x, y, w, h, this.thumbnailBG);
					}
					else {
						let image = b.contentDocument.getElementsByTagName('img')[0];
						ctx.fillStyle = this.thumbnailBG;
						ctx.fillRect(0, 0, canvasW, canvasH);
						let iW = parseInt(image.width);
						let iH = parseInt(image.height);
						let x = 0;
						let y = 0;
						if ((iW / iH) < 1) {
							iW = iW * canvasH / iH;
							x = Math.floor((canvasW - iW) / 2 );
							iH = canvasH;
						}
						else {
							iH = iH * canvasW / iW;
							y = Math.floor((canvasH - iH) / 2 );
							iW = canvasW;
						}
						ctx.drawImage(image, x, y, iW, iH);
					}
					ctx.restore();
				}
				catch(e) {
				}
			}
		}
		else {
			canvas.width = canvas.height = canvas.style.width = canvas.style.height = 0;
			canvas.style.display = 'none';
			this.updateTabStyle(aTab, aTab.getAttribute('selected') == 'true');
		}

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

		var tabs = aThis.getTabs(aTabBrowser);
		for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			aTabBrowser.thumbnailUpdateCount++;
			aThis.updateThumbnailNow(tabs.snapshotItem(i), aTabBrowser, aReason);
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

		var tabs = this.getTabs(aTabBrowser);
		var tab;
		var label;
		var canvas;
		var pos = this.getPref('extensions.informationaltab.thumbnail.position');
		for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
		{
			tab = tabs.snapshotItem(i);
			canvas = tab.__informationaltab__canvas;
			canvas.parentNode.parentNode.removeChild(canvas.parentNode);
			canvas.parentNode.removeChild(canvas);
			this.insertThumbnailTo(canvas, tab, aTabBrowser, pos);
			this.updateThumbnail(tab, aTabBrowser, this.UPDATE_INIT);
		}
	},
 
	updateTabStyle : function(aTab, aSelected) 
	{
		if (this.disabled) return;

		var label = document.getAnonymousElementByAttribute(aTab, 'class', 'tab-text');
		var canvasH = Math.max(parseInt(aTab.__informationaltab__canvas.height), label.boxObject.height);

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

			var style = window.getComputedStyle(aTab.__informationaltab__canvas.parentNode, null);
			var margin = parseInt(style.getPropertyValue('margin-top').replace('px', ''))+
						parseInt(style.getPropertyValue('margin-bottom').replace('px', ''));
			tabH -= margin;

			for (var i = 0, maxi = nodes.length; i < maxi; i++)
			{
				nodes[i].setAttribute('style', nodes[i].getAttribute('style')+';height:'+tabCH+'px !important;');
			}
			aTab.setAttribute('style', aTab.getAttribute('style')+';'+tabS+';height:'+tabH+'px !important;');
		}
		else {
			for (var i = 0, maxi = nodes.length; i < maxi; i++)
			{
				nodes[i].setAttribute('style', nodes[i].getAttribute('style').replace(/(^|;\s*)height\s*:\s*[^;]*/, '$1'));
			}
			aTab.setAttribute('style', aTab.getAttribute('style').replace(/(^|;\s*)height\s*:\s*[^;]*/, '$1'));
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

			case 'TabSelect':
				if (this.disabled) return;
				var tab = aEvent.originalTarget;
				if (this.isTabRead(tab, aEvent.type))
					tab.removeAttribute('informationaltab-unread');
				break;

			case 'TabOpen':
				this.initTab(aEvent.originalTarget, aEvent.currentTarget);
				this.updateAllThumbnails(aEvent.currentTarget, this.UPDATE_REFLOW);
				break;

			case 'TabClose':
				this.destroyTab(aEvent.originalTarget, aEvent.currentTarget);
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

			case 'TreeStyleTabCollapsedStateChange':
				if (aEvent.collapsed) return;
				var tab = aEvent.originalTarget;
				this.updateTabStyle(tab, tab.getAttribute('selected') == 'true');
				break;
		}
	},
	
	isTabRead : function(aTab, aEventType) 
	{
		if (!aTab.selected) return false;
		if (aTab.linkedBrowser.contentDocument.contentType.toLowerCase().indexOf('image/') == 0) return true;

		var isScrollable = this.isFrameScrollable(aTab.linkedBrowser.contentWindow);
		switch (this.readMethod)
		{
			case 1:
				return !isScrollable || aEventType == 'scroll';

			default:
				return true;
		}
	},
 
	isFrameScrollable : function(aFrame) 
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
		'extensions.treestyletab',
		'browser.tabs'
	],
 
	onChangePref : function(aPrefName) 
	{
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
			case 'extensions.informationaltab.thumbnail.position':
				var attr = 'informationaltab-thumbnail-position';
				if (this.thumbnailEnabled) {
					document.documentElement.setAttribute(attr,
						this.getPref('extensions.informationaltab.thumbnail.position'));
				}
				else {
					document.documentElement.removeAttribute(attr);
				}
				break;

			case 'extensions.informationaltab.thumbnail.scrolled':
				this.thumbnailScrolled = value;
				break;
			case 'extensions.informationaltab.thumbnail.partial':
				this.thumbnailPartial = value;
				break;
			case 'extensions.informationaltab.thumbnail.partial.max':
				this.thumbnailPartialMax = value;
				break;
			case 'extensions.informationaltab.thumbnail.partial.startX':
				this.thumbnailPartialBaseX = value;
				break;
			case 'extensions.informationaltab.thumbnail.partial.startY':
				this.thumbnailPartialBaseY = value;
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

			case 'extensions.informationaltab.unread.readMethod':
				this.readMethod = value;
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
					this.overrideTabClipWidth(this.getPref('browser.tabs.tabMinWidth'));
					this.updatingTabWidthPrefs = false;
				}
				this.adjustTabstrip(gBrowser);
				break;

			case 'extensions.informationaltab.close_buttons.force_show.last_tab':
			case 'browser.tabs.closeWindowWithLastTab':
				var mode = this.getPref('extensions.informationaltab.close_buttons.force_show.last_tab');
				var closable = !this.getPref('browser.tabs.closeWindowWithLastTab');
				if (mode == 2 || (mode == 0 && closable))
					document.documentElement.setAttribute('informationaltab-show-last-tab-close-button', true);
				else
					document.documentElement.removeAttribute('informationaltab-show-last-tab-close-button');
				break;

			case 'browser.tabs.tabClipWidth':
				if (this.updatingTabWidthPrefs ||
					!this.getPref('extensions.informationaltab.close_buttons.force_show') ||
					this.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabWidthPrefs = true;
				this.overrideTabClipWidth(this.getPref('browser.tabs.tabMinWidth'));
				this.updatingTabWidthPrefs = false;
				this.adjustTabstrip(gBrowser);
				break;

			case 'browser.tabs.tabMinWidth':
				if (this.updatingTabWidthPrefs ||
					!this.getPref('extensions.informationaltab.close_buttons.force_show') ||
					this.getPref('extensions.informationaltab.restoring_backup_prefs'))
					return;
				this.updatingTabWidthPrefs = true;
				this.overrideTabClipWidth(this.getPref('browser.tabs.tabMinWidth'));
				this.updatingTabWidthPrefs = false;
				this.adjustTabstrip(gBrowser);
				break;

			case 'extensions.treestyletab.tabbar.position':
			case 'extensions.treestyletab.tabbar.autoHide.mode':
			case 'extensions.treestyletab.tabbar.width':
			case 'extensions.treestyletab.tabbar.shrunkenWidth':
				if (!('TreeStyleTabService' in window) ||
					!this.getPref('extensions.informationaltab.close_buttons.force_show'))
					return;
				var pos = this.getPref('extensions.treestyletab.tabbar.position');
				if (pos == 'left' || pos == 'right') {
					var width = this.getPref('extensions.treestyletab.tabbar.width');
					switch (this.getPref('extensions.treestyletab.tabbar.autoHide.mode'))
					{
						case TreeStyleTabService.kAUTOHIDE_MODE_DISABLED:
							break;

						case TreeStyleTabService.kAUTOHIDE_MODE_HIDE:
							break;

						default:
						case TreeStyleTabService.kAUTOHIDE_MODE_SHRINK:
							width = this.getPref('extensions.treestyletab.tabbar.shrunkenWidth');
							break;
					}
					this.overrideTabClipWidth(width);
				}
				else {
					this.overrideTabClipWidth(this.getPref('browser.tabs.tabMinWidth'));
				}
				break;

			default:
				break;
		}
	},
	overrideTabClipWidth : function(aWidth)
	{
		if (!this.getPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth'))
			this.setPref('extensions.informationaltab.backup.browser.tabs.tabClipWidth', this.getPref('browser.tabs.tabClipWidth'));
		this.setPref('browser.tabs.tabClipWidth', aWidth);
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

	// Tab Mix Plus
	this.mProgress = document.getAnonymousElementByAttribute(this.mTab, 'class', 'tab-text-container');
	if (this.mProgress)
		this.mProgress = this.mProgress.getElementsByAttribute('class', 'tab-progress')[0];
	else
		this.mProgress = null;

}
InformationalTabProgressListener.prototype = {
	mTab        : null,
	mLabel      : null,
	mTabBrowser : null,
	mProgress   : null,
	onProgressChange: function(aWebProgress, aRequest, aCurSelfProgress, aMaxSelfProgress, aCurTotalProgress, aMaxTotalProgress)
	{
		if (aMaxTotalProgress < 1)
			return;

		var percentage = parseInt((aCurTotalProgress * 100) / aMaxTotalProgress);

		if (this.mProgress) { // Tab Mix Plus
			this.updateProgress(this.mTab, 'tab-progress', percentage);
			this.updateProgress(this.mProgress, 'value', percentage);
		}
		else if (InformationalTabService.progressMode == InformationalTabService.PROGRESS_STATUSBAR) {
			this.mLabel.removeAttribute('informationaltab-progress');
		}
		else {
			this.updateProgress(this.mLabel, 'informationaltab-progress', percentage);
		}
	},
	updateProgress : function(aTarget, aAttr, aPercentage)
	{
		if (aPercentage > 0 && aPercentage < 100) {
			aTarget.setAttribute(aAttr, aPercentage);
		}
		else if (aPercentage <= 0 || aPercentage >= 100) {
			aTarget.removeAttribute(aAttr);
		}
	},
	onStateChange : function(aWebProgress, aRequest, aStateFlags, aStatus)
	{
		const nsIWebProgressListener = Components.interfaces.nsIWebProgressListener;
		if (
			aStateFlags & nsIWebProgressListener.STATE_STOP &&
			aStateFlags & nsIWebProgressListener.STATE_IS_NETWORK
			) {
			InformationalTabService.updateThumbnail(this.mTab, this.mTabBrowser, InformationalTabService.UPDATE_PAGELOAD);
			this.mLabel.removeAttribute('informationaltab-progress');
			if (
				!this.mTab.linkedBrowser.currentURI ||
				this.mTab.linkedBrowser.currentURI.spec == 'about:config' ||
				InformationalTabService.isTabRead(this.mTab, 'load')
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
	this.init(aTab, aTabBrowser);
}
InformationalTabEventListener.prototype = {
	mTab : null,
	mTabBrowser : null,
	init : function(aTab, aTabBrowser)
	{
		this.mTab = aTab;
		this.mTabBrowser = aTabBrowser;

		this.mTab.addEventListener('DOMAttrModified', this, false);
		this.mTab.linkedBrowser.addEventListener('scroll', this, false);
		InformationalTabService.addPrefListener(this);
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.animation');
	},
	destroy : function()
	{
		if (this.watchingRedrawEvent)
			this.mTab.linkedBrowser.removeEventListener('MozAfterPaint', this, false);
		this.mTab.removeEventListener('DOMAttrModified', this, false);
		this.mTab.linkedBrowser.removeEventListener('scroll', this, false);
		InformationalTabService.removePrefListener(this);

		delete this.mTab;
		delete this.mTabBrowser;
	},
	handleEvent: function(aEvent)
	{
		const ITS = InformationalTabService;
		switch (aEvent.type)
		{
			case 'scroll':
				if (aEvent.originalTarget.toString().indexOf('Document') < 0 ||
					!ITS.isTabRead(this.mTab, aEvent.type))
					return;
				this.mTab.removeAttribute('informationaltab-unread');
				if (ITS.thumbnailScrolled)
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

			case 'MozAfterPaint':
				ITS.updateThumbnail(this.mTab, this.mTabBrowser, ITS.UPDATE_REPAINT);
				break;
		}
	},
	watchingRedrawEvent : false,
	domains : [
//		'extensions.informationaltab.thumbnail.partial',
		'extensions.informationaltab.thumbnail.animation'
	],
 	observe : function(aSubject, aTopic, aPrefName)
	{
		if (aTopic != 'nsPref:changed') return;
		const ITS = InformationalTabService;

		var value = ITS.getPref(aPrefName);
		switch (aPrefName)
		{
			case 'extensions.informationaltab.thumbnail.partial':
			case 'extensions.informationaltab.thumbnail.animation':
				var shouldWatch = (
//						!ITS.getPref('extensions.informationaltab.thumbnail.partial') &&
						ITS.getPref('extensions.informationaltab.thumbnail.animation')
					);
				if (shouldWatch && !this.watchingRedrawEvent)
					this.mTab.linkedBrowser.addEventListener('MozAfterPaint', this, false);
				else if (!shouldWatch && this.watchingRedrawEvent)
					this.mTab.linkedBrowser.removeEventListener('MozAfterPaint', this, false);
				this.watchingRedrawEvent = shouldWatch;
				break;

			default:
				break;
		}
	}
};
 
function InformationalTabBrowserEventListener(aTabBrowser) 
{
	this.init(aTabBrowser);
}
InformationalTabBrowserEventListener.prototype = {
	mTabBrowser : null,
	init : function(aTabBrowser)
	{
		this.mTabBrowser = aTabBrowser;
		window.addEventListener('resize', this, false);
	},
	destroy : function()
	{
		window.removeEventListener('resize', this, false);
		delete this.mTabBrowser;
	},
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
	this.init(aTabBrowser);
}
InformationalTabPrefListener.prototype = {
	mTabBrowser : null,
	init : function(aTabBrowser)
	{
		this.mTabBrowser = aTabBrowser;
		InformationalTabService.addPrefListener(this);
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.enabled');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.size_mode');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.max');
		this.observe(null, 'nsPref:changed', 'extensions.informationaltab.thumbnail.pow');
	},
	destroy : function()
	{
		InformationalTabService.removePrefListener(this);
		delete this.mTabBrowser;
	},
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
			case 'extensions.informationaltab.thumbnail.partial':
			case 'extensions.informationaltab.thumbnail.partial.max':
			case 'extensions.informationaltab.thumbnail.partial.startX':
			case 'extensions.informationaltab.thumbnail.partial.startY':
				if (ITS.initialized)
					ITS.updateAllThumbnails(this.mTabBrowser, ITS.UPDATE_INIT);
				break;

			case 'extensions.treestyletab.tabbar.invertTabContents':
			case 'extensions.informationaltab.thumbnail.position':
			case 'extensions.treestyletab.tabbar.position':
				ITS.repositionThumbnail(this.mTabBrowser);
				return;

			case 'extensions.treestyletab.tabbar.style':
				window.setTimeout(function(aTabBrowser) {
					var tabs = ITS.getTabs(aTabBrowser);
					for (var i = 0, maxi = tabs.snapshotLength; i < maxi; i++)
					{
						let tab = tabs.snapshotItem(i);
						ITS.updateTabStyle(tab, tab.getAttribute('selected') == 'true');
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
 
