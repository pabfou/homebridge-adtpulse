var alarmstatus;
var Service, Characteristic;

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

  
