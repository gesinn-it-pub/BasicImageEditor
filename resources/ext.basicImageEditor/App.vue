<template>
	<div class="ext-basicimageeditor-app">
		<cdx-message v-if="loadError" type="error">
			{{ loadError }}
		</cdx-message>

		<div v-else class="ext-basicimageeditor-layout">
			<div
				class="ext-basicimageeditor-stage"
				tabindex="0"
				role="application"
				:aria-label="$i18n( 'basicimageeditor-stage-label' ).text()"
				:aria-describedby="keyboardHelpId"
				@keydown="onStageKeydown"
			>
				<img
					ref="image"
					class="ext-basicimageeditor-image"
					alt=""
				>
				<div v-if="!ready" class="ext-basicimageeditor-stage-loading">
					<cdx-progress-bar
						:aria-label="$i18n( 'basicimageeditor-loading' ).text()"
					></cdx-progress-bar>
				</div>
			</div>
			<p :id="keyboardHelpId" class="ext-basicimageeditor-keyboard-help">
				{{ $i18n( 'basicimageeditor-keyboard-help' ).text() }}
			</p>

			<div class="ext-basicimageeditor-tools">
				<cdx-field>
					<template #label>
						{{ $i18n( 'basicimageeditor-tool-crop' ).text() }}
					</template>
					<cdx-select
						v-model:selected="aspect"
						:menu-items="aspectItems"
						:disabled="!ready"
						@update:selected="onAspectChange"
					></cdx-select>
				</cdx-field>

				<fieldset class="ext-basicimageeditor-group">
					<legend>{{ $i18n( 'basicimageeditor-tool-rotate' ).text() }}</legend>
					<cdx-button :disabled="!ready" @click="rotate( -90 )">
						{{ $i18n( 'basicimageeditor-rotate-left' ).text() }}
					</cdx-button>
					<cdx-button :disabled="!ready" @click="rotate( 90 )">
						{{ $i18n( 'basicimageeditor-rotate-right' ).text() }}
					</cdx-button>
				</fieldset>

				<fieldset class="ext-basicimageeditor-group">
					<legend>{{ $i18n( 'basicimageeditor-tool-flip' ).text() }}</legend>
					<cdx-button :disabled="!ready" @click="flip( 'horizontal' )">
						{{ $i18n( 'basicimageeditor-flip-horizontal' ).text() }}
					</cdx-button>
					<cdx-button :disabled="!ready" @click="flip( 'vertical' )">
						{{ $i18n( 'basicimageeditor-flip-vertical' ).text() }}
					</cdx-button>
				</fieldset>

				<div
					v-for="slider in sliders"
					:key="slider.key"
					class="ext-basicimageeditor-slider"
				>
					<label :for="slider.id">{{ slider.label }}</label>
					<output :for="slider.id">{{ slider.display }}</output>
					<input
						:id="slider.id"
						type="range"
						:min="slider.min"
						:max="slider.max"
						:step="slider.step"
						:value="slider.value"
						:disabled="!ready"
						:aria-valuetext="slider.display"
						@input="slider.onInput( $event.target.value )"
					>
				</div>

				<div class="ext-basicimageeditor-actions">
					<cdx-button
						action="progressive"
						weight="primary"
						:disabled="!ready || !hasChanges"
						@click="openSaveDialog"
					>
						{{ $i18n( 'basicimageeditor-save' ).text() }}
					</cdx-button>
					<cdx-button :disabled="!ready || !hasChanges" @click="reset">
						{{ $i18n( 'basicimageeditor-reset' ).text() }}
					</cdx-button>
					<cdx-button weight="quiet" @click="cancel">
						{{ $i18n( 'basicimageeditor-cancel' ).text() }}
					</cdx-button>
				</div>
			</div>
		</div>

		<!-- Save dialog -->
		<cdx-dialog
			v-model:open="saveDialogOpen"
			:title="$i18n( 'basicimageeditor-save-title' ).text()"
			:use-close-button="!saving"
			:close-button-label="$i18n( 'basicimageeditor-cancel' ).text()"
			:primary-action="{
				label: $i18n( 'basicimageeditor-save' ).text(),
				actionType: 'progressive',
				disabled: saving || !saveFormValid
			}"
			:default-action="{
				label: $i18n( 'basicimageeditor-cancel' ).text(),
				disabled: saving
			}"
			@primary="save"
			@default="saveDialogOpen = false"
		>
			<cdx-field v-if="config.allowSaveAsNew" :is-fieldset="true">
				<template #label>
					{{ $i18n( 'basicimageeditor-target-label' ).text() }}
				</template>
				<cdx-radio
					v-model="target"
					name="ext-basicimageeditor-target"
					input-value="version"
					:disabled="saving"
				>
					{{ $i18n( 'basicimageeditor-target-version' ).text() }}
				</cdx-radio>
				<cdx-radio
					v-model="target"
					name="ext-basicimageeditor-target"
					input-value="new"
					:disabled="saving"
				>
					{{ $i18n( 'basicimageeditor-target-new' ).text() }}
				</cdx-radio>
			</cdx-field>

			<cdx-message v-if="target === 'version'" type="warning">
				{{ $i18n( 'basicimageeditor-all-uses-warning' ).text() }}
			</cdx-message>

			<cdx-field
				v-if="target === 'new'"
				:status="newNameError ? 'error' : 'default'"
				:messages="newNameError ? { error: newNameError } : {}"
			>
				<template #label>
					{{ $i18n( 'basicimageeditor-newname-label' ).text() }}
				</template>
				<template #help-text>
					{{ $i18n( 'basicimageeditor-newname-help', newNameExtension ).text() }}
				</template>
				<cdx-text-input v-model="newBaseName" :disabled="saving"></cdx-text-input>
			</cdx-field>

			<cdx-field>
				<template #label>
					{{ $i18n( 'basicimageeditor-summary-label' ).text() }}
				</template>
				<cdx-text-input v-model="summary" :disabled="saving"></cdx-text-input>
			</cdx-field>

			<cdx-progress-bar
				v-if="saving"
				:aria-label="$i18n( 'basicimageeditor-saving' ).text()"
			></cdx-progress-bar>
			<cdx-message v-if="saveError" type="error">
				{{ saveError }}
			</cdx-message>
		</cdx-dialog>

		<!-- Conflict dialog -->
		<cdx-dialog
			v-model:open="conflictDialogOpen"
			:title="$i18n( 'basicimageeditor-conflict-title' ).text()"
			:primary-action="{
				label: $i18n( 'basicimageeditor-conflict-overwrite' ).text(),
				actionType: 'destructive'
			}"
			:default-action="{ label: $i18n( 'basicimageeditor-cancel' ).text() }"
			@primary="overwriteAfterConflict"
			@default="conflictDialogOpen = false"
		>
			<p>{{ $i18n( 'basicimageeditor-conflict-text' ).text() }}</p>
			<cdx-button v-if="config.allowSaveAsNew" @click="saveAsNewAfterConflict">
				{{ $i18n( 'basicimageeditor-conflict-new' ).text() }}
			</cdx-button>
		</cdx-dialog>

		<!-- Upload warnings dialog -->
		<cdx-dialog
			v-model:open="warningsDialogOpen"
			:title="$i18n( 'basicimageeditor-warnings-title' ).text()"
			:primary-action="{
				label: $i18n( 'basicimageeditor-warnings-continue' ).text(),
				actionType: 'progressive',
				disabled: saving
			}"
			:default-action="{ label: $i18n( 'basicimageeditor-cancel' ).text(), disabled: saving }"
			@primary="continueDespiteWarnings"
			@default="warningsDialogOpen = false"
		>
			<p>{{ $i18n( 'basicimageeditor-warnings-text' ).text() }}</p>
			<ul>
				<li v-for="( text, index ) in uploadWarnings" :key="index">
					{{ text }}
				</li>
			</ul>
		</cdx-dialog>
	</div>
