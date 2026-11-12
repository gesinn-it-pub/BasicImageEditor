<?php

use MediaWiki\Config\ServiceOptions;
use MediaWiki\Extension\BasicImageEditor\EligibilityChecker;
use MediaWiki\MediaWikiServices;

/** @phpcs-require-sorted-array */
return [
	'BasicImageEditor.EligibilityChecker' => static function (
		MediaWikiServices $services
	): EligibilityChecker {
		return new EligibilityChecker(
			new ServiceOptions(
				EligibilityChecker::CONSTRUCTOR_OPTIONS,
				$services->getMainConfig()
			),
			$services->getReadOnlyMode()
		);
	},
];
