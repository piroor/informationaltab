var EXPORTED_SYMBOLS = [
		'calculateCanvasSize',
		'getThumbnailImageURI',
		'drawImageFromURI'
	];

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
XPCOMUtils.defineLazyModuleGetter(this, 'InformationalTabConstants', 'resource://informationaltab-modules/constants.js');

function calculateCanvasSize(aParams) {
	var w   = Math.max(aParams.viewportWidth, 200);
	var h   = Math.max(aParams.viewportHeight, 150);
	if (aParams.partial) {
		w = Math.min(w, Math.max(w * aParams.partialMaxPercentage, aParams.partialMaxPixels));
		h = Math.min(h, Math.max(h * aParams.partialMaxPercentage, aParams.partialMaxPixels));
	}
	var aspectRatio = aParams.fixAspectRatio ? aParams.fixedAspectRatio : (w / h) ;

	var size = aParams.sizeMode == InformationalTabConstants.SIZE_MODE_FIXED ?
				aParams.maxSize :
				aParams.tabWidth * aParams.maxSizePow / 100 ;
	size = Math.max(size, aParams.minSize);
	size = Math.min(size, aParams.windowWidth);
	if (aParams.tabWidth)
		size = Math.min(size, aParams.tabWidth);
	return {
		viewportWidth:  w,
		viewportHeight: h,
		width:  Math.floor((aspectRatio < 1) ? (size * aspectRatio) : size ),
		height: Math.floor((aspectRatio > 1) ? (size / aspectRatio) : size )
	};
}

function getThumbnailImageURI(aParams, aCallback) {
	if (typeof aCallback != 'function')
		throw new Error('you must give a callback');

	var win = aParams.window;

	var canvasSize = calculateCanvasSize(aParams);
	var w          = canvasSize.viewportWidth;
	var h          = canvasSize.viewportHeight;
	var canvasW    = canvasSize.width;
	var canvasH    = canvasSize.height;

	var isImage = win.document.contentType.indexOf('image') == 0;
	if (
		(
			aParams.reason & InformationalTabConstants.UPDATE_RESIZE ||
			aParams.reason & InformationalTabConstants.UPDATE_REFLOW
		) && aParams.reason & InformationalTabConstants.UPDATE_SCROLL ?
			!isImage :
			true
		) {
		let canvas = win.document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
		canvas.mozOpaque = true;
		canvas.mozImageSmoothingEnabled = true;
		canvas.width  = canvasW;
		canvas.height = canvasH;
		canvas.style.width  = canvasW+'px';
		canvas.style.height = canvasH+'px';
		canvas.style.display = 'block';

		try {
			var ctx = canvas.getContext('2d');
			ctx.clearRect(0, 0, canvasW, canvasH);
			ctx.save();
			if (!isImage && !aParams.image) {
				let x = 0,
					y = 0;
				if (aParams.partial) {
					x = aParams.partialBaseX;
					if (x < 0) x += win.innerWidth;
					y = aParams.partialBaseY;
					if (y < 0) y += win.innerHeight;
				}
				if (aParams.scroll) {
					if (aParams.partial) x += win.scrollX;
					y += win.scrollY;
				}
				if (h * canvasW/w < canvasH)
					ctx.scale(canvasH/h, canvasH/h);
				else
					ctx.scale(canvasW/w, canvasW/w);
				ctx.drawWindow(win, x, y, w, h, aParams.background);
			}
			else {
				let image = aParams.image || win.document.getElementsByTagName('img')[0];
				ctx.fillStyle = aParams.background;
				ctx.fillRect(0, 0, canvasW, canvasH);
				let iW = parseInt(image.width);
				let iH = parseInt(image.height);
				let x = 0;
				let y = 0;
				if ((iW / iH) <= 1) {
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

			aCallback(canvas.toDataURL());
		}
		catch(e) {
			Components.utils.reportError(e);
			aCallback(null);
		}
	}
	else {
		aCallback(null);
	}
};

function drawImageFromURI(aImageURI, aCanvas, aCallback) {
	var image = new aCanvas.ownerDocument.defaultView.Image();
	image.onload = function() {
		try {
			let ctx = aCanvas.getContext('2d');
			ctx.clearRect(0, 0, image.width, image.height);
			ctx.drawImage(image, 0, 0, image.width, image.height);
		}
		catch(e) {
			Components.utils.reportError(e);
		}
		if (typeof aCallback == 'function')
			aCallback();
	};
	image.src = aImageURI;
}
