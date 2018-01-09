/** @format */
/**
 * External dependencies
 */
import config from 'config';
import page from 'page';
import { find, groupBy, toPairs, partial, escapeRegExp } from 'lodash';

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

import sections from './sections';

const sectionsWithCss = sections.map( section => ( {
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
	const section = find( sections, { name: sectionName } );
	if ( ! section ) {
		return Promise.reject( `Attempting to load non-existent section: ${ sectionName }` );
	}

	// if ( async ) {
	const chunk = moduleToImport[ section.module ];
	return chunk;
	// }

	// @TODO: get non-async mode working
	// return require( section.module );
}

const moduleToImport = {
	'jetpack-connect': import( /* webpackChunkName: "'jetpack-connect'" */ 'jetpack-connect' ),
	'jetpack-onboarding': import( /* webpackChunkName: "'jetpack-onboarding'" */ 'jetpack-onboarding' ),
	'mailing-lists': import( /* webpackChunkName: "'mailing-lists'" */ 'mailing-lists' ),
	me: import( /* webpackChunkName: "'me'" */ 'me' ),
	'me/account': import( /* webpackChunkName: "'me/account'" */ 'me/account' ),
	'me/concierge': import( /* webpackChunkName: "'me/concierge'" */ 'me/concierge' ),
	'me/notification-settings': import( /* webpackChunkName: "'me/notification-settings'" */ 'me/notification-settings' ),
	'me/purchases': import( /* webpackChunkName: "'me/purchases'" */ 'me/purchases' ),
	'me/security': import( /* webpackChunkName: "'me/security'" */ 'me/security' ),
	'my-sites': import( /* webpackChunkName: "'my-sites'" */ 'my-sites' ),
	'my-sites/ads': import( /* webpackChunkName: "'my-sites/ads'" */ 'my-sites/ads' ),
	'my-sites/checklist': import( /* webpackChunkName: "'my-sites/checklist'" */ 'my-sites/checklist' ),
	'my-sites/checkout': import( /* webpackChunkName: "'my-sites/checkout'" */ 'my-sites/checkout' ),
	'my-sites/customize': import( /* webpackChunkName: "'my-sites/customize'" */ 'my-sites/customize' ),
	'my-sites/domains': import( /* webpackChunkName: "'my-sites/domains'" */ 'my-sites/domains' ),
	'my-sites/invites': import( /* webpackChunkName: "'my-sites/invites'" */ 'my-sites/invites' ),
	'my-sites/media': import( /* webpackChunkName: "'my-sites/media'" */ 'my-sites/media' ),
	'my-sites/pages': import( /* webpackChunkName: "'my-sites/pages'" */ 'my-sites/pages' ),
	'my-sites/paladin': import( /* webpackChunkName: "'my-sites/paladin'" */ 'my-sites/paladin' ),
	'my-sites/people': import( /* webpackChunkName: "'my-sites/people'" */ 'my-sites/people' ),
	'my-sites/plans': import( /* webpackChunkName: "'my-sites/plans'" */ 'my-sites/plans' ),
	'my-sites/plugins': import( /* webpackChunkName: "'my-sites/plugins'" */ 'my-sites/plugins' ),
	'my-sites/posts': import( /* webpackChunkName: "'my-sites/posts'" */ 'my-sites/posts' ),
	'my-sites/sharing': import( /* webpackChunkName: "'my-sites/sharing'" */ 'my-sites/sharing' ),
	'my-sites/site-settings': import( /* webpackChunkName: "'my-sites/site-settings'" */ 'my-sites/site-settings' ),
	'my-sites/site-settings/settings-discussion': import( /* webpackChunkName: "'my-sites/site-settings/settings-discussion'" */ 'my-sites/site-settings/settings-discussion' ),
	'my-sites/site-settings/settings-security': import( /* webpackChunkName: "'my-sites/site-settings/settings-security'" */ 'my-sites/site-settings/settings-security' ),
	'my-sites/site-settings/settings-traffic': import( /* webpackChunkName: "'my-sites/site-settings/settings-traffic'" */ 'my-sites/site-settings/settings-traffic' ),
	'my-sites/site-settings/settings-writing': import( /* webpackChunkName: "'my-sites/site-settings/settings-writing'" */ 'my-sites/site-settings/settings-writing' ),
	'my-sites/stats': import( /* webpackChunkName: "'my-sites/stats'" */ 'my-sites/stats' ),
	'my-sites/theme': import( /* webpackChunkName: "'my-sites/theme'" */ 'my-sites/theme' ),
	'my-sites/themes': import( /* webpackChunkName: "'my-sites/themes'" */ 'my-sites/themes' ),
	signup: import( /* webpackChunkName: "'signup'" */ 'signup' ),
	'account-recovery': import( /* webpackChunkName: "'account-recovery'" */ 'account-recovery' ),
	auth: import( /* webpackChunkName: "'auth'" */ 'auth' ),
	login: import( /* webpackChunkName: "'login'" */ 'login' ),
	'me/happychat': import( /* webpackChunkName: "'me/happychat'" */ 'me/happychat' ),
	'me/help': import( /* webpackChunkName: "'me/help'" */ 'me/help' ),
	'my-sites/comments': import( /* webpackChunkName: "'my-sites/comments'" */ 'my-sites/comments' ),
	'my-sites/domains/domain-management/domain-connect': import( /* webpackChunkName: "'my-sites/domains/domain-management/domain-connect'" */ 'my-sites/domains/domain-management/domain-connect' ),
	'my-sites/preview': import( /* webpackChunkName: "'my-sites/preview'" */ 'my-sites/preview' ),
	'my-sites/types': import( /* webpackChunkName: "'my-sites/types'" */ 'my-sites/types' ),
	'post-editor': import( /* webpackChunkName: "'post-editor'" */ 'post-editor' ),
	reader: import( /* webpackChunkName: "'reader'" */ 'reader' ),
	'reader/conversations': import( /* webpackChunkName: "'reader/conversations'" */ 'reader/conversations' ),
	'reader/discover': import( /* webpackChunkName: "'reader/discover'" */ 'reader/discover' ),
	'reader/following': import( /* webpackChunkName: "'reader/following'" */ 'reader/following' ),
	'reader/full-post': import( /* webpackChunkName: "'reader/full-post'" */ 'reader/full-post' ),
	'reader/liked-stream': import( /* webpackChunkName: "'reader/liked-stream'" */ 'reader/liked-stream' ),
	'reader/list': import( /* webpackChunkName: "'reader/list'" */ 'reader/list' ),
	'reader/recommendations': import( /* webpackChunkName: "'reader/recommendations'" */ 'reader/recommendations' ),
	'reader/search': import( /* webpackChunkName: "'reader/search'" */ 'reader/search' ),
	'reader/tag-stream': import( /* webpackChunkName: "'reader/tag-stream'" */ 'reader/tag-stream' ),
};

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
					requiredModules( controller.clientRouter );
					// requiredModules.forEach( mod => mod( controller.clientRouter ) ); // if we do array
					_loadedSections[ sectionDefinition.module ] = true;
				}
				return activateSection( sectionDefinition, context, next );
			} )
			.catch( error => {
				if ( ! LoadingError.isRetry() ) {
					console.warn( error );
					LoadingError.retry( sectionDefinition.name );
				} else {
					console.error( error );
					dispatch( { type: 'SECTION_SET', isLoading: false } );
					LoadingError.show( sectionDefinition.name );
				}
			} );
	} );
}

export default {
	get: () => sections,
	load: () => {
		sections.forEach( section =>
			section.paths.forEach( path => createPageDefinition( path, section ) )
		);
	},
};
