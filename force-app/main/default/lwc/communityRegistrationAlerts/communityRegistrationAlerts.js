import { LightningElement, wire, track, api } from "lwc";
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript } from "lightning/platformResourceLoader";
import cometdJS from "@salesforce/resourceUrl/cometd";
import getSessionId from '@salesforce/apex/CommunityRegistrationAlertsCtrl.getSessionId';
import communityUserId from '@salesforce/user/Id';

export default class CommunityRegistrationAlerts extends LightningElement {

	libInitialized = false;
	sessionId;
	userId = communityUserId;
	error;

	hasMessage = false;
	@track messages = [];

	@api subtleMode = false;
	@api subtleModeHeader;
	showPopover = false;

	showDetails = true;
	toggleDetailsLabel = 'Hide';


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
		var cometdlib = new window.org.cometd.CometD();

		// Configure cometD
		cometdlib.configure({
			url: window.location.protocol + '//' + window.location.hostname + '/cometd/54.0/',
			requestHeaders: { Authorization: 'OAuth ' + this.sessionId},
			appendMessageTypeToURL : false,
			logLevel: 'info'
		});

		cometdlib.websocketEnabled = false;

		cometdlib.handshake( (status) => {
					
			if (status.successful) {
				// Subscribe to registration alert channel
				cometdlib.subscribe('/event/Registration_Alert__e', (message) => {
					let msg = message.data.payload;
					if (msg.User_Id__c.substring(0,15) === this.userId.substring(0,15)) {
						if (msg.Show_Toast__c) {
							this.raiseToast(msg);
						}
						this.handleEventAction(msg);	
					}
				});
			} else {
				/// Handshake unsuccessful - alert console
				console.error('Error in handshaking: ' + JSON.stringify(status));
			}
		});
		
	}

	handleEventAction(msg) {
		switch (msg.Action__c) {

			case 'Add' :
				msg.style = this.getMessageStyle(msg.Toast_Variant__c);
				this.messages.push(msg);
				this.hasMessage = true;
				break;

			case 'Update' :
				let hasExisting = false;
				for (let i = 0; i < this.messages.length; i++) {
					if (this.messages[i].Record_Id__c == msg.Record_Id__c) {
						this.messages[i].Message__c = msg.Message__c;
						hasExisting = true;
					}
				}
				if (!hasExisting) {
					msg.style = this.getMessageStyle(msg.Toast_Variant__c);
					this.messages.push(msg);
					this.hasMessage = true;
				}
				break;
				
			case 'Remove' :
				for (let i = 0; i < this.messages.length; i++) {
					if (this.messages[i].Record_Id__c == msg.Record_Id__c) {
						this.messages.splice(i, 1);
					}
				}
				this.hasMessage = this.messages.length > 0 ? true : false;
				break;

			case 'Toast Only' :
				console.log('Toast Only');
				break;

		}

	}

	raiseToast(msg) {
		let toastVariant = msg.Toast_Variant__c != null ? msg.Toast_Variant__c : 'info';
		let toastTitle = msg.Toast_Title__c != null ? msg.Toast_Title__c : 'Alert';
		let toastMessage = msg.Toast_Message__c != null ? msg.Toast_Message__c : '';
		let toastMode = msg.Toast_Mode__c != null ? msg.Toast_Mode__c : 'dismissible';	
		const toastEvent = new ShowToastEvent({
			title: toastTitle,
			message: toastMessage,
			variant: toastVariant,
			mode: toastMode
		});
		this.dispatchEvent(toastEvent);
	}

	getMessageStyle(toastVariant) {
		var style = '';
		switch (toastVariant) {
			case 'success':
				style = 'slds-var-m-around_large slds-text-heading_small';
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

	handleToggleDetails() {
        this.showDetails = !this.showDetails;
        this.toggleDetailsLabel = this.showDetails ? 'Hide' : 'Show';
    }

	handleTogglePopover() {
		this.showPopover = !this.showPopover;
		console.log('show popover is ' + this.showPopover);
	}

}