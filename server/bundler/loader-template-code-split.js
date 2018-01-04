/*eslint-disable no-var */
var config = require( 'config' ),
	page = require( 'page' ),
	React = require( 'react' ), //eslint-disable-line no-unused-vars
	find = require( 'lodash/find' ),
	sectionsUtils = require( 'lib/sections-utils' ),
	activateNextLayoutFocus = require( 'state/ui/layout-focus/actions' ).activateNextLayoutFocus,
	LoadingError = require( 'layout/error' ),
	controller = require( 'controller' ),
	restoreLastSession = require( 'lib/restore-last-path' ).restoreLastSession,
	preloadHub = require( 'sections-preload' ).hub,
	switchCSS = require( 'lib/i18n-utils/switch-locale' ).switchCSS;

var sections = /*___SECTIONS_DEFINITION___*/[];

var _loadedSections = {};

function loadCSS( sectionName ) { //eslint-disable-line no-unused-vars
	var section = find( sections, function finder( currentSection ) {
		return currentSection.name === sectionName;
	} );

	if ( ! ( section && section.css ) ) {
		return;
	}

	var url = section.css.urls.ltr;

	if ( typeof document !== 'undefined' && document.documentElement.dir === 'rtl' ) {
		url = section.css.urls.rtl;
	}

	switchCSS( 'section-css-' + section.css.id, url );
}

function preload( sectionName ) {
	var loadedModules = [];
	switch ( sectionName ) { //eslint-disable-line no-empty
		/*___LOADERS___*/
	}

	if ( loadedModules.length === 1 ) {
		return loadedModules[ 0 ];
	}

	return Promise.all( loadedModules );
}
preloadHub.on( 'preload', preload );

function createPageDefinition( path, sectionDefinition ) {
	var pathRegex = sectionsUtils.pathToRegExp( path );

	page( pathRegex, function( context, next ) {
		var envId = sectionDefinition.envId;
		if ( envId && envId.indexOf( config( 'env_id' ) ) === -1 ) {
			return next();
		}
		if ( _loadedSections[ sectionDefinition.module ] ) {
			controller.setSection( sectionDefinition )( context );
			context.store.dispatch( activateNextLayoutFocus() );
			return next();
		}
		if ( config.isEnabled( 'restore-last-location' ) && restoreLastSession( context.path ) ) {
			return;
		}
		context.store.dispatch( { type: 'SECTION_SET', isLoading: true } );
		preload( sectionDefinition.name ).then( function( requiredModule ) {
			var loadedModules = Array.isArray( requiredModule ) ? requiredModule : [ requiredModule ];
			context.store.dispatch( { type: 'SECTION_SET', isLoading: false } );
			controller.setSection( sectionDefinition )( context );
			if ( ! _loadedSections[ sectionDefinition.module ] ) {
				loadedModules.forEach( mod => mod( controller.clientRouter ) );
				_loadedSections[ sectionDefinition.module ] = true;
			}
			context.store.dispatch( activateNextLayoutFocus() );
			next();
		},
		function onError( error ) {
			if ( ! LoadingError.isRetry() ) {
				console.warn( error );
				LoadingError.retry( sectionDefinition.name );
			} else {
				console.error( error );
				context.store.dispatch( { type: 'SECTION_SET', isLoading: false } );
				LoadingError.show( sectionDefinition.name );
			}
		} );
	} );
}

module.exports = {
	get: sectionsUtils.getSectionsFactory( sections ),
	load: sectionsUtils.loadSectionsFactory( sections, createPageDefinition ),
};