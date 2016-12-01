"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _MIRA_FCT_LOOKUP;

var _communicator = require("./communicator.js");

var _communicator2 = _interopRequireDefault(_communicator);

var _events = require("events");

var _constants = require("./constants.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var MIRA_FCT_LOOKUP = (_MIRA_FCT_LOOKUP = {}, _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.ADD_NODE, "_addNode"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.ADD_PARAM, "_addParam"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.DELETE_NODE, "_deleteNode"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.HANDLE_RESOURCE_DATA, "_handleResourceData"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.HANDLE_RESOURCE_INFO, "_handleResourceInfo"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.INIT_NODE, "_initNode"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.MODIFY_NODE, "_modifyNode"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.RESYNC, "_resync"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.SET_UUID, "_setXebraUuid"), _defineProperty(_MIRA_FCT_LOOKUP, _constants.XEBRA_MESSAGES.STATEDUMP, "_statedump"), _MIRA_FCT_LOOKUP);

function generateUuid() {
	var id = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
		var r = Math.random() * 16 | 0;
		var v = c === "x" ? r : r & 0x3 | 0x8;
		return v.toString(16);
	});
	return id;
}

/**
 * @class
 */

var XebraCommunicator = function (_EventEmitter) {
	_inherits(XebraCommunicator, _EventEmitter);

	/**
  * @param {object} options - TODO
  */
	function XebraCommunicator(options) {
		_classCallCheck(this, XebraCommunicator);

		var _this = _possibleConstructorReturn(this, (XebraCommunicator.__proto__ || Object.getPrototypeOf(XebraCommunicator)).call(this));

		_this._supportedObjects = options.supported_objects || {};

		_this._uuid = generateUuid();
		_this._xebraUuid = null; // server assigned UUID
		_this._name = (options.name || "MiraWeb") + "-" + _this._uuid.slice(0, 6);
		_this._sequenceNumber = 0;

		_this._communicator = new _communicator2.default(options);
		_this._communicator.on("message", _this._dispatchMessage.bind(_this));

		// Connection States
		_this._communicator.on("connection_change", _this._onConnectionChange.bind(_this));
		return _this;
	}

	/**
  * @type {number}
  * @readonly
  * @see XebraCommunicator.CONNECTION_STATES
  */


	_createClass(XebraCommunicator, [{
		key: "_onConnectionChange",


		/**
   * Handle connection change event of the underlying connection
   * @private
   */
		value: function _onConnectionChange(status) {
			switch (status) {
				case _constants.CONNECTION_STATES.CONNECTED:
					if (!this._xebraUuid) {
						this._sendMessage("register", {
							version: _constants.XEBRA_VERSION,
							supported_objects: this._supportedObjects
						});
					} else {
						// resync somehow doesn't work.. For now forcing it
						// this._sendMessage("resync", {
						// 	sequence : this._sequenceNumber
						// });
						this._resync({}, true);
					}
					break;
				case _constants.CONNECTION_STATES.INIT:
				case _constants.CONNECTION_STATES.CONNECTING:
				case _constants.CONNECTION_STATES.CONNECTION_FAIL:
				case _constants.CONNECTION_STATES.RECONNECTING:
				case _constants.CONNECTION_STATES.DISCONNECTED:
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
			this.emit(_constants.XEBRA_MESSAGES.CONNECTION_CHANGE, status);
		}

		/**
   * Request statedump from Max
   * @private
   */

	}, {
		key: "_requestStateDump",
		value: function _requestStateDump() {
			this._sendMessage(_constants.XEBRA_MESSAGES.STATEDUMP);
		}

		/**
   * Send Xebra message to Max
   * @private
   * @param {string} message - The message type
   * @param {object} payload - The message payload
   */

	}, {
		key: "_sendMessage",
		value: function _sendMessage(msg) {
			var payload = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

			this._communicator.send({
				message: msg,
				payload: payload
			});
		}

		/**
   * Handle and dispatch received message(s)
   * @private
   * @param {object|Array.object} data - the received message(s)
   */

	}, {
		key: "_dispatchMessage",
		value: function _dispatchMessage(data) {
			if (Array.isArray(data)) {
				data.forEach(function (msg) {
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

	}, {
		key: "_handleMessage",
		value: function _handleMessage(data) {
			// ignore echoed messages
			if (data.payload && data.payload.source === this._xebraUuid) return null;

			var fct = this[MIRA_FCT_LOOKUP[data.message]];
			if (fct) return fct.bind(this)(data);
			return null;
		}

		/**
   * @private
   * @param {object} data - the message data
   */

	}, {
		key: "_addNode",
		value: function _addNode(data) {
			this._sequenceNumber = data.payload.sequence;
			/**
    * ObjectNode add event
    * @event XebraCommunicator.add_node
    * @param {object} payload - The ObjectNode add payload
    */
			this.emit(_constants.XEBRA_MESSAGES.ADD_NODE, data.payload);
		}

		/**
   * @private
   * @param {object} data - the message data
   */

	}, {
		key: "_addParam",
		value: function _addParam(data) {
			this._sequenceNumber = data.payload.sequence;
			/**
    * ParamNode add event
    * @event XebraCommunicator.add_param
    * @param {object} payload - The ParamNode add payload
    */
			this.emit(_constants.XEBRA_MESSAGES.ADD_PARAM, data.payload);
		}

		/**
   * @private
   * @param {object} data - the message data
   */

	}, {
		key: "_deleteNode",
		value: function _deleteNode(data) {
			this._sequenceNumber = data.payload.sequence;
			/**
    * Delete ObjectNode event
    * @event XebraCommunicator.delete_node
    * @param {object} payload - The ObjectNode delete payload
    */
			this.emit(_constants.XEBRA_MESSAGES.DELETE_NODE, data.payload);
		}

		/**
   * Handle incoming resource data
   * @private
   * @param {object} data - the resource data
   */

	}, {
		key: "_handleResourceData",
		value: function _handleResourceData(data) {
			var j = void 0;
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
			this.emit(_constants.XEBRA_MESSAGES.HANDLE_RESOURCE_DATA, data.payload);
		}

		/**
   * Handle incoming resource info
   * @private
   * @param {object} data - the resource info
   */

	}, {
		key: "_handleResourceInfo",
		value: function _handleResourceInfo(data) {
			var j = void 0;
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
			this.emit(_constants.XEBRA_MESSAGES.HANDLE_RESOURCE_INFO, data.payload);
		}

		/**
   * Handle incoming init node data
   * @private
   * @param {object} data - the node data
   */

	}, {
		key: "_initNode",
		value: function _initNode(data) {
			/**
    * Init Node event
    * @event XebraCommunicator.init_node
    * @param {object} payload - The Node init payload
    */
			this.emit(_constants.XEBRA_MESSAGES.INIT_NODE, data.payload);
		}

		/**
   * Handle incoming node modification data
   */

	}, {
		key: "_modifyNode",
		value: function _modifyNode(data) {
			// ignore modification messages if the were actually sent by ourselves
			if (data.payload.source === this._xebraUuid) return;
			/**
    * Modify Node event
    * @event XebraCommunicator.modify_node
    * @param {object} payload - The Node modify payload
    */
			this.emit(_constants.XEBRA_MESSAGES.MODIFY_NODE, data.payload);
		}

		/**
   * Handle resync method call
   * @param {object} data - The Resync data
   * @param {boolean} [force=false] - Force a resync
   */

	}, {
		key: "_resync",
		value: function _resync(data) {
			var force = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;

			if (force || data.payload.sequence !== this._sequenceNumber) {
				this.emit(_constants.XEBRA_MESSAGES.RESYNC);
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

	}, {
		key: "_setXebraUuid",
		value: function _setXebraUuid(data) {
			this._xebraUuid = data.payload.uuid;
			this.emit(_constants.XEBRA_MESSAGES.CLIENT_PARAM_CHANGE, "uuid", this._xebraUuid);
			this._requestStateDump();
			this._sendMessage("set_client_params", {
				xebraUuid: this._xebraUuid,
				name: this._name,
				uid: this._uuid
			});
		}

		/**
   * Handle received statedump
   * @param {object} data - The statedump data
   */

	}, {
		key: "_statedump",
		value: function _statedump(data) {
			/**
    * Statedump Event
    * @event XebraCommunicator.statedump
    * @param {object} payload - The statedump payload
    */
			this.emit(_constants.XEBRA_MESSAGES.STATEDUMP, data.payload);
		}

		/**
   * Connect the Communicator to Xebra Server
   */

	}, {
		key: "connect",
		value: function connect() {
			this._communicator.connect();
		}

		/**
   * Close the connection to the XebraServer
   */

	}, {
		key: "close",
		value: function close() {
			this._communicator.close();
		}

		/**
   * Request ResourceData from XebraServer
   * @param {object} data - Object describing/identifying the needed resource data
   */

	}, {
		key: "getResourceData",
		value: function getResourceData(data) {
			this._sendMessage("get_resource_data", data);
		}

		/**
   * Request ResourceInfo from XebraServer
   * @param {object} data - Object describing/identifying the needed resource info
   */

	}, {
		key: "getResourceInfo",
		value: function getResourceInfo(data) {
			this._sendMessage("get_resource_info", data);
		}

		/**
   * Send a Modification Message to XebraServer
   * @param {object} data - The modification message payload
   */

	}, {
		key: "sendModifyMessage",
		value: function sendModifyMessage(data) {
			data.source = this._xebraUuid;
			data.timestamp = Date.now();
			this._sendMessage("modify_node", data);
		}
	}, {
		key: "connectionState",
		get: function get() {
			return this._communicator.connectionState;
		}

		/**
   * @type {string}
   */

	}, {
		key: "name",
		get: function get() {
			return this._name;
		},
		set: function set(name) {
			this._name = name;
			this._sendMessage("set_client_params", {
				xebraUuid: this._xebraUuid,
				name: this._name,
				uid: this._uuid
			});
			this.emit(_constants.XEBRA_MESSAGES.CLIENT_PARAM_CHANGE, "name", this._name);
		}

		/**
   * @type {string}
   * @readonly
   */

	}, {
		key: "uuid",
		get: function get() {
			return this._uuid;
		}

		/**
   * @type {string}
   * @readonly
   */

	}, {
		key: "host",
		get: function get() {
			return this._communicator.host;
		}

		/**
   * @type {number}
   * @readonly
   */

	}, {
		key: "port",
		get: function get() {
			return this._communicator.port;
		}

		/**
   * @type {string}
   * @readonly
   */

	}, {
		key: "wsUrl",
		get: function get() {
			return this._communicator.url;
		}

		/**
   * @type {string}
   * @readonly
   */

	}, {
		key: "xebraUuid",
		get: function get() {
			return this._xebraUuid;
		}
	}]);

	return XebraCommunicator;
}(_events.EventEmitter);

XebraCommunicator.XEBRA_MESSAGES = _constants.XEBRA_MESSAGES;
XebraCommunicator.CONNECTION_STATES = _constants.CONNECTION_STATES;
XebraCommunicator.XEBRA_VERSION = _constants.XEBRA_VERSION;

exports.default = XebraCommunicator;
module.exports = exports["default"];