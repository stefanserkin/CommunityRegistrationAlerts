import { LightningElement, wire, track } from "lwc";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from "lightning/platformResourceLoader";
import cometdJS from "@salesforce/resourceUrl/cometd";
import getSessionId from '@salesforce/apex/CommunityRegistrationAlertsCtrl.getSessionId';

export default class CommunityRegistrationAlerts extends LightningElement {

	libInitialized = false;
	sessionId;
	error;

	hasMessage = false;
	@track messages = [];

	@wire(getSessionId)
	wiredSessionId({ error, data }) {
		if (data) {
			this.sessionId = data;
			this.error = undefined;
			loadScript(this, cometdJS)
			.then(() => {
				this.initializecometd()
			});
		} else if (error) {
			console.log(error);
			this.error = error;
			this.sessionId = undefined;
		}
	}

	initializecometd() {

		if (this.libInitialized) {
			return;
		}

		this.libInitialized = true;

		// Initializing cometD object/class
		var cometdlib = new window.org.cometd.CometD();

		// Calling configure method of cometD class, to setup authentication which will be used in handshaking
		cometdlib.configure({
			url: window.location.protocol + '//' + window.location.hostname + '/cometd/54.0/',
			requestHeaders: { Authorization: 'OAuth ' + this.sessionId},
			appendMessageTypeToURL : false,
			logLevel: 'info'
		});

		cometdlib.websocketEnabled = false;

		cometdlib.handshake( (status) => {
					
			if (status.successful) {
				// Successfully connected to the server
				// Now it is possible to subscribe or send messages
				cometdlib.subscribe('/event/Registration_Alert__e', (message) => {
					let msg = message.data.payload;
					let toastVariant = msg.Variant__c != null ? msg.Variant__c : 'info';
					let toastTitle = msg.Title__c != null ? msg.Title__c : 'Alert';
					let toastMessage = msg.Message__c != null ? msg.Message__c : '';
					// Toast message
					if (msg.Show_Toast__c) {
						const toastEvent = new ShowToastEvent({
							title: toastTitle,
							message: toastMessage,
							variant: toastVariant,
							mode: 'dismissable'
						});
						this.dispatchEvent(toastEvent);
					}
					// Set style
					if (msg.Action__c === 'Add') {
						// Set style
						msg.style = this.getMessageStyle(msg);
						// Add alert
						this.messages.push(msg);
						this.hasMessage = true;
					} else if (msg.Action__c === 'Remove') {
						for (let i = 0; i < this.messages.length; i++) {
							if (this.messages[i].Record_Id__c == msg.Record_Id__c) {
								this.messages.splice(i, 1);
							}
						}
						this.hasMessage = this.messages.length > 0 ? true : false;
					}
				});
			} else {
				/// Cannot handshake with the server, alert console
				console.error('Error in handshaking: ' + JSON.stringify(status));
			}
		});
	}

	getMessageStyle(msg) {
		var style = '';
		switch (msg.Variant__c) {
			case 'success':
				style = 'slds-var-m-around_large slds-text-color_success slds-text-heading_small';
				break;
			case 'error':
				style = 'slds-var-m-around_large slds-text-color_error slds-text-heading_small';
				break;
			case 'warning':
				style = 'slds-var-m-around_large slds-text-color_error slds-text-heading_small';
				break;
			case 'info':
				style = 'slds-var-m-around_large slds-text-heading_small';
				break;
			default:
				style = 'slds-var-m-around_large slds-text-heading_small';
		}
		return style;
	}


}