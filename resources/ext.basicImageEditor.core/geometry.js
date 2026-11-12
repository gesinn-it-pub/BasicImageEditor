/**
 * Geometry for flip, rotation, straighten and crop.
 *
 * The image is processed in a fixed order: flip, then rotation (90° steps
 * plus the straighten angle, as one total angle), then crop. This matches
 * how Cropper.js displays the image.
 *
 * Crop rectangles use the coordinate system Cropper.js reports in getData():
 * pixels of the unscaled image, measured from the top-left corner of the
 * rotated image's bounding box.
 */

/**
 * @param {number} degrees
 * @return {number}
 */
function toRadians( degrees ) {
	return degrees * Math.PI / 180;
}

/**
 * Normalise an angle in degrees to the range [0, 360).
 *
 * @param {number} degrees
 * @return {number}
 */
function normalizeAngle( degrees ) {
	return ( ( degrees % 360 ) + 360 ) % 360;
}

/**
 * Size of the bounding box of a width × height image rotated by an angle.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} degrees
 * @return {{width: number, height: number}}
 */
function rotatedBounds( width, height, degrees ) {
	const radians = toRadians( degrees );
	const cos = Math.abs( Math.cos( radians ) );
	const sin = Math.abs( Math.sin( radians ) );
	return {
		width: width * cos + height * sin,
		height: width * sin + height * cos
	};
}

/**
 * Whether a crop rectangle lies entirely on the rotated image, so that no
 * empty corners would be saved.
 *
 * @param {{x: number, y: number, width: number, height: number}} rect
 * @param {number} width Image width before rotation
 * @param {number} height Image height before rotation
 * @param {number} degrees Total rotation
 * @param {number} [tolerance=1] Allowed overshoot, in pixels, for rounding
 * @return {boolean}
 */
function isRectInsideRotatedImage( rect, width, height, degrees, tolerance ) {
	tolerance = tolerance === undefined ? 1 : tolerance;
	if ( !( rect.width > 0 && rect.height > 0 ) ) {
		return false;
	}
	const bounds = rotatedBounds( width, height, degrees );
	const radians = toRadians( degrees );
	const cos = Math.cos( radians );
	const sin = Math.sin( radians );
	const corners = [
		[ rect.x, rect.y ],
		[ rect.x + rect.width, rect.y ],
		[ rect.x, rect.y + rect.height ],
		[ rect.x + rect.width, rect.y + rect.height ]
	];
	return corners.every( ( corner ) => {
		// Undo the rotation around the centre to get image-local coordinates.
		const dx = corner[ 0 ] - bounds.width / 2;
		const dy = corner[ 1 ] - bounds.height / 2;
		const u = dx * cos + dy * sin;
		const v = -dx * sin + dy * cos;
		return Math.abs( u ) <= width / 2 + tolerance &&
			Math.abs( v ) <= height / 2 + tolerance;
	} );
}

/**
 * Largest axis-aligned rectangle with the given aspect ratio that fits on
 * the rotated image, centred in its bounding box.
 *
 * @param {number} width Image width before rotation
 * @param {number} height Image height before rotation
 * @param {number} degrees Total rotation
 * @param {number} aspectRatio Width divided by height
 * @return {{x: number, y: number, width: number, height: number}}
 */
function largestInscribedRect( width, height, degrees, aspectRatio ) {
	const radians = toRadians( degrees );
	const cos = Math.abs( Math.cos( radians ) );
	const sin = Math.abs( Math.sin( radians ) );
	// Half-width a and half-height a / aspectRatio must satisfy
	// a·cos + (a/ratio)·sin ≤ width/2 and a·sin + (a/ratio)·cos ≤ height/2.
	const halfWidth = Math.min(
		( width / 2 ) / ( cos + sin / aspectRatio ),
		( height / 2 ) / ( sin + cos / aspectRatio )
	);
	// The epsilon absorbs floating-point error, e.g. cos( 270° ) ≈ -1.8e-16,
	// which would otherwise floor 1200 down to 1199.
	const rectWidth = Math.floor( 2 * halfWidth + 1e-6 );
	const rectHeight = Math.floor( 2 * halfWidth / aspectRatio + 1e-6 );
	const bounds = rotatedBounds( width, height, degrees );
	return {
		x: ( bounds.width - rectWidth ) / 2,
		y: ( bounds.height - rectHeight ) / 2,
		width: rectWidth,
		height: rectHeight
	};
}

/**
 * Apply a flip as the user sees it, along the screen's horizontal or
 * vertical axis, to the transform state.
 *
 * Flips are stored in the image's own frame and applied before rotation.
 * A screen flip after a rotation R equals R⁻¹ followed by the same flip in
 * the image frame (F·R(θ) = R(−θ)·F), so both rotation parts change sign.
 *
 * @param {{rotate90: number, straighten: number, scaleX: number, scaleY: number}} state
 * @param {string} axis 'horizontal' or 'vertical'
 * @return {{rotate90: number, straighten: number, scaleX: number, scaleY: number}}
 */
function flip( state, axis ) {
	return {
		rotate90: normalizeAngle( -state.rotate90 ),
		straighten: state.straighten === 0 ? 0 : -state.straighten,
		scaleX: axis === 'horizontal' ? -state.scaleX : state.scaleX,
		scaleY: axis === 'vertical' ? -state.scaleY : state.scaleY
	};
}

/**
 * Aspect ratio of the image as displayed after the 90° rotation steps.
 *
 * @param {number} width
 * @param {number} height
 * @param {number} rotate90 0, 90, 180 or 270
 * @return {number}
 */
function displayedAspectRatio( width, height, rotate90 ) {
	return rotate90 % 180 === 0 ? width / height : height / width;
}

/**
 * Scale a rectangle by a factor, e.g. from preview to full-resolution pixels.
 *
 * @param {{x: number, y: number, width: number, height: number}} rect
 * @param {number} factor
 * @return {{x: number, y: number, width: number, height: number}}
 */
function scaleRect( rect, factor ) {
	return {
		x: rect.x * factor,
		y: rect.y * factor,
		width: rect.width * factor,
		height: rect.height * factor
	};
}

module.exports = {
	toRadians,
	normalizeAngle,
	rotatedBounds,
	isRectInsideRotatedImage,
	largestInscribedRect,
	flip,
	displayedAspectRatio,
	scaleRect
};
