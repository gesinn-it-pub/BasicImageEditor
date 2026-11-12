/**
 * Saving through the core upload API.
 *
 * The image is first uploaded in chunks to the upload stash, which publishes
 * nothing, then published from the stash. Publishing is a separate step so
 * that it can carry the change tag (chunk requests drop unknown fields) and
 * so that warnings can be answered without uploading the image again.
 */

/**
 * Timestamp of the file's current version.
 *
 * @param {mw.Api} api
 * @param {string} fileTitle Such as "File:Example.jpg"
 * @return {Promise<string>} ISO 8601 timestamp
 */
function fetchCurrentTimestamp( api, fileTitle ) {
	return api.get( {
		action: 'query',
		prop: 'imageinfo',
		iiprop: 'timestamp',
		titles: fileTitle,
		formatversion: 2
	} ).then( ( data ) => {
		const page = data.query.pages[ 0 ];
		return page.imageinfo ? page.imageinfo[ 0 ].timestamp : '';
	} );
}

/**
 * Upload a file to the stash in chunks.
 *
 * @param {mw.Api} api
 * @param {Blob} blob
 * @param {string} fileName Target file name, without namespace
 * @param {Function} [onProgress] Called with a fraction 0–1
 * @return {Promise<string>} File key of the stashed file
 */
function stash( api, blob, fileName, onProgress ) {
	return new Promise( ( resolve, reject ) => {
		api.chunkedUpload( blob, { stash: true, filename: fileName, ignorewarnings: true } )
			.progress( ( fraction ) => {
				if ( onProgress ) {
					onProgress( fraction );
				}
			} )
			.then(
				( result ) => resolve( result.upload.filekey ),
				( code, result ) => {
					// Warnings are ignored while stashing; a stashed result still counts.
					if ( result && result.upload && result.upload.filekey && result.upload.result !== 'Failure' ) {
						resolve( result.upload.filekey );
					} else {
						reject( { code, result } );
					}
				}
			);
	} );
}

/**
 * Publish a stashed file.
 *
 * Resolves with the API result on success. Rejects with { code, result };
 * when the upload stopped on warnings, code is 'warnings', result.upload
 * .warnings lists them and result.upload.filekey (when present) can be used
 * to continue with ignorewarnings.
 *
 * @param {mw.Api} api
 * @param {string} fileKey
 * @param {Object} params filename, comment, and optionally text, tags, ignorewarnings
 * @return {Promise<Object>}
 */
function publish( api, fileKey, params ) {
	return new Promise( ( resolve, reject ) => {
		api.postWithEditToken( Object.assign( {
			action: 'upload',
			format: 'json',
			filekey: fileKey
		}, params ) ).then(
			( result ) => {
				// With ignorewarnings the API still lists warnings next to
				// result "Success"; the file was published then.
				if ( result.upload && result.upload.result === 'Success' ) {
					resolve( result );
				} else if ( result.upload && result.upload.warnings ) {
					reject( { code: 'warnings', result } );
				} else {
					reject( { code: 'unknown', result } );
				}
			},
			( code, result ) => reject( { code, result } )
		);
	} );
}

module.exports = {
	fetchCurrentTimestamp,
	stash,
	publish
};