</template>

<script>
const { defineComponent, markRaw } = require( 'vue' );
const {
	CdxButton, CdxDialog, CdxField, CdxMessage, CdxProgressBar,
	CdxRadio, CdxSelect, CdxTextInput
} = require( '@wikimedia/codex' );
const Cropper = require( 'ext.basicImageEditor.cropper' );
const { geometry, state: stateHelpers } = require( 'ext.basicImageEditor.core' );
const render = require( './render.js' );
const uploader = require( './uploader.js' );

/** Fixed crop ratios offered besides "free" and "original". */
const FIXED_RATIOS = { '1:1': 1, '4:3': 4 / 3, '16:9': 16 / 9 };

/** Pixels the crop box moves or grows per arrow key press (screen pixels). */
const KEYBOARD_STEP = 10;

/** Warnings that refuse a "New file" save instead of asking to continue. */
const NAME_TAKEN_WARNINGS = [ 'exists', 'exists-normalized', 'page-exists' ];

// @vue/component
module.exports = exports = defineComponent( {
	name: 'BasicImageEditorApp',
	components: {
		CdxButton, CdxDialog, CdxField, CdxMessage, CdxProgressBar,
		CdxRadio, CdxSelect, CdxTextInput
	},
	props: {
		/** File details from wgBasicImageEditor; see SpecialBasicImageEditor::getEditorConfig(). */
		config: {
			type: Object,
			required: true
		}
	},
	data() {
		const fileNameParts = stateHelpers.splitFileName( this.config.fileName );
		const initial = stateHelpers.createInitialState();
		return {
			// Edit state; see stateHelpers.createInitialState().
			rotate90: initial.rotate90,
			straighten: initial.straighten,
			scaleX: initial.scaleX,
			scaleY: initial.scaleY,
			brightness: initial.brightness,
			contrast: initial.contrast,

			ready: false,
			loadError: '',
			aspect: 'free',
			cropped: false,
			fileNameParts,
			keyboardHelpId: 'ext-basicimageeditor-keyboard-help',

			saveDialogOpen: false,
			conflictDialogOpen: false,
			warningsDialogOpen: false,
			target: 'version',
			newBaseName: fileNameParts.base,
			summary: '',
			saving: false,
			saveError: '',
			uploadWarnings: [],
			ignoreConflict: false,
			done: false,

			// Working objects, not shown in the template. Large objects are
			// wrapped in markRaw() when assigned so Vue does not track them.
			cropper: null,
			fullImage: null,
			previewBase: null,
			previewUrl: null,
			lastValidCrop: null,
			suppressCropCheck: false,
			previewBusy: false,
			previewPending: false,
			pendingFileKey: null,
			pendingParams: null,
			closeGuard: null
		};
	},
	computed: {
		aspectItems() {
			const items = [
				{ value: 'free', label: mw.msg( 'basicimageeditor-ratio-free' ) },
				{ value: 'original', label: mw.msg( 'basicimageeditor-ratio-original' ) }
			];
			Object.keys( FIXED_RATIOS ).forEach( ( key ) => {
				items.push( { value: key, label: key } );
			} );
			return items;
		},
		sliders() {
			const formatNumber = ( value, decimals ) => mw.language.convertNumber(
				Number( value.toFixed( decimals ) )
			);
			return [
				{
					key: 'straighten',
					id: 'ext-basicimageeditor-straighten',
					label: mw.msg( 'basicimageeditor-tool-straighten' ),
					min: -45,
					max: 45,
					step: 0.1,
					value: this.straighten,
					display: mw.msg(
						'basicimageeditor-degrees',
						formatNumber( this.straighten, 1 )
					),
					onInput: ( value ) => this.setStraighten( value )
				},
				{
					key: 'brightness',
					id: 'ext-basicimageeditor-brightness',
					label: mw.msg( 'basicimageeditor-tool-brightness' ),
					min: -100,
					max: 100,
					step: 1,
					value: this.brightness,
					display: formatNumber( this.brightness, 0 ),
					onInput: ( value ) => this.setAdjustment( 'brightness', value )
				},
				{
					key: 'contrast',
					id: 'ext-basicimageeditor-contrast',
					label: mw.msg( 'basicimageeditor-tool-contrast' ),
					min: -100,
					max: 100,
					step: 1,
					value: this.contrast,
					display: formatNumber( this.contrast, 0 ),
					onInput: ( value ) => this.setAdjustment( 'contrast', value )
				}
			];
		},
		editState() {
			return {
				rotate90: this.rotate90,
				straighten: this.straighten,
				scaleX: this.scaleX,
				scaleY: this.scaleY,
				brightness: this.brightness,
				contrast: this.contrast
			};
		},
		changedTools() {
			return stateHelpers.getChangedTools( this.editState, this.cropped );
		},
		hasChanges() {
			return this.changedTools.length > 0;
		},
		newNameExtension() {
			return '.' + this.fileNameParts.extension;
		},
		newFileName() {
			return this.newBaseName.trim() + '.' + this.fileNameParts.extension;
		},
		newNameError() {
			if ( this.target !== 'new' ) {
				return '';
			}
			if ( this.newBaseName.trim() === '' ) {
				return mw.msg( 'basicimageeditor-newname-empty' );
			}
			const normalize = ( name ) => name.replace( / /g, '_' );
			if ( normalize( this.newFileName ) === normalize( this.config.fileName ) ) {
				return mw.msg( 'basicimageeditor-newname-same' );
			}
			return '';
		},
		saveFormValid() {
			return this.newNameError === '';
		}
	},
	methods: {
		// --- Loading -------------------------------------------------------

		load() {
			render.loadImage( this.config.sourceUrl )
				.then( ( image ) => {
					this.fullImage = markRaw( image );
					this.previewBase = markRaw( render.createPreviewBase( image ) );
					return render.renderPreviewUrl( this.previewBase, 0, 0, this.config.mimeType );
				} )
				.then( ( url ) => {
					this.previewUrl = url;
					this.$refs.image.src = url;
					this.cropper = markRaw( new Cropper( this.$refs.image, {
						viewMode: 1,
						dragMode: 'crop',
						autoCropArea: 1,
						movable: false,
						zoomable: false,
						rotatable: true,
						scalable: true,
						responsive: true,
						restore: true,
						guides: true,
						toggleDragModeOnDblclick: false,
						// Browsers already apply EXIF orientation; Cropper would
						// rotate the image a second time.
						checkOrientation: false,
						checkCrossOrigin: false,
						ready: () => {
							this.ready = true;
							this.resetCrop();
						},
						crop: () => this.onCrop()
					} ) );
				} )
				.catch( ( error ) => {
					mw.log.error( error );
					this.loadError = mw.msg(
						'basicimageeditor-load-error',
						String( error && error.message || error )
					);
				} );
		},

		// --- Geometry ------------------------------------------------------

		previewSize() {
			return { width: this.previewBase.canvas.width, height: this.previewBase.canvas.height };
		},

		totalRotation() {
			return this.rotate90 + this.straighten;
		},

		currentAspectRatio() {
			if ( this.aspect === 'original' ) {
				const size = this.previewSize();
				return geometry.displayedAspectRatio( size.width, size.height, this.rotate90 );
			}
			return FIXED_RATIOS[ this.aspect ] || NaN;
		},

		/** Apply rotation and flip to Cropper, then fit the crop box to the image. */
		applyGeometry() {
			this.suppressCropCheck = true;
			// Without a crop box, Cropper lets the canvas shrink below the
			// old crop box size; resetCrop() sets the new box.
			this.cropper.clear();
			this.cropper.rotateTo( this.totalRotation() );
			this.cropper.scale( this.scaleX, this.scaleY );
			this.fitCanvas();
			this.cropper.crop();
			this.cropper.setAspectRatio( this.currentAspectRatio() );
			this.suppressCropCheck = false;
			this.resetCrop();
		},

		/**
		 * Fit the rotated image inside the stage. Cropper keeps the canvas
		 * size it had before rotating, so a rotated image can overflow the
		 * stage, and the crop box, which stays inside the stage, could then
		 * not cover the whole image.
		 */
		fitCanvas() {
			const container = this.cropper.getContainerData();
			const canvas = this.cropper.getCanvasData();
			const scale = Math.min(
				container.width / canvas.width,
				container.height / canvas.height
			);
			const width = canvas.width * scale;
			const height = canvas.height * scale;
			this.cropper.setCanvasData( {
				left: ( container.width - width ) / 2,
				top: ( container.height - height ) / 2,
				width,
				height
			} );
		},

		/** Set the crop box to the largest rectangle that fits on the image. */
		resetCrop() {
			const size = this.previewSize();
			let ratio = this.currentAspectRatio();
			if ( isNaN( ratio ) ) {
				ratio = geometry.displayedAspectRatio( size.width, size.height, this.rotate90 );
			}
			const rect = geometry.largestInscribedRect(
				size.width, size.height, this.totalRotation(), ratio
			);
			this.suppressCropCheck = true;
			this.cropper.setData( rect );
			this.suppressCropCheck = false;
			this.lastValidCrop = this.cropper.getData();
			this.updateCropped();
		},

		/** Keep the crop box on the image: undo any move that would save empty corners. */
		onCrop() {
			if ( !this.ready || this.suppressCropCheck ) {
				return;
			}
			const data = this.cropper.getData();
			const size = this.previewSize();
			const degrees = this.totalRotation();
			if ( geometry.isRectInsideRotatedImage( data, size.width, size.height, degrees ) ) {
				this.lastValidCrop = data;
				this.updateCropped();
			} else if ( this.lastValidCrop ) {
				this.suppressCropCheck = true;
				this.cropper.setData( this.lastValidCrop );
				this.suppressCropCheck = false;
			}
		},

		/** Whether the crop removes part of the image beyond what straightening requires. */
		updateCropped() {
			const size = this.previewSize();
			const full = geometry.largestInscribedRect(
				size.width,
				size.height,
				this.totalRotation(),
				geometry.displayedAspectRatio( size.width, size.height, this.rotate90 )
			);
			const crop = this.lastValidCrop;
			// One preview pixel of slack on each side for rounding.
			this.cropped = crop.width < full.width - 2 || crop.height < full.height - 2;
		},

		rotate( degrees ) {
			this.rotate90 = geometry.normalizeAngle( this.rotate90 + degrees );
			this.applyGeometry();
		},

		flip( axis ) {
			Object.assign( this, geometry.flip( this.editState, axis ) );
			this.applyGeometry();
		},

		setStraighten( value ) {
			this.straighten = Math.round( Number( value ) * 10 ) / 10;
			this.applyGeometry();
		},

		onAspectChange() {
			this.applyGeometry();
		},

		onStageKeydown( event ) {
			const moves = {
				ArrowLeft: [ -1, 0 ],
				ArrowRight: [ 1, 0 ],
				ArrowUp: [ 0, -1 ],
				ArrowDown: [ 0, 1 ]
			};
			if ( !this.ready || !moves[ event.key ] ) {
				return;
			}
			event.preventDefault();
			const [ dx, dy ] = moves[ event.key ];
			const box = this.cropper.getCropBoxData();
			if ( event.shiftKey ) {
				box.width += dx * KEYBOARD_STEP;
				box.height += dy * KEYBOARD_STEP;
			} else {
				box.left += dx * KEYBOARD_STEP;
				box.top += dy * KEYBOARD_STEP;
			}
			this.cropper.setCropBoxData( box );
		},

		// --- Brightness and contrast preview -------------------------------

		setAdjustment( name, value ) {
			this[ name ] = Number( value );
			this.schedulePreview();
		},

		/**
		 * Re-render the preview: at most one render at a time, always ending
		 * on the latest values.
		 */
		schedulePreview() {
			if ( this.previewBusy ) {
				this.previewPending = true;
				return;
			}
			this.previewBusy = true;
			this.previewPending = false;
			render.renderPreviewUrl(
				this.previewBase, this.brightness, this.contrast, this.config.mimeType
			)
				.then( ( url ) => {
					const oldUrl = this.previewUrl;
					this.previewUrl = url;
					// Same size, so Cropper keeps the crop box and rotation.
					this.cropper.replace( url, true );
					setTimeout( () => URL.revokeObjectURL( oldUrl ), 1000 );
				} )
				.catch( ( error ) => mw.log.error( error ) )
				.then( () => {
					this.previewBusy = false;
					if ( this.previewPending ) {
						this.schedulePreview();
					}
				} );
		},

		reset() {
			Object.assign( this, stateHelpers.createInitialState() );
			this.aspect = 'free';
			this.applyGeometry();
			this.schedulePreview();
		},

		cancel() {
			location.href = this.config.filePageUrl;
		},

		// --- Saving --------------------------------------------------------

		openSaveDialog() {
			const toolList = stateHelpers.buildSummary(
				this.changedTools,
				// Messages used here:
				// * basicimageeditor-summary-crop
				// * basicimageeditor-summary-rotate
				// * basicimageeditor-summary-flip
				// * basicimageeditor-summary-straighten
				// * basicimageeditor-summary-brightness
				// * basicimageeditor-summary-contrast
				( tool ) => mw.msg( 'basicimageeditor-summary-' + tool ),
				mw.msg( 'comma-separator' )
			);
			// The user may edit or remove the "edited with" note like the rest.
			this.summary = mw.msg( 'basicimageeditor-summary-with-tools', toolList );
			this.saveError = '';
			this.saveDialogOpen = true;
		},

		/**
		 * @return {{x: number, y: number, width: number, height: number}} Crop
		 *  rectangle in full-resolution pixels
		 */
		fullResolutionCrop() {
			const width = this.fullImage.naturalWidth;
			const height = this.fullImage.naturalHeight;
			// No crop chosen: use the exact largest rectangle, not the crop
			// box read back from the screen, which can lose a pixel row.
			const crop = this.cropped ?
				geometry.scaleRect( this.lastValidCrop, 1 / this.previewBase.scale ) :
				geometry.largestInscribedRect(
					width, height, this.totalRotation(),
					geometry.displayedAspectRatio( width, height, this.rotate90 )
				);
			if ( this.straighten !== 0 ) {
				// Preview rounding can overshoot the image edge by up to one
				// preview pixel; trim that so no empty corners are saved.
				const inset = Math.ceil( 1 / this.previewBase.scale );
				crop.x += inset;
				crop.y += inset;
				crop.width -= 2 * inset;
				crop.height -= 2 * inset;
			}
			return crop;
		},

		save() {
			if ( this.saving || !this.saveFormValid ) {
				return;
			}
			this.saving = true;
			this.saveError = '';
			const api = new mw.Api();
			const toVersion = this.target === 'version';

			const conflictCheck = toVersion && !this.ignoreConflict ?
				uploader.fetchCurrentTimestamp( api, this.config.fileTitle ) :
				Promise.resolve( null );

			conflictCheck
				.then( ( currentTimestamp ) => {
					const conflict = currentTimestamp &&
						stateHelpers.hasConflict( this.config.timestamp, currentTimestamp );
					if ( conflict ) {
						this.saving = false;
						this.saveDialogOpen = false;
						this.conflictDialogOpen = true;
						return null;
					}
					return this.renderBlob().then( ( blob ) => {
						if ( blob.size > this.config.maxUploadSize ) {
							throw new Error( mw.msg(
								'basicimageeditor-error-result-toolarge',
								mw.msg( 'size-megabytes', mw.language.convertNumber(
									Math.round( this.config.maxUploadSize / 1048576 * 10 ) / 10
								) )
							) );
						}
						const fileName = toVersion ? this.config.fileName : this.newFileName;
						return uploader.stash( api, blob, fileName ).then( ( fileKey ) => {
							this.pendingFileKey = fileKey;
							this.pendingParams = this.publishParams( fileName, toVersion );
							return this.publishPending();
						} );
					} );
				} )
				.catch( ( error ) => this.handleSaveError( error ) );
		},

		renderBlob() {
			// Let the progress bar paint before the synchronous canvas work.
			return new Promise( ( resolve ) => {
				setTimeout( resolve, 0 );
			} ).then( () => {
				const canvas = render.renderFull(
					this.fullImage,
					this.editState,
					this.fullResolutionCrop(),
					this.config.mimeType
				);
				return render.canvasToBlob(
					canvas, this.config.mimeType, this.config.jpegQuality / 100
				);
			} );
		},

		publishParams( fileName, toVersion ) {
			const params = {
				filename: fileName,
				comment: this.summary,
				tags: this.config.changeTag,
				// Overwriting is the intent for a new version; for a new file,
				// warnings such as "exists" must stop the save.
				ignorewarnings: toVersion ? 1 : undefined
			};
			if ( !toVersion ) {
				params.text = stateHelpers.buildNewFileDescription(
					this.config.sourceDescription,
					mw.message( 'basicimageeditor-derived-from', this.config.fileTitle ).plain()
				);
			}
			return params;
		},

		publishPending( ignoreWarnings ) {
			const params = Object.assign( {}, this.pendingParams );
			if ( ignoreWarnings ) {
				params.ignorewarnings = 1;
			}
			return uploader.publish( new mw.Api(), this.pendingFileKey, params )
				.then( ( result ) => this.onSaved( result ) );
		},

		onSaved( result ) {
			this.done = true;
			if ( this.closeGuard ) {
				this.closeGuard.release();
			}
			const savedName = result.upload.filename || this.pendingParams.filename;
			location.href = mw.util.getUrl( 'File:' + savedName, { basicimageeditor: 'saved' } );
		},

		handleSaveError( error ) {
			this.saving = false;
			if ( error instanceof Error ) {
				this.saveError = error.message;
				return;
			}
			const result = error.result || {};
			if ( error.code === 'warnings' ) {
				const warnings = result.upload.warnings;
				if ( result.upload.filekey ) {
					this.pendingFileKey = result.upload.filekey;
				}
				if ( NAME_TAKEN_WARNINGS.some( ( key ) => key in warnings ) ) {
					this.saveError = mw.msg( 'basicimageeditor-newname-exists', this.newFileName );
					return;
				}
				this.uploadWarnings = Object.keys( warnings ).map(
					( key ) => this.describeWarning( key, warnings[ key ] )
				);
				this.saveDialogOpen = false;
				this.warningsDialogOpen = true;
				return;
			}
			let text;
			try {
				text = new mw.Api().getErrorMessage( result ).text();
			} catch ( e ) {
				text = error.code;
			}
			this.saveError = mw.msg( 'basicimageeditor-error-save', text || error.code );
		},

		describeWarning( key, value ) {
			switch ( key ) {
				case 'duplicate':
					return mw.msg(
						'basicimageeditor-warning-duplicate',
						[].concat( value ).join( mw.msg( 'comma-separator' ) )
					);
				case 'duplicate-archive':
					return mw.msg( 'basicimageeditor-warning-duplicate-archive' );
				case 'was-deleted':
					return mw.msg( 'basicimageeditor-warning-was-deleted' );
				case 'badfilename':
					return mw.msg( 'basicimageeditor-warning-badfilename', value );
				default:
					return mw.msg( 'basicimageeditor-warning-other', key );
			}
		},

		continueDespiteWarnings() {
			this.saving = true;
			this.publishPending( true )
				.catch( ( error ) => {
					this.warningsDialogOpen = false;
					this.saveDialogOpen = true;
					this.handleSaveError( error );
				} );
		},

		overwriteAfterConflict() {
			this.conflictDialogOpen = false;
			this.ignoreConflict = true;
			this.saveDialogOpen = true;
			this.save();
		},

		saveAsNewAfterConflict() {
			this.conflictDialogOpen = false;
			this.target = 'new';
			this.saveDialogOpen = true;
		}
	},
	mounted() {
		this.closeGuard = markRaw( mw.confirmCloseWindow( {
			test: () => this.hasChanges && !this.done
		} ) );
		this.load();
	},
	beforeUnmount() {
		if ( this.cropper ) {
			this.cropper.destroy();
		}
		if ( this.closeGuard ) {
			this.closeGuard.release();
		}
	}
} );
</script>
