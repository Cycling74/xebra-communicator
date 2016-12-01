"use strict";

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _lodash = require("lodash.defaults");

var _lodash2 = _interopRequireDefault(_lodash);

var _events = require("events");

var _url = require("url");

var _constants = require("./constants.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Communication = function (_EventEmitter) {
	_inherits(Communication, _EventEmitter);

	function Communication(options) {
		_classCallCheck(this, Communication);

		var _this = _possibleConstructorReturn(this, (Communication.__proto__ || Object.getPrototypeOf(Communication)).call(this));

		_this._options = (0, _lodash2.default)(options, {
			secure: false,
			reconnect: true,
			reconnect_attempts: 5,
			reconnect_timeout: 1000,
			auto_connect: true
		});

		_this._ws = null;
		_this._forcedDisconnect = false;
		_this._currentReconnects = 0;
		_this._connectedInitially = false;
		_this._connectionState = _constants.CONNECTION_STATES.INIT;

		if (_this._options.auto_connect) _this.connect();
		return _this;
	}

	/**
  * @readonly
  * @see XebraCommunicator.CONNECTION_STATES
  */


	_createClass(Communication, [{
		key: "_connect",


		/**
   * Connect to XebraServer
   * @private
   */
		value: function _connect() {

			this._ws = new WebSocket(this.url);
			this._ws.onclose = this._onClose.bind(this);
			this._ws.onmessage = this._onMessage.bind(this);
			this._ws.onopen = this._onOpen.bind(this);
		}

		/**
   * Handle onClose event
   * @private
   */

	}, {
		key: "_onClose",
		value: function _onClose() {
			this._ws = null;

			// connection never worked
			if (!this._connectedInitially) {
				this._connectionState = _constants.CONNECTION_STATES.CONNECTION_FAIL;
				this.emit("connection_change", this.connectionState);
				return;
			}

			// user forced disconnect
			if (this._forcedDisconnect) {
				this._connectionState = _constants.CONNECTION_STATES.DISCONNECTED;
				this.emit("connection_change", this.connectionState);
				return;
			}

			if (this._connectedInitially && this._options.reconnect) {
				this._connectionState = _constants.CONNECTION_STATES.RECONNECTING;
				this.emit("connection_change", this.connectionState);

				if (this._currentReconnects++ < this._options.reconnect_attempts) {
					setTimeout(this._reconnect.bind(this), this._options.reconnect_timeout);
				} else {
					this._connectionState = _constants.CONNECTION_STATES.DISCONNECTED;
					this.emit("connection_change", this.connectionState);
				}
			}
		}

		/**
   * Handle incoming Message
   * @private
   */

	}, {
		key: "_onMessage",
		value: function _onMessage(msg) {
			this.emit("message", JSON.parse(msg.data));
		}

		/**
   * Handle connection open event
   * @private
   */

	}, {
		key: "_onOpen",
		value: function _onOpen() {
			this._connectedInitially = true;
			this._currentReconnects = 0;

			this._connectionState = _constants.CONNECTION_STATES.CONNECTED;
			this.emit("connection_change", this.connectionState);
		}

		/**
   * Reconnect
   * @private
   */

	}, {
		key: "_reconnect",
		value: function _reconnect() {
			this._connect();
		}

		/**
   * Close the WebSocket connection
   */

	}, {
		key: "close",
		value: function close() {
			if (this._ws) {
				this._forcedDisconnect = true;
				this._ws.close();
				this._ws = null;
			}
		}

		/**
   * Init the WebSocket connection
   */

	}, {
		key: "connect",
		value: function connect() {
			if (!this._ws) {
				this._connectionState = _constants.CONNECTION_STATES.CONNECTING;
				this.emit("connection_change", this.connectionState);
				this._connect();
			}
		}

		/**
   * Send data to XebraServer
   * @param {object} data - XebraMessage data
   */

	}, {
		key: "send",
		value: function send(data) {
			this._ws.send(JSON.stringify(data));
		}
	}, {
		key: "connectionState",
		get: function get() {
			return this._connectionState;
		}

		/**
   * @readonly
   */

	}, {
		key: "host",
		get: function get() {
			return this._options.hostname;
		}

		/**
   * @readonly
   */

	}, {
		key: "port",
		get: function get() {
			return this._options.port;
		}

		/**
   * @readonly
   */

	}, {
		key: "url",
		get: function get() {
			return (0, _url.format)({
				hostname: this._options.hostname,
				port: this._options.port,
				protocol: this._options.secure ? "wss" : "ws",
				slashes: true
			});
		}
	}]);

	return Communication;
}(_events.EventEmitter);

exports.default = Communication;
module.exports = exports["default"];