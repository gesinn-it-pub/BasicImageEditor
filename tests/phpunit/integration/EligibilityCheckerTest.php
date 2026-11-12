<?php

namespace MediaWiki\Extension\BasicImageEditor\Tests;

use MediaWiki\Extension\BasicImageEditor\EligibilityChecker;
use MediaWiki\Title\Title;
use MediaWikiIntegrationTestCase;

/**
 * @covers \MediaWiki\Extension\BasicImageEditor\EligibilityChecker
 * @group Database
 */
class EligibilityCheckerTest extends MediaWikiIntegrationTestCase {

	private function getChecker(): EligibilityChecker {
		return $this->getServiceContainer()->getService( 'BasicImageEditor.EligibilityChecker' );
	}

	public function testUploadsDisabled() {
		$this->overrideConfigValue( 'EnableUploads', false );
		$status = $this->getChecker()->check(
			$this->getTestSysop()->getAuthority(),
			Title::makeTitle( NS_FILE, 'Example.jpg' ),
			null
		);
		$this->assertStatusError( 'basicimageeditor-error-uploads-disabled', $status );
	}

	public function testMissingFile() {
		$this->overrideConfigValue( 'EnableUploads', true );
		$status = $this->getChecker()->check(
			$this->getTestSysop()->getAuthority(),
			Title::makeTitle( NS_FILE, 'Example.jpg' ),
			null
		);
		$this->assertStatusError( 'basicimageeditor-error-nofile', $status );
	}

	// TODO: one test per remaining condition (remote, format, pixel limit,
	// anonymous, rights, protection, reupload-own), using uploaded fixtures.
}
