<?php

namespace MediaWiki\Extension\BasicImageEditor;

use MediaWiki\SpecialPage\UnlistedSpecialPage;
use MediaWiki\Title\Title;
use RepoGroup;

/**
 * Special:BasicImageEditorFile/<file name> – serves the current version of a
 * file from the wiki's own domain.
 *
 * The editor needs pixel access to the image. When a wiki serves uploads from
 * another host, browsers block that without CORS headers; loading the file
 * through this page avoids any web server configuration.
 *
 * Read-only. Serves only JPG and PNG files, and only to users who may read
 * the file page, so it exposes nothing the user could not already view.
 */
class SpecialBasicImageEditorFile extends UnlistedSpecialPage {

	private RepoGroup $repoGroup;

	public function __construct( RepoGroup $repoGroup ) {
		parent::__construct( 'BasicImageEditorFile' );
		$this->repoGroup = $repoGroup;
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $par ) {
		$this->getOutput()->disable();

		$title = $par !== null && $par !== '' ? Title::makeTitleSafe( NS_FILE, $par ) : null;
		if ( !$title ) {
			$this->sendError( 404, 'No such file.' );
			return;
		}
		if ( !$this->getAuthority()->definitelyCan( 'read', $title ) ) {
			$this->sendError( 403, 'You may not view this file.' );
			return;
		}

		$file = $this->repoGroup->getLocalRepo()->findFile( $title, [ 'latest' => true ] );
		if (
			!$file ||
			!$file->exists() ||
			!in_array( $file->getMimeType(), EligibilityChecker::SUPPORTED_MIME_TYPES, true )
		) {
			$this->sendError( 404, 'No such file.' );
			return;
		}

		$status = $file->getRepo()->streamFileWithStatus(
			$file->getPath(),
			[
				'Cache-Control: private, max-age=0, must-revalidate',
				'X-Content-Type-Options: nosniff',
			]
		);
		if ( !$status->isOK() ) {
			wfDebugLog( 'BasicImageEditor', 'Could not stream ' . $file->getName() );
		}
	}

	/**
	 * @param int $code HTTP status code
	 * @param string $text Plain-text body
	 */
	private function sendError( int $code, string $text ): void {
		$response = $this->getRequest()->response();
		$response->statusHeader( $code );
		$response->header( 'Content-Type: text/plain; charset=utf-8' );
		$response->header( 'Cache-Control: private, no-cache' );
		echo $text;
	}
}
