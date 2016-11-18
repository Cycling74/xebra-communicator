import Communicator from "./communicator.js";
import { EventEmitter } from "events";
import isArray from "lodash.isArray";
import { CONNECTION_STATES, XEBRA_VERSION, XEBRA_MESSAGES } from "./constants.js";

const MIRA_FCT_LOOKUP = {
	[XEBRA_MESSAGES.ADD_NODE] : "_addNode",
	[XEBRA_MESSAGES.ADD_PARAM] : "_addParam",
	[XEBRA_MESSAGES.DELETE_NODE] : "_deleteNode",
	[XEBRA_MESSAGES.HANDLE_RESOURCE_DATA] : "_handleResourceData",
	[XEBRA_MESSAGES.HANDLE_RESOURCE_INFO] : "_handleResourceInfo",
	[XEBRA_MESSAGES.INIT_NODE] : "_initNode",
	[XEBRA_MESSAGES.MODIFY_NODE] : "_modifyNode",
	[XEBRA_MESSAGES.RESYNC] : "_resync",
	[XEBRA_MESSAGES.SET_UUID] : "_setXebraUuid",
	[XEBRA_MESSAGES.STATEDUMP] : "_statedump"
};

function generateUuid() {
	let id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
		let r = Math.random() * 16 | 0;
		let v = c === "x" ? r : (r & 0x3 | 0x8);
		return v.toString(16);
	});
	return id;
}

/**
 * @class
 */
class XebraCommunicator extends EventEmitter {

	/**
	 * @param {object} options - TODO
	 */
	constructor(options) {
		super();

		this._supportedObjects = options.supported_objects || {};

		this._uuid = generateUuid();
		this._xebraUuid = null; // server assigned UUID
		this._name = `${options.name || "MiraWeb"}-${this._uuid.slice(0, 6)}`;
		this._sequenceNumber = 0;

		this._communicator = new Communicator(options);
		this._communicator.on("message", this._dispatchMessage.bind(this));

		// Connection States
		this._communicator.on("connection_change", this._onConnectionChange.bind(this));
	}

	/**
	 * @type {number}
	 * @readonly
	 * @see XebraCommunicator.CONNECTION_STATES
	 */
	get connectionState() {
		return this._communicator.connectionState;
	}

	/**
	 * @type {string}
	 */
	get name() {
		return this._name;
	}

	set name(name) {
		this._name = name;
		this._sendMessage("set_client_params", {
			xebraUuid : this._xebraUuid,
			name : this._name,
			uid : this._uuid
		});
		this.emit(XEBRA_MESSAGES.CLIENT_PARAM_CHANGE, "name", this._name);
	}

	/**
	 * @type {string}
	 * @readonly
	 */
	get uuid() {
		return this._uuid;
	}

	/**
	 * @type {string}
	 * @readonly
	 */
	get host() {
		return this._communicator.host;
	}

	/**
	 * @type {number}
	 * @readonly
	 */
	get port() {
		return this._communicator.port;
	}

	/**
	 * @type {string}
	 * @readonly
	 */
	get wsUrl() {
		return this._communicator.url;
	}

	/**
	 * @type {string}
	 * @readonly
	 */
	get xebraUuid() {
		return this._xebraUuid;
	}

	/**
	 * Handle connection change event of the underlying connection
	 * @private
	 */
	_onConnectionChange(status) {
		switch (status) {
			case CONNECTION_STATES.CONNECTED:
				if (!this._xebraUuid) {
					this._sendMessage("register", {
						version : XEBRA_VERSION,
						supported_objects : this._supportedObjects
					});
				} else {
					// resync somehow doesn't work.. For now forcing it
					// this._sendMessage("resync", {
					// 	sequence : this._sequenceNumber
					// });
					this._resync({}, true);
				}
				break;
			case CONNECTION_STATES.INIT:
			case CONNECTION_STATES.CONNECTING:
			case CONNECTION_STATES.CONNECTION_FAIL:
			case CONNECTION_STATES.RECONNECTING:
			case CONNECTION_STATES.DISCONNECTED:
			default:
				// Nothing specific to do here
				break;
		}

		/**
		 * Connection change event
		 * @event XebraCommunicator.connection_change
		 * @param {number} status - The new connection status
		 * @see XebraCommunicator.CONNECTION_STATES
		 */
		this.emit(XEBRA_MESSAGES.CONNECTION_CHANGE, status);
	}

	/**
	 * Request statedump from Max
	 * @private
	 */
	_requestStateDump() {
		this._sendMessage(XEBRA_MESSAGES.STATEDUMP);
	}

	/**
	 * Send Xebra message to Max
	 * @private
	 * @param {string} message - The message type
	 * @param {object} payload - The message payload
	 */
	_sendMessage(msg, payload = {} ) {
		this._communicator.send({
			message : msg,
			payload : payload
		});
	}


	/**
	 * Handle and dispatch received message(s)
	 * @private
	 * @param {object|Array.object} data - the received message(s)
	 */
	_dispatchMessage(data) {
		if (isArray(data)) {
			data.forEach(function(msg) {
				this._handleMessage(msg);
			}.bind(this));
		} else {
			this._handleMessage(data);
		}
	}

	/**
	 * Handle received message
	 * @private
	 * @param {object} data - the received message
	 */
	_handleMessage(data) {
		// ignore echoed messages
		if (data.payload && data.payload.source === this._xebraUuid) return null;

		const fct = this[MIRA_FCT_LOOKUP[data.message]];
		if (fct) return fct.bind(this)(data);
		return null;
	}

