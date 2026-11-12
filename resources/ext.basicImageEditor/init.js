/**
 * Entry point of the editor: mounts the Vue app on Special:BasicImageEditor.
 */
const Vue = require( 'vue' );
const App = require( './App.vue' );

const config = mw.config.get( 'wgBasicImageEditor' );
const container = document.getElementById( 'ext-basicimageeditor' );

if ( config && container ) {
	Vue.createMwApp( App, { config } ).mount( container );
}
