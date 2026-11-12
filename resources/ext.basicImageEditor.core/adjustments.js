/**
 * Brightness and contrast arithmetic.
 *
 * The same code runs on the downscaled preview and on the full-resolution
 * image at save time, so the preview always matches the saved result.
 *
 * Both settings run from -100 to +100, with 0 meaning unchanged. They are
 * applied per colour channel, brightness first, then contrast (see the
 * processing order in the spec). Alpha is never changed.
 */

/** Brightness offset, in channel values, at brightness ±100. */
const MAX_BRIGHTNESS_OFFSET = 128;

/** Contrast strength, in channel values, at contrast ±100. */
const MAX_CONTRAST = 128;

/**
 * Multiplier applied around the mid-point (128) for a contrast setting.
 *
 * Uses the common formula f = 259 (C + 255) / (255 (259 − C)), with C scaled
 * so that -100 gives about 0.33 and +100 about 2.97.
 *
 * @param {number} contrast -100 to +100
 * @return {number}
 */
function contrastFactor( contrast ) {
	const c = contrast / 100 * MAX_CONTRAST;
	return ( 259 * ( c + 255 ) ) / ( 255 * ( 259 - c ) );
}

/**
 * Lookup table mapping each input channel value (0–255) to its output value.
 *
 * @param {number} brightness -100 to +100
 * @param {number} contrast -100 to +100
 * @return {Uint8ClampedArray} 256 entries
 */
function buildLookupTable( brightness, contrast ) {
	const table = new Uint8ClampedArray( 256 );
	const offset = brightness / 100 * MAX_BRIGHTNESS_OFFSET;
	const factor = contrastFactor( contrast );
	for ( let value = 0; value < 256; value++ ) {
		const brightened = Math.min( 255, Math.max( 0, value + offset ) );
		// Uint8ClampedArray rounds and clamps to 0–255 on assignment.
		table[ value ] = factor * ( brightened - 128 ) + 128;
	}
	return table;
}

/**
 * Apply brightness and contrast to RGBA pixel data in place.
 *
 * @param {Uint8ClampedArray} pixels RGBA data, as in ImageData#data
 * @param {number} brightness -100 to +100
 * @param {number} contrast -100 to +100
 */
function applyToPixels( pixels, brightness, contrast ) {
	if ( brightness === 0 && contrast === 0 ) {
		return;
	}
	const table = buildLookupTable( brightness, contrast );
	for ( let i = 0; i < pixels.length; i += 4 ) {
		pixels[ i ] = table[ pixels[ i ] ];
		pixels[ i + 1 ] = table[ pixels[ i + 1 ] ];
		pixels[ i + 2 ] = table[ pixels[ i + 2 ] ];
	}
}

module.exports = {
	contrastFactor,
	buildLookupTable,
	applyToPixels
};
