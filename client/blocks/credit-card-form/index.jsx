/** @format */
/**
 * External dependencies
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { localize } from 'i18n-calypso';
import Gridicon from 'gridicons';

/**
 * Internal Dependencies
 */
import { camelCase, forOwn, kebabCase, mapKeys, values } from 'lodash';
import Card from 'components/card';
import CompactCard from 'components/card/compact';
import CreditCardFormFields from 'components/credit-card-form-fields';
import { forPayments as countriesList } from 'lib/countries-list';
import FormButton from 'components/forms/form-button';
import formState from 'lib/form-state';
import notices from 'notices';
import { validateCardDetails } from 'lib/credit-card-details';
import ValidationErrorList from 'notices/validation-error-list';
import wpcomFactory from 'lib/wp';
import support from 'lib/url/support';

const wpcom = wpcomFactory.undocumented();

class CreditCardForm extends Component {
	static displayName = 'CreditCardForm';

	static propTypes = {
		apiParams: PropTypes.object,
		createCardToken: PropTypes.func.isRequired,
		initialValues: PropTypes.object,
		recordFormSubmitEvent: PropTypes.func.isRequired,
		saveStoredCard: PropTypes.func,
		successCallback: PropTypes.func.isRequired,
		showUsedForExistingPurchasesInfo: PropTypes.bool,
	};

	constructor( props ) {
		super( props );

		this.state = {
			form: null,
			formSubmitting: false,
			notice: null,
		};

		this.fieldNames = [
			'name',
			'number',
			'cvv',
			'expirationDate',
			'country',
			'postalCode',
			'streetNumber',
			'address1',
			'address2',
			'phoneNumber',
			'streetNumber',
			'city',
			'state',
			'document',
		];
	}

	componentWillMount() {
		const fields = this.fieldNames.reduce( ( result, fieldName ) => {
			return { ...result, [ fieldName ]: '' };
		}, {} );

		if ( this.props.initialValues ) {
			fields.name = this.props.initialValues.name;
		}

		this.formStateController = formState.Controller( {
			initialFields: fields,
			onNewState: this.setFormState,
			validatorFunction: this.validate,
		} );

		this.setState( {
			form: this.formStateController.getInitialState(),
		} );
	}

	storeForm = ref => ( this.form = ref );

	validate = ( formValues, onComplete ) => {
		if ( ! this.form ) {
			return;
		}

		onComplete( null, this.getValidationErrors() );
	};

	setFormState = form => {
		if ( ! this.form ) {
			return;
		}

		this.setState( {
			form,
		} );
	};

	onFieldChange = rawDetails => {
		// Maps params from CreditCardFormFields component to work with formState.
		forOwn( rawDetails, ( value, name ) => {
			this.formStateController.handleFieldChange( {
				name,
				value,
			} );
		} );
	};

	onSubmit = event => {
		event.preventDefault();

		if ( this.state.formSubmitting ) {
			return;
		}

		this.setState( { formSubmitting: true } );

		this.formStateController.handleSubmit( hasErrors => {
			if ( hasErrors ) {
				this.setState( { formSubmitting: false } );
				return;
			}

			this.props.recordFormSubmitEvent();

			this.saveCreditCard();
		} );
	};

	saveCreditCard() {
		const cardDetails = this.getCardDetails();

		this.props.createCardToken( cardDetails, ( gatewayError, gatewayData ) => {
			if ( ! this.form ) {
				return;
			}

			if ( gatewayError ) {
				this.setState( { formSubmitting: false } );
				notices.error( gatewayError.message );
				return;
			}

			if ( this.props.saveStoredCard ) {
				this.props
					.saveStoredCard( gatewayData )
					.then( () => {
						notices.success( this.props.translate( 'Card added successfully' ), {
							persistent: true,
						} );

						this.props.successCallback();
					} )
					.catch( ( { message } ) => {
						if ( this.form ) {
							this.setState( { formSubmitting: false } );
						}

						if ( typeof message === 'object' ) {
							notices.error( <ValidationErrorList messages={ values( message ) } /> );
						} else {
							notices.error( message );
						}
					} );
			} else {
				const apiParams = this.getParamsForApi(
					cardDetails,
					gatewayData.token,
					this.props.apiParams
				);

				wpcom.updateCreditCard( apiParams, ( apiError, response ) => {
					if ( apiError ) {
						if ( this.form ) {
							this.setState( { formSubmitting: false } );
						}
						notices.error( apiError.message );
						return;
					}

					if ( response.error ) {
						if ( this.form ) {
							this.setState( { formSubmitting: false } );
						}
						notices.error( response.error );
						return;
					}

					notices.success( response.success, {
						persistent: true,
					} );

					this.props.successCallback();
				} );
			}
		} );
	}

