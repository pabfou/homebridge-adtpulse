var pulse = require('adt-pulse');
var myAlarm;
var myStatus;
var Service, Characteristic;
var request = require("request");

const rp = require('request-promise');

module.exports = function(homebridge){
	Service = homebridge.hap.Service;
	Characteristic = homebridge.hap.Characteristic;
	homebridge.registerAccessory("homebridge-adtpulse", "adtpulse", adtpulseAccessory);
}

function adtpulseAccessory(log, config) {
	this.log = log;
	this.name = config["name"];

	this.config = config;
	this.httpMethod = config["http_method"] || "GET";
	this.auth = {};
	this.auth.username = config.username || "";
	this.auth.password = config.password || "";
	this.auth.immediately = config.immediately || "true";
	
	myAlarm = new pulse(this.auth.username, this.auth.password);

	// Register Callbacks:
	myAlarm.onDeviceUpdate(
			function(device) {
					console.log(device)
			}
	);

	//login and update alarm status
	myAlarm.login();
	myStatus = myAlarm.updateAll();

	console.log(myStatus);

	
}

adtpulseAccessory.prototype = {

//
getState() {
	//login and update alarm status
	myAlarm.login();
	myStatus = myAlarm.updateAll();

	console.log(myStatus);


	var disarmed = myStatus.contains('Disarmed');
	var stay = myStatus.contains('Stay');
	var away = myStatus.contains('Away');

	If (disarmed)
		return Characteristic.SecuritySystemCurrentState.DISARMED;

	If (stay)
		return Characteristic.SecuritySystemCurrentState.STAY_ARM;

	If (away)
		return Characteristic.SecuritySystemCurrentState.AWAY_ARM;

	},

setState(targetState) {

	//login and update alarm status
	myAlarm.login();
	
	myStatus = myAlarm.updateAll();
	
	console.log(myStatus);
	
	var changeState;

	changeState.instance = alarmInfo.instance;
	changeState.units = alarmInfo.units;
	changeState.newstate = targetState;

	myAlarm.setAlarmState(changeState);

},

getCurrentState: function() {
	this.log("Getting current state");
	this.getState();
	},
getTargetState: function() {
	this.log("Getting target state");
	this.getState();
},
identify: function(callback) {
	this.log("Identify requested!");
	callback(); // success
},

getServices: function() {
				this.securityService = new Service.SecuritySystem(this.name);

				this.securityService
							.getCharacteristic(Characteristic.SecuritySystemCurrentState)
							.on('get', this.getCurrentState());

				this.securityService
							.getCharacteristic(Characteristic.SecuritySystemTargetState)
							.on('get', this.getTargetState())
							.on('set', this.setTargetState(this));

				return [this.securityService];
		}
};
