/** @format */
const config = require( 'config' );
const utils = require( './utils' );

/*
 * This sections-loader has just one responsibility.
 * It takes in a list of sections, and then for each one adds in a new key to the json
 * 'load'. The value for 'load' is a fn that returns the entry point for a section. (or a promise for the entry point)
 *
 * This loader is vital for maintaining the ability to easily switch if code-splitting is on or off.
 * If we ever wanted to get rid of this file we could accomplish the same thing by manually adding the load
 * functions to each section object.
 */

function addModuleImportToSections( { sections, shouldSplit } ) {
	sections.forEach( section => {
		const loaderFunction = ( () => require( /* webpackChunkName: 'CHUNK_NAME' */ section.module ) )
			.toString()
			.replace( 'CHUNK_NAME', section.name )
			.replace( 'section.module', `'${ section.module }'` );

		section.load = shouldSplit ? loaderFunction.replace( 'require', 'import' ) : loaderFunction;
	} );

	// strip the outer quotation marks from the load statement
	const sectionStringsWithImportFns = JSON.stringify( sections, null, '\t' ).replace(
		/load": "(.*)"/g,
		'load": $1'
	);

	const sectionsFile = `module.exports = ${ sectionStringsWithImportFns }`;
	return sectionsFile;
}

function withCss( sections ) {
	return sections.map( section => ( {
		...section,
		...( section.css && {
			css: {
				id: section.css,
				urls: utils.getCssUrls( section.css ),
			},
		} ),
	} ) );
}

const loader = function() {
	const sections = require( this.resourcePath );
	const sectionsWithCss = withCss( sections );

	console.error(
		addModuleImportToSections( {
			sections: sectionsWithCss,
			shouldSplit: config.isEnabled( 'code-splitting' ),
		} )
	);
	return addModuleImportToSections( {
		sections: sectionsWithCss,
		shouldSplit: config.isEnabled( 'code-splitting' ),
	} );
};
loader.addModuleImportToSections = addModuleImportToSections;

module.exports = loader;