	getParamsForApi( cardDetails, cardToken, extraParams = {} ) {
		return {
			...extraParams,
			country: cardDetails.country,
			zip: cardDetails[ 'postal-code' ],
			month: cardDetails[ 'expiration-date' ].split( '/' )[ 0 ],
			year: cardDetails[ 'expiration-date' ].split( '/' )[ 1 ],
			name: cardDetails.name,
			document: cardDetails.document,
			street_number: cardDetails[ 'street-number' ],
			address_1: cardDetails[ 'address-1' ],
			address_2: cardDetails[ 'address-2' ],
			city: cardDetails.city,
			state: cardDetails.state,
			phone_number: cardDetails[ 'phone-number' ],
			cardToken,
		};
	}

	isFieldInvalid = name => {
		return formState.isFieldInvalid( this.state.form, name );
	};

	getValidationErrors() {
		const validationResult = validateCardDetails( this.getCardDetails() );

		// Maps keys from credit card validator to work with formState.
		return mapKeys( validationResult.errors, ( value, key ) => {
			return camelCase( key );
		} );
	}

	getCardDetails() {
		// Maps keys from formState to work with CreditCardFormFields component and credit card validator.
		return mapKeys( formState.getAllFieldValues( this.state.form ), ( value, key ) => {
			return kebabCase( key );
		} );
	}

	render() {
		return (
			<form onSubmit={ this.onSubmit } ref={ this.storeForm }>
				<Card className="credit-card-form__content">
					<CreditCardFormFields
						card={ this.getCardDetails() }
						countriesList={ countriesList }
						eventFormName="Edit Card Details Form"
						isFieldInvalid={ this.isFieldInvalid }
						onFieldChange={ this.onFieldChange }
					/>
					<div className="credit-card-form__card-terms">
						<Gridicon icon="info-outline" size={ 18 } />
						<p>
							{ this.props.translate(
								'By saving a credit card, you agree to our {{tosLink}}Terms of Service{{/tosLink}}, and if ' +
									'you use it to pay for a subscription or plan, you authorize your credit card to be charged ' +
									'on a recurring basis until you cancel, which you can do at any time. ' +
									'You understand {{autoRenewalSupportPage}}how your subscription works{{/autoRenewalSupportPage}} ' +
									'and {{managePurchasesSupportPage}}how to cancel{{/managePurchasesSupportPage}}.',
								{
									components: {
										tosLink: (
											<a href="//wordpress.com/tos/" target="_blank" rel="noopener noreferrer" />
										),
										autoRenewalSupportPage: (
											<a href={ support.AUTO_RENEWAL } target="_blank" rel="noopener noreferrer" />
										),
										managePurchasesSupportPage: (
											<a
												href={ support.MANAGE_PURCHASES }
												target="_blank"
												rel="noopener noreferrer"
											/>
										),
									},
								}
							) }
						</p>
					</div>
					{ this.renderUsedForExistingPurchases() }
				</Card>

				<CompactCard className="credit-card-form__footer">
					<em>{ this.props.translate( 'All fields required' ) }</em>

					<FormButton disabled={ this.state.formSubmitting } type="submit">
						{ this.state.formSubmitting
							? this.props.translate( 'Saving Card…', {
									context: 'Button label',
									comment: 'Credit card',
								} )
							: this.props.translate( 'Save Card', {
									context: 'Button label',
									comment: 'Credit card',
								} ) }
					</FormButton>
				</CompactCard>
			</form>
		);
	}

	renderUsedForExistingPurchases() {
		if ( this.props.showUsedForExistingPurchasesInfo ) {
			return (
				<div className="credit-card-form__card-terms">
					<Gridicon icon="info-outline" size={ 18 } />
					<p>
						{ this.props.translate(
							'This card will be used for future renewals of existing purchases.'
						) }
					</p>
				</div>
			);
		}
	}
}

export default localize( CreditCardForm );
