/** @format */
/**
 * External dependencies
 */
import config from 'config';
import page from 'page';
import { find, filter, isEmpty } from 'lodash';

/**
 * Internal dependencies
 */
import { activateNextLayoutFocus } from 'state/ui/layout-focus/actions';
import utils from '../server/bundler/utils';
import * as LoadingError from 'layout/error';
import * as controller from './controller/index.web';
import { restoreLastSession } from 'lib/restore-last-path';
import { hub as preloadHub } from 'sections-preload';
import { switchCSS } from 'lib/i18n-utils/switch-locale';

import baseSections from './sections';

const sectionsWithCss = baseSections.map( section => ( {
	...section,
	...( section.css && {
		css: {
			id: section.css,
			urls: utils.getCssUrls( section.css ),
		},
	} ),
} ) );

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
	const sections = filter( sectionsWithCss, { name: sectionName } );
	if ( isEmpty( sections ) ) {
		return Promise.reject( `Attempting to load non-existent section: ${ sectionName }` );
	}
	return Promise.all( sections.map( section => section.load() ) );
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
	var pathRegex = utils.pathToRegExp( path );

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
		preload( sectionDefinition.name )
			.then( requiredModules => {
				if ( ! _loadedSections[ sectionDefinition.module ] ) {
					requiredModules.forEach( mod => mod( controller.clientRouter ) ); // if we do array
					_loadedSections[ sectionDefinition.module ] = true;
				}
				return activateSection( sectionDefinition, context, next );
			} )
			.catch( error => {
				console.warn( error );
				if ( ! LoadingError.isRetry() ) {
					LoadingError.retry( sectionDefinition.name );
				} else {
					dispatch( { type: 'SECTION_SET', isLoading: false } );
					LoadingError.show( sectionDefinition.name );
				}
			} );
	} );
}

export const getSections = () => sectionsWithCss;

export const setupRoutes = () => {
	sectionsWithCss.forEach( section =>
		section.paths.forEach( path => createPageDefinition( path, section ) )
	);
};
