/** @format */

/**
 * External dependencies
 */

import { forOwn, get, reduce, isArray, map, flatten } from 'lodash';
import i18n from 'i18n-calypso';

/**
 * Internal dependencies
 */
import treeSelect from 'lib/create-cached-selector';
import { getSerializedStatsQuery, normalizers, buildExportArray } from './utils';
import { getSite } from 'state/sites/selectors';

/**
 * Returns true if currently requesting stats for the statType and query combo, or false
 * otherwise.
 *
 * @param  {Object}  state    Global state tree
 * @param  {Number}  siteId   Site ID
 * @param  {String}  statType Type of stat
 * @param  {Object}  query    Stats query object
 * @return {Boolean}          Whether stats are being requested
 */
export function isRequestingSiteStatsForQuery( state, siteId, statType, query ) {
	const serializedQuery = getSerializedStatsQuery( query );
	return !! get( state.stats.lists.requests, [ siteId, statType, serializedQuery, 'requesting' ] );
}

/**
 * Returns true if the stats request for the statType and query combo has failed, or false
 * otherwise.
 *
 * @param  {Object}  state    Global state tree
 * @param  {Number}  siteId   Site ID
 * @param  {String}  statType Type of stat
 * @param  {Object}  query    Stats query object
 * @return {Boolean}          Whether stats are being requested
 */
export function hasSiteStatsQueryFailed( state, siteId, statType, query ) {
	const serializedQuery = getSerializedStatsQuery( query );
	return (
		get( state.stats.lists.requests, [ siteId, statType, serializedQuery, 'status' ] ) === 'error'
	);
}

/**
 * Returns object of stats data for the statType and query combo, or null if no stats have been
 * received.
 *
 * @param  {Object}  state    Global state tree
 * @param  {Number}  siteId   Site ID
 * @param  {String}  statType Type of stat
 * @param  {Object}  query    Stats query object
 * @return {?Object}           Data for the query
 */
export function getSiteStatsForQuery( state, siteId, statType, query ) {
	if ( typeof query === 'string' ) {
		return get( state.stats.lists.items, [ siteId, statType, query ], null );
	}
	const serializedQuery = getSerializedStatsQuery( query );
	return get( state.stats.lists.items, [ siteId, statType, serializedQuery ], null );
}

function withSerializedQuery( selector, argNum ) {
	return ( ...args ) => {
		const newArgs = [ ...args ];
		newArgs[ argNum + 1 ] = getSerializedStatsQuery( args[ argNum + 1 ] );
		return selector( ...newArgs );
	};
}

/**
 * Returns a parsed object of statsStreak data for a given query, or default "empty" object
 * if no statsStreak data has been received for that site.
 *
 * @param  {Object}  state    			Global state tree
 * @param  {Number}  siteId   			Site ID
 * @param  {Object}  query    			Stats query object
 * @param  {?Number} query.gmtOffset    GMT offset of the queried site
 * @return {Object}           			Parsed Data for the query
 */
export const getSiteStatsPostStreakData = withSerializedQuery(
	treeSelect(
		( { streakData }, siteId, query ) => {
			const gmtOffset = query.gmtOffset || 0;
			const response = {};
			// ensure streakData.data exists and it is not an array
			if ( streakData && streakData.data && ! isArray( streakData.data ) ) {
				Object.keys( streakData.data ).forEach( timestamp => {
					const postDay = i18n.moment.unix( timestamp ).locale( 'en' );
					const datestamp = postDay.utcOffset( gmtOffset ).format( 'YYYY-MM-DD' );

					if ( 'undefined' === typeof response[ datestamp ] ) {
						response[ datestamp ] = 0;
					}

					response[ datestamp ] += streakData.data[ timestamp ];
				} );
			}

			return response;
		},
		( state, siteId, query ) => ( {
			streakData: getSiteStatsForQuery( state, siteId, 'statsStreak', query ),
		} ),
		( state, siteId, query ) => {
			const serializedQuery = getSerializedStatsQuery( query );
			return [ siteId, 'statsStreak', serializedQuery ].join();
		}
	),
	2
);

