/** @format */
/**
 * External dependencies
 */
import config from 'config';
import page from 'page';
// import React from 'react';
import { find, groupBy, toPairs, partial } from 'lodash';
// import utils = require( './utils' );

/**
 * Internal dependencies
 */
import sectionsUtils from 'lib/sections-utils';
import { activateNextLayoutFocus } from 'state/ui/layout-focus/actions';

import LoadingError from 'layout/error';
import controller from 'controller';
import { restoreLastSession } from 'lib/restore-last-path';
import { preloadHub } from 'sections-preload';
import { switchCSS } from 'lib/i18n-utils/switch-locale';

import sections from './sections';
const sectionsWithCss = sectionsWithCssUrls( sections );

const _loadedSections = {};

function maybeLoadCSS( sectionName ) {
	//eslint-disable-line no-unused-vars
	const section = find( sectionsWithCss, elem => elem.name === sectionName );

	if ( ! ( section && section.css ) ) {
		return;
	}

	const url =
		typeof document !== 'undefined' && document.documentElement.dir === 'rtl'
			? section.css.urls.rtl
			: section.css.urls.ltr;

	switchCSS( 'section-css-' + section.css.id, url );
}

function preload( sectionName ) {
	maybeLoadCSS( sectionName );
	const section = find( sections, { name: sectionName } );
	if ( ! section ) {
		return Promise.reject( `Attempting to load non-existent section: ${ sectionName }` );
	}

	if ( async ) {
		const chunk = import( /* webpackChunkName: `${section.name}` */ section.module );
		return chunk;
	}

	return require( section.module );
}

preloadHub.on( 'preload', preload );

function activateSection( sectionDefinition, context, next ) {
	var dispatch = context.store.dispatch;

	controller.setSection( sectionDefinition )( context );
	dispatch( { type: 'SECTION_SET', isLoading: false } );
	dispatch( activateNextLayoutFocus() );
	next();
}

function createPageDefinition( path, sectionDefinition ) {
	var pathRegex = sectionsUtils.pathToRegExp( path );

	page( pathRegex, function( context, next ) {
		var envId = sectionDefinition.envId,
			dispatch = context.store.dispatch;

		if ( envId && envId.indexOf( config( 'env_id' ) ) === -1 ) {
			return next();
		}
		if ( _loadedSections[ sectionDefinition.module ] ) {
			return activateSection( sectionDefinition, context, next );
		}
		if ( config.isEnabled( 'restore-last-location' ) && restoreLastSession( context.path ) ) {
			return;
		}
		dispatch( { type: 'SECTION_SET', isLoading: true } );
		preload( sectionDefinition.name ).then(
			function( requiredModules ) {
				if ( ! _loadedSections[ sectionDefinition.module ] ) {
					requiredModules.forEach( function moduleIterator( mod ) {
						mod( controller.clientRouter );
					} );
					_loadedSections[ sectionDefinition.module ] = true;
				}
				return activateSection( sectionDefinition, context, next );
			},
			function onError( error ) {
				if ( ! LoadingError.isRetry() ) {
					console.warn( error );
					LoadingError.retry( sectionDefinition.name );
				} else {
					console.error( error );
					dispatch( { type: 'SECTION_SET', isLoading: false } );
					LoadingError.show( sectionDefinition.name );
				}
			}
		);
	} );
}

function sectionsWithCSSUrls( sections ) {
	return sections.map( section =>
		Object.assign(
			{},
			section,
			section.css && {
				css: {
					id: section.css,
					urls: utils.getCssUrls( section.css ),
				},
			}
		)
	);
}

export default {
	get: sectionsUtils.getSectionsFactory( sections ),
	load: sectionsUtils.loadSectionsFactory( sections, createPageDefinition ),
};