	/**
	 * @private
	 * @param {object} data - the message data
	 */
	_addNode(data) {
		this._sequenceNumber = data.payload.sequence;
		/**
		 * ObjectNode add event
		 * @event XebraCommunicator.add_node
		 * @param {object} payload - The ObjectNode add payload
		 */
		this.emit(XEBRA_MESSAGES.ADD_NODE, data.payload);
	}

	/**
	 * @private
	 * @param {object} data - the message data
	 */
	_addParam(data) {
		this._sequenceNumber = data.payload.sequence;
		/**
		 * ParamNode add event
		 * @event XebraCommunicator.add_param
		 * @param {object} payload - The ParamNode add payload
		 */
		this.emit(XEBRA_MESSAGES.ADD_PARAM, data.payload);
	}

	/**
	 * @private
	 * @param {object} data - the message data
	 */
	_deleteNode(data) {
		this._sequenceNumber = data.payload.sequence;
		/**
		 * Delete ObjectNode event
		 * @event XebraCommunicator.delete_node
		 * @param {object} payload - The ObjectNode delete payload
		 */
		this.emit(XEBRA_MESSAGES.DELETE_NODE, data.payload);
	}

	/**
	 * Handle incoming resource data
	 * @private
	 * @param {object} data - the resource data
	 */
	_handleResourceData(data) {
		let j;
		try {
			j = JSON.parse(data.payload.request);
			data.payload.request = j;
		} catch (e) {
			console.log("JSON parsing error", e);
			console.log(data.payload.request);
			return;
		}
		/**
		 * Handle resource data event
		 * @event XebraCommunicator.handle_resource_data
		 * @param {object} payload - The Resource payload
		 */
		this.emit(XEBRA_MESSAGES.HANDLE_RESOURCE_DATA, data.payload);
	}

	/**
	 * Handle incoming resource info
	 * @private
	 * @param {object} data - the resource info
	 */
	_handleResourceInfo(data) {
		let j;
		try {
			j = JSON.parse(data.payload.request);
			data.payload.request = j;
		} catch (e) {
			console.log("JSON parsing error", e);
			console.log(data.payload.request);
			return;
		}
		/**
		 * Handle resource info event
		 * @event XebraCommunicator.handle_resource_info
		 * @param {object} payload - The Resource info payload
		 */
		this.emit(XEBRA_MESSAGES.HANDLE_RESOURCE_INFO, data.payload);
	}

	/**
	 * Handle incoming init node data
	 * @private
	 * @param {object} data - the node data
	 */
	_initNode(data) {
		/**
		 * Init Node event
		 * @event XebraCommunicator.init_node
		 * @param {object} payload - The Node init payload
		 */
		this.emit(XEBRA_MESSAGES.INIT_NODE, data.payload);
	}

	/**
	 * Handle incoming node modification data
	 */
	_modifyNode(data) {
		// ignore modification messages if the were actually sent by ourselves
		if (data.payload.source === this._xebraUuid) return;
		/**
		 * Modify Node event
		 * @event XebraCommunicator.modify_node
		 * @param {object} payload - The Node modify payload
		 */
		this.emit(XEBRA_MESSAGES.MODIFY_NODE, data.payload);
	}

	/**
	 * Handle resync method call
	 * @param {object} data - The Resync data
	 * @param {boolean} [force=false] - Force a resync
	 */
	_resync(data, force = false) {
		if (force || data.payload.sequence !== this._sequenceNumber) {
			this.emit(XEBRA_MESSAGES.RESYNC);
			this._requestStateDump();
		}

		if (data && data.payload && data.payload.sequence) this._sequenceNumber = data.payload.sequence;
	}

	/**
	 * Handle UUID settings assigned by Xebra Server
	 * @private
	 * @param {object} data - Meta Info data
	 *
	 */
	_setXebraUuid(data) {
		this._xebraUuid = data.payload.uuid;
		this.emit(XEBRA_MESSAGES.CLIENT_PARAM_CHANGE, "uuid", this._xebraUuid);
		this._requestStateDump();
		this._sendMessage("set_client_params", {
			xebraUuid : this._xebraUuid,
			name : this._name,
			uid : this._uuid
		});
	}

	/**
	 * Handle received statedump
	 * @param {object} data - The statedump data
	 */
	_statedump(data) {
		/**
		 * Statedump Event
		 * @event XebraCommunicator.statedump
		 * @param {object} payload - The statedump payload
		 */
		this.emit(XEBRA_MESSAGES.STATEDUMP, data.payload);
	}

	/**
	 * Connect the Communicator to Xebra Server
	 */
	connect() {
		this._communicator.connect();
	}

	/**
	 * Close the connection to the XebraServer
	 */
	close() {
		this._communicator.close();
	}

	/**
	 * Request ResourceData from XebraServer
	 * @param {object} data - Object describing/identifying the needed resource data
	 */
	getResourceData(data) {
		this._sendMessage("get_resource_data", data);
	}

	/**
	 * Request ResourceInfo from XebraServer
	 * @param {object} data - Object describing/identifying the needed resource info
	 */
	getResourceInfo(data) {
		this._sendMessage("get_resource_info", data);
	}

	/**
	 * Send a Modification Message to XebraServer
	 * @param {object} data - The modification message payload
	 */
	sendModifyMessage(data) {
		data.source = this._xebraUuid;
		data.timestamp = Date.now();
		this._sendMessage("modify_node", data);
	}
}

XebraCommunicator.XEBRA_MESSAGES = XEBRA_MESSAGES;
XebraCommunicator.CONNECTION_STATES = CONNECTION_STATES;
XebraCommunicator.XEBRA_VERSION = XEBRA_VERSION;

export default XebraCommunicator;