/**
 * Returns a number representing the most posts made during a day for a given query
 *
 * @param  {Object}  state    Global state tree
 * @param  {Number}  siteId   Site ID
 * @param  {Object}  query    Stats query object
 * @return {?Number}          Max number of posts by day
 */
export const getSiteStatsMaxPostsByDay = withSerializedQuery(
	treeSelect(
		( { postStreakData } ) => {
			let max = 0;

			forOwn( postStreakData, count => {
				if ( count > max ) {
					max = count;
				}
			} );

			return max || null;
		},
		( state, siteId, query ) => ( {
			postStreakData: getSiteStatsForQuery( state, siteId, 'statsStreak', query ),
		} ),
		( state, siteId, query ) => {
			const serializedQuery = getSerializedStatsQuery( query );
			return [ siteId, 'statsStreakMax', serializedQuery ].join();
		}
	),
	2
);

/**
 * Returns the total number of posts per streak data for a query
 *
 * @param  {Object}  state    Global state tree
 * @param  {Number}  siteId   Site ID
 * @param  {Object}  query    Stats query object
 * @return {?Number}          Max number of posts by day
 */
export const getSiteStatsTotalPostsForStreakQuery = withSerializedQuery(
	treeSelect(
		( { postStreakData } ) => {
			return reduce(
				postStreakData,
				( posts, sum ) => {
					return sum + posts;
				},
				0
			);
		},
		( state, siteId, query ) => ( {
			postStreakData: getSiteStatsPostStreakData( state, siteId, query ),
		} ),

		( state, siteId, query ) => {
			const serializedQuery = getSerializedStatsQuery( query );
			return [ siteId, 'statsStreakMax', serializedQuery ].join();
		}
	),
	2
);

/**
 * Returns a number representing the posts made during a day for a given query
 *
 * @param  {Object}  state  Global state tree
 * @param  {Number}  siteId Site ID
 * @param  {Object}  query  Stats query object
 * @param  {String}  date   Date in YYYY-MM-DD format
 * @return {?Number}        Number of posts made on date
 */
export function getSiteStatsPostsCountByDay( state, siteId, query, date ) {
	const data = getSiteStatsPostStreakData( state, siteId, query );
	return data[ date ] || null;
}

/**
 * Returns normalized stats data for a given query and stat type, or the un-normalized response
 * from the API if no normalizer method for that stats type exists in ./utils
 *
 * @param  {Object}  state    Global state tree
 * @param  {Number}  siteId   Site ID
 * @param  {String}  statType Type of stat
 * @param  {Object}  query    Stats query object
 * @return {*}                Normalized Data for the query, typically an array or object
 */
export const getSiteStatsNormalizedData = withSerializedQuery(
	treeSelect(
		( { siteStats, site }, siteId, statType, query ) => {
			if ( 'function' === typeof normalizers[ statType ] ) {
				return normalizers[ statType ].call( this, siteStats, query, siteId, site );
			}
			return siteStats;
		},
		( state, siteId, statType, query ) => {
			return {
				siteStats: getSiteStatsForQuery( state, siteId, statType, query ),
				site: getSite( state, siteId ),
			};
		},
		( state, siteId, statType, query ) => {
			const serializedQuery = getSerializedStatsQuery( query );
			return [ siteId, statType, serializedQuery ].join();
		}
	),
	2
);

/**
 * Returns an array of stats data ready for csv export
 *
 * @param  {Object}  state    Global state tree
 * @param  {Number}  siteId   Site ID
 * @param  {String}  statType Type of stat
 * @param  {Object}  query    Stats query object
 * @return {Array}            Array of stats data ready for CSV export
 */
export function getSiteStatsCSVData( state, siteId, statType, query ) {
	const data = getSiteStatsNormalizedData( state, siteId, statType, query );
	if ( ! data || ! isArray( data ) ) {
		return [];
	}

	return flatten(
		map( data, item => {
			return buildExportArray( item );
		} )
	);
}
