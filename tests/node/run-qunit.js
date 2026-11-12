// Minimal QUnit-compatible runner for the core tests, for machines without a browser.
// Usage: docker run --rm -v "$PWD":/ext:ro node:22-alpine node /ext/tests/node/run-qunit.js /ext tests/qunit/ext.basicImageEditor.core.test.js
const path = require( 'path' );
const assertNode = require( 'assert' );
const Module = require( 'module' );
const ext = process.argv[ 2 ];
const origResolve = Module._resolveFilename;
Module._resolveFilename = function ( request, ...rest ) {
	if ( request === 'ext.basicImageEditor.core' ) {
		request = path.join( ext, 'resources/ext.basicImageEditor.core/index.js' );
	}
	return origResolve.call( this, request, ...rest );
};
const tests = [];
let prefix = [];
const QUnit = {
	module( name, fn ) {
		if ( fn ) { prefix.push( name ); fn(); prefix.pop(); } else { prefix = prefix.slice( 0, 1 ).concat( name ); }
	},
	test( name, fn ) { tests.push( { name: prefix.join( ' > ' ) + ' > ' + name, fn } ); }
};
global.QUnit = QUnit;
global.require = require;
require( path.join( ext, process.argv[ 3 ] ) );
let failed = 0, assertions = 0;
for ( const t of tests ) {
	const a = {
		strictEqual( x, y, m ) { assertions++; assertNode.strictEqual( x, y, m ); },
		deepEqual( x, y, m ) { assertions++; assertNode.deepStrictEqual( x, y, m ); },
		true( x, m ) { assertions++; assertNode.strictEqual( x, true, m ); },
		false( x, m ) { assertions++; assertNode.strictEqual( x, false, m ); }
	};
	try { t.fn( a ); console.log( 'ok    ' + t.name ); } catch ( e ) { failed++; console.log( 'FAIL  ' + t.name + '\n      ' + e.message.split( '\n' ).join( '\n      ' ) ); }
}
console.log( `\n${ tests.length - failed }/${ tests.length } tests passed, ${ assertions } assertions` );
process.exit( failed ? 1 : 0 );
