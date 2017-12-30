/** @format */

/**
 * Internal dependencies
 */

import { STATUS_READY, STATUS_TIMEOUT, OPERATOR_STATUS_AVAILABLE } from './constants';

/**
 * Returns if olark is ready for use.
 * @param   {Object}  state  Global state tree
 * @returns {Boolean}        true, when olark is ready
 */
export function isOlarkReady( state ) {
	return state.ui.olark.status === STATUS_READY;
}

/**
 * Returns if olark has not loaded in time.
 * @param   {Object}  state  Global state tree
 * @returns {Boolean}        true, when olark hasn't loaded within the timeout
 */
export function isOlarkTimedOut( state ) {
	return state.ui.olark.status === STATUS_TIMEOUT;
}

/**
 * Returns if olark is currently requesting status
 * @param   {Object}  state  Global state tree
 * @returns {Boolean}        true, when olark is requesting
 */
export function isRequestingOlark( state ) {
	return state.ui.olark.requesting;
}

/**
 * Returns if olark chat is available for the given context
 * @param   {Object}  state     Global state tree
 * @param   {object}  context   The chat context to check availability for
 * @returns {Boolean}           true, when olark is requesting
 */
export function isChatAvailable( state, context ) {
	return !! state.ui.olark.availability[ context ];
}

/**
 * Returns if olark operators are available.
 * @param   {Object}  state  Global state tree
 * @returns {Boolean}        true, when olark operators are available
 */
export function isOperatorsAvailable( state ) {
	return state.ui.olark.operatorStatus === OPERATOR_STATUS_AVAILABLE;
}

/**
 * Returns if precancellation chat is available.
 * @param   {Object}  state  Global state tree
 * @returns {Boolean}        true, when precancellation is available
 */
export function isCancellationChatAvailable( state ) {
	return state.ui.olark.availability.precancellation;
}

/**
 * Returns if presales chat is available.
 * @param   {Object}  state  Global state tree
 * @returns {Boolean}        true, when presales is available
 */
export function isPresalesChatAvailable( state ) {
	return state.ui.olark.availability.presale;
}
