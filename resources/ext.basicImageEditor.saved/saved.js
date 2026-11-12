/**
 * Runs on the File: page after the editor saved a new version
 * (?basicimageeditor=saved): confirms the save and makes the browser fetch
 * the new image instead of showing a cached copy of the old one.
 */
( function () {
	const images = document.querySelectorAll( '#file img, .filehistory img' );

	function reload( url ) {
		return fetch( url, { cache: 'reload', credentials: 'same-origin' } ).catch( () => {} );
	}

	images.forEach( ( image ) => {
		const urls = [ image.getAttribute( 'src' ) ];
		const srcset = image.getAttribute( 'srcset' );
		if ( srcset ) {
			srcset.split( ',' ).forEach( ( candidate ) => {
				urls.push( candidate.trim().split( /\s+/ )[ 0 ] );
			} );
		}
		Promise.all( urls.filter( Boolean ).map( reload ) ).then( () => {
			// Re-assigning the attributes makes the browser use the refreshed copies.
			const src = image.getAttribute( 'src' );
			image.removeAttribute( 'srcset' );
			image.removeAttribute( 'src' );
			image.setAttribute( 'src', src );
			if ( srcset ) {
				image.setAttribute( 'srcset', srcset );
			}
		} );
	} );

	mw.notify( mw.msg( 'basicimageeditor-saved' ), { type: 'success' } );

	// Drop the marker so a page reload does not repeat this.
	const pageUrl = new URL( location.href );
	pageUrl.searchParams.delete( 'basicimageeditor' );
	history.replaceState( history.state, '', pageUrl.toString() );
}() );
