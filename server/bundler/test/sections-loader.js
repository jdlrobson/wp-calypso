/** @format */

/**
 * Internal dependencies
 */
import loader from '../sections-loader';
const addModuleImportToSections = loader.addModuleImportToSections;

describe( 'sections-loader tests', () => {
	test( 'should insert a load fn to each section using import() if code splitting is turned on', () => {
		const sections = [
			{
				name: 'moduleName',
				module: 'module-to-require',
			},
		];

		const expected = `module.exports = [
	{
		"name": "moduleName",
		"module": "module-to-require",
		"load": function () {return import( /* webpackChunkName: 'moduleName' */'module-to-require');}
	}
]`;
		expect( addModuleImportToSections( { sections, shouldSplit: true } ) ).toBe( expected );
	} );

	test( 'should insert a load fn to a section using require() if code splitting is turned off', () => {
		const sections = [
			{
				name: 'moduleName',
				module: 'module-to-require',
			},
		];

		const expected = `module.exports = [
	{
		"name": "moduleName",
		"module": "module-to-require",
		"load": function () {return require( /* webpackChunkName: 'moduleName' */'module-to-require');}
	}
]`;
		expect( addModuleImportToSections( { sections, shouldSplit: false } ) ).toBe( expected );
	} );
} );
