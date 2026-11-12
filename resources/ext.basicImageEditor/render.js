/**
 * Canvas work: loading the image, the downscaled preview and the
 * full-resolution render at save time.
 */
const { adjustments, geometry } = require( 'ext.basicImageEditor.core' );

/** Longest side, in pixels, of the image shown in the editor. */
const PREVIEW_MAX_SIDE = 1600;

/**
 * Load an image from a same-origin URL.
 *
 * Browsers apply EXIF orientation when they decode and draw an image, so the
 * returned element's natural size and pixels are already upright.
 *
 * @param {string} url
 * @return {Promise<HTMLImageElement>}
 */
function loadImage( url ) {
	return fetch( url, { credentials: 'same-origin' } )
		.then( ( response ) => {
			if ( !response.ok ) {
				throw new Error( 'HTTP ' + response.status );
			}
			return response.blob();
		} )
		.then( ( blob ) => {
			const image = new Image();
			image.src = URL.createObjectURL( blob );
			return image.decode().then( () => image );
		} );
}

/**
 * @param {number} width
 * @param {number} height
 * @return {HTMLCanvasElement}
 */
function createCanvas( width, height ) {
	const canvas = document.createElement( 'canvas' );
	canvas.width = width;
	canvas.height = height;
	return canvas;
}

/**
 * Downscaled copy of the image for the editor display, and its pixels
 * before any brightness or contrast change.
 *
 * @param {HTMLImageElement} image
 * @return {{canvas: HTMLCanvasElement, pixels: ImageData, scale: number}}
 *  scale is preview pixels per full-resolution pixel
 */
function createPreviewBase( image ) {
	const longest = Math.max( image.naturalWidth, image.naturalHeight );
	const scale = Math.min( 1, PREVIEW_MAX_SIDE / longest );
	const canvas = createCanvas(
		Math.max( 1, Math.round( image.naturalWidth * scale ) ),
		Math.max( 1, Math.round( image.naturalHeight * scale ) )
	);
	const context = canvas.getContext( '2d', { willReadFrequently: true } );
	context.imageSmoothingQuality = 'high';
	context.drawImage( image, 0, 0, canvas.width, canvas.height );
	return {
		canvas,
		pixels: context.getImageData( 0, 0, canvas.width, canvas.height ),
		// Exact ratio of the rounded preview size, so crop coordinates scale back precisely.
		scale: canvas.width / image.naturalWidth
	};
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} mimeType
 * @param {number} [quality] 0–1, for JPG
 * @return {Promise<Blob>}
 */
function canvasToBlob( canvas, mimeType, quality ) {
	return new Promise( ( resolve, reject ) => {
		canvas.toBlob( ( blob ) => {
			if ( blob ) {
				resolve( blob );
			} else {
				reject( new Error( 'Could not encode the image' ) );
			}
		}, mimeType, quality );
	} );
}

/**
 * Object URL of the preview with brightness and contrast applied.
 *
 * @param {{canvas: HTMLCanvasElement, pixels: ImageData}} base From createPreviewBase()
 * @param {number} brightness
 * @param {number} contrast
 * @param {string} mimeType Source format, so PNG transparency shows in the preview
 * @return {Promise<string>}
 */
function renderPreviewUrl( base, brightness, contrast, mimeType ) {
	const canvas = createCanvas( base.canvas.width, base.canvas.height );
	const pixels = new ImageData(
		new Uint8ClampedArray( base.pixels.data ),
		base.pixels.width,
		base.pixels.height
	);
	adjustments.applyToPixels( pixels.data, brightness, contrast );
	canvas.getContext( '2d' ).putImageData( pixels, 0, 0 );
	return canvasToBlob( canvas, mimeType === 'image/png' ? 'image/png' : 'image/jpeg', 0.92 )
		.then( ( blob ) => URL.createObjectURL( blob ) );
}

/**
 * Render the edited image at full resolution, in the fixed processing order:
 * flip, rotation, crop, brightness, contrast.
 *
 * @param {HTMLImageElement} image Upright source image
 * @param {Object} state Editor state (rotate90, straighten, scaleX, scaleY, brightness, contrast)
 * @param {{x: number, y: number, width: number, height: number}} crop In
 *  full-resolution pixels of the rotated image's bounding box
 * @param {string} mimeType Output format
 * @return {HTMLCanvasElement}
 */
function renderFull( image, state, crop, mimeType ) {
	const width = image.naturalWidth;
	const height = image.naturalHeight;
	const degrees = state.rotate90 + state.straighten;
	const bounds = geometry.rotatedBounds( width, height, degrees );

	const canvas = createCanvas(
		Math.max( 1, Math.round( crop.width ) ),
		Math.max( 1, Math.round( crop.height ) )
	);
	const context = canvas.getContext( '2d', { willReadFrequently: true } );
	if ( mimeType === 'image/jpeg' ) {
		// JPG has no transparency; keep sub-pixel edges from turning black.
		context.fillStyle = '#fff';
		context.fillRect( 0, 0, canvas.width, canvas.height );
	}
	context.imageSmoothingQuality = 'high';
	context.translate( -crop.x, -crop.y );
	context.translate( bounds.width / 2, bounds.height / 2 );
	context.rotate( geometry.toRadians( degrees ) );
	context.scale( state.scaleX, state.scaleY );
	context.drawImage( image, -width / 2, -height / 2, width, height );

	if ( state.brightness !== 0 || state.contrast !== 0 ) {
		context.setTransform( 1, 0, 0, 1, 0, 0 );
		const pixels = context.getImageData( 0, 0, canvas.width, canvas.height );
		adjustments.applyToPixels( pixels.data, state.brightness, state.contrast );
		context.putImageData( pixels, 0, 0 );
	}
	return canvas;
}

module.exports = {
	loadImage,
	createPreviewBase,
	renderPreviewUrl,
	renderFull,
	canvasToBlob
};
