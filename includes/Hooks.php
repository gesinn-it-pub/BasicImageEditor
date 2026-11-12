<?php

namespace MediaWiki\Extension\BasicImageEditor;

use MediaWiki\ChangeTags\Hook\ChangeTagsAllowedAddHook;
use MediaWiki\ChangeTags\Hook\ChangeTagsListActiveHook;
use MediaWiki\ChangeTags\Hook\ListDefinedTagsHook;
use MediaWiki\Hook\SkinTemplateNavigation__UniversalHook;
use MediaWiki\Output\Hook\BeforePageDisplayHook;
use MediaWiki\SpecialPage\SpecialPage;
use RepoGroup;

/**
 * Hook handlers: the "Edit image" tab, the notice after saving and the
 * change tag.
 *
 * phpcs:disable MediaWiki.NamingConventions.LowerCamelFunctionsName.FunctionName
 */
class Hooks implements
	SkinTemplateNavigation__UniversalHook,
	BeforePageDisplayHook,
	ListDefinedTagsHook,
	ChangeTagsListActiveHook,
	ChangeTagsAllowedAddHook
{
	/** Change tag applied to every upload made by the editor. */
	public const CHANGE_TAG = 'basicimageeditor';

	private EligibilityChecker $eligibilityChecker;
	private RepoGroup $repoGroup;

	public function __construct(
		EligibilityChecker $eligibilityChecker,
		RepoGroup $repoGroup
	) {
		$this->eligibilityChecker = $eligibilityChecker;
		$this->repoGroup = $repoGroup;
	}

	/**
	 * Add the "Edit image" tab to eligible File: pages.
	 *
	 * @inheritDoc
	 */
	public function onSkinTemplateNavigation__Universal( $sktemplate, &$links ): void {
		$title = $sktemplate->getRelevantTitle();
		if ( !$title || $title->getNamespace() !== NS_FILE || !$title->exists() ) {
			return;
		}

		$file = $this->repoGroup->findFile( $title );
		$status = $this->eligibilityChecker->check(
			$sktemplate->getAuthority(),
			$title,
			$file ?: null,
			EligibilityChecker::RIGOR_QUICK
		);
		if ( !$status->isGood() ) {
			return;
		}

		$links['views']['basicimageeditor'] = [
			'class' => false,
			'text' => $sktemplate->msg( 'basicimageeditor-tab' )->text(),
			'href' => SpecialPage::getTitleFor( 'BasicImageEditor', $title->getDBkey() )->getLocalURL(),
		];
	}

	/**
	 * After the editor saves, it returns to the File: page with
	 * ?basicimageeditor=saved; show a confirmation and refresh the image there.
	 *
	 * @inheritDoc
	 */
	public function onBeforePageDisplay( $out, $skin ): void {
		$title = $out->getTitle();
		if (
			$title && $title->getNamespace() === NS_FILE &&
			$out->getRequest()->getVal( 'basicimageeditor' ) === 'saved'
		) {
			$out->addModules( 'ext.basicImageEditor.saved' );
		}
	}

	/**
	 * @inheritDoc
	 */
	public function onListDefinedTags( &$tags ) {
		$tags[] = self::CHANGE_TAG;
	}

	/**
	 * @inheritDoc
	 */
	public function onChangeTagsListActive( &$tags ) {
		$tags[] = self::CHANGE_TAG;
	}

	/**
	 * Let users apply the tag through the upload API's "tags" parameter.
	 *
	 * @inheritDoc
	 */
	public function onChangeTagsAllowedAdd( &$allowedTags, $addTags, $user ) {
		$allowedTags[] = self::CHANGE_TAG;
	}
}
