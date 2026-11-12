/**
 * Pure editor logic without DOM access, kept in its own module so that the
 * QUnit tests can load it.
 */
module.exports = {
	adjustments: require( './adjustments.js' ),
	geometry: require( './geometry.js' ),
	state: require( './state.js' )
};
