<?php

namespace MediaWiki\Extension\BasicImageEditor;

use File;
use MediaWiki\Config\Config;
use MediaWiki\Content\TextContent;
use MediaWiki\Html\Html;
use MediaWiki\Message\Message;
use MediaWiki\Revision\RevisionLookup;
use MediaWiki\Revision\RevisionRecord;
use MediaWiki\Revision\SlotRecord;
use MediaWiki\SpecialPage\SpecialPage;
use MediaWiki\SpecialPage\UnlistedSpecialPage;
use MediaWiki\Title\Title;
use RepoGroup;
use UploadBase;

/**
 * Special:BasicImageEditor/<file name> – hosts the in-browser editor.
 *
 * Repeats the eligibility checks so that a pasted link cannot bypass them,
 * then hands the file details to the front end and loads the editor module.
 */
class SpecialBasicImageEditor extends UnlistedSpecialPage {

	private EligibilityChecker $eligibilityChecker;
	private RepoGroup $repoGroup;
	private RevisionLookup $revisionLookup;
	private Config $config;

	public function __construct(
		EligibilityChecker $eligibilityChecker,
		RepoGroup $repoGroup,
		RevisionLookup $revisionLookup,
		Config $config
	) {
		parent::__construct( 'BasicImageEditor' );
		$this->eligibilityChecker = $eligibilityChecker;
		$this->repoGroup = $repoGroup;
		$this->revisionLookup = $revisionLookup;
		$this->config = $config;
	}

	/**
	 * @inheritDoc
	 */
	public function execute( $par ) {
		$this->setHeaders();
		$out = $this->getOutput();

		$target = $par ?? $this->getRequest()->getText( 'file' );
		$title = $target !== '' ? Title::makeTitleSafe( NS_FILE, $target ) : null;
		if ( !$title ) {
			$out->addHTML( Html::errorBox( $this->msg( 'basicimageeditor-error-notarget' )->parse() ) );
			return;
		}

		$out->setPageTitleMsg( $this->msg( 'basicimageeditor-title' )->plaintextParams( $title->getText() ) );

		$file = $this->repoGroup->findFile( $title, [ 'latest' => true ] ) ?: null;
		$status = $this->eligibilityChecker->check(
			$this->getAuthority(),
			$title,
			$file,
			EligibilityChecker::RIGOR_FULL
		);
		if ( !$status->isGood() ) {
			$messages = $status->getMessages();
			$out->addHTML( Html::errorBox(
				Message::newFromSpecifier( $messages[0] )->setContext( $this->getContext() )->parse()
			) );
			$out->addReturnTo( $title );
			return;
		}

		$out->addJsConfigVars( 'wgBasicImageEditor', $this->getEditorConfig( $title, $file ) );
		$out->addModules( 'ext.basicImageEditor' );
		$out->addHTML(
			Html::rawElement(
				'div',
				[ 'id' => 'ext-basicimageeditor', 'class' => 'ext-basicimageeditor' ],
				Html::element(
					'p',
					[ 'class' => 'ext-basicimageeditor-loading' ],
					$this->msg( 'basicimageeditor-loading' )->text()
				)
			) .
			Html::rawElement(
				'noscript',
				[],
				Html::errorBox( $this->msg( 'basicimageeditor-nojs' )->parse() )
			)
		);
	}

	/**
	 * File details and settings the editor needs, exported as wgBasicImageEditor.
	 *
	 * @param Title $title
	 * @param File $file
	 * @return array
	 */
	private function getEditorConfig( Title $title, File $file ): array {
		$allowSaveAsNew = (bool)$this->config->get( 'BasicImageEditorAllowSaveAsNew' );

		return [
			'fileName' => $file->getName(),
			'fileTitle' => $title->getPrefixedText(),
			'filePageUrl' => $title->getLocalURL(),
			// Loaded through the wiki's own domain, so pixel access works even
			// when uploads are served from another host. The timestamp only
			// keeps browser caches apart between versions.
			'sourceUrl' => SpecialPage::getTitleFor( 'BasicImageEditorFile', $file->getName() )
				->getLocalURL( [ 'version' => $file->getTimestamp() ] ),
			'mimeType' => $file->getMimeType(),
			'width' => $file->getWidth(),
			'height' => $file->getHeight(),
			'timestamp' => wfTimestamp( TS_ISO_8601, $file->getTimestamp() ),
			'maxUploadSize' => UploadBase::getMaxUploadSize( 'file' ),
			'jpegQuality' => (int)$this->config->get( 'BasicImageEditorJpegQuality' ),
			'allowSaveAsNew' => $allowSaveAsNew,
			'sourceDescription' => $allowSaveAsNew ? $this->getDescriptionText( $title ) : null,
			'changeTag' => Hooks::CHANGE_TAG,
		];
	}

	/**
	 * Wikitext of the file description page, copied to the page of a "New file".
	 *
	 * @param Title $title
	 * @return string
	 */
	private function getDescriptionText( Title $title ): string {
		$revision = $this->revisionLookup->getRevisionByTitle( $title );
		if ( !$revision ) {
			return '';
		}
		$content = $revision->getContent(
			SlotRecord::MAIN,
			RevisionRecord::FOR_THIS_USER,
			$this->getAuthority()
		);
		return $content instanceof TextContent ? $content->getText() : '';
	}

	/**
	 * @inheritDoc
	 */
	protected function getGroupName() {
		return 'media';
	}
}
