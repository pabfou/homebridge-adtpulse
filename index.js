var tough = require('tough-cookie');
var request = require('request');
var q = require('q');
var cheerio = require('cheerio');

//Cookie jar
var j;

//Request Configs
var ua =  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_9_4) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36';

var sat = '';
var lastsynckey = '';
var myAlarm = {
	status:'',
	newstate:'',
	instance:'',
	units:''
};

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
	this.authenticated = false;
	this.auth = {};
	this.auth.username = config.username || "";
	this.auth.password = config.password || "";

	this.urls = {
		initialurl: 'https://portal.adtpulse.com/myhome/access/signin.jsp',
		authUrl: 'https://portal.adtpulse.com/myhome/access/signin.jsp?e=n&e=n&&partner=adt',
		sensorUrl: 'https://portal.adtpulse.com/myhome/ajax/homeViewDevAjax.jsp',
		orbUrl: 'https://portal.adtpulse.com/myhome/ajax/orb.jsp',
		statusChangeUrl: 'https://portal.adtpulse.com/myhome/quickcontrol/serv/ChangeVariableServ',
		otherStatusUrl: 'https://portal.adtpulse.com/myhome/ajax/currentStates.jsp',
		syncUrl: 'https://portal.adtpulse.com/myhome/Ajax/SyncCheckServ',
		logoutUrl: 'https://portal.adtpulse.com/myhome/access/signout.jsp'
	};

}

adtpulseAccessory.prototype = {

//login
login: function(callback) {
		console.log('Pulse: loggin in');
		var that = this;

		j = request.jar();

		request({
			url: this.urls.authUrl,
			followAllRedirects: true,
			jar: j,
			headers: {
				'Host': 'portal.adtpulse.com',
				'User-Agent': ua
			},
			form:{
				username: that.config.username,
				password: that.config.password
			},
			method: post
		},
		function(error, response, body) {
			if(err || httpResponse.req.path !== '/myhome/6.18.0-238/summary/summary.jsp'){
				that.authenticated = false;
				console.log('Pulse: Authentication Failed');
				callback(error);
			} else {
				that.authenticated = true;
				console.log('Pulse: Authentication Success');
				callback(error, response, body)
			}
		})
	},

	logout: function () {
		console.log('Pulse: logout');

		var that = this;

		request(
			{
				url: this.urls.logoutUrl,
				jar: j,
				headers: {
					'User-Agent': ua
				}
			},
			function () {
				that.authenticated = false;
			}
		)
	},


//get alarm status
getState: function(callback) {
	console.log('Pulse: Getting Alarm Statuses');
	that = this;
	this.request({
			url: that.urls.config.orbUrl,
			jar: j,
			headers: {
				'User-Agent': ua
			},
		},
		function(error, httpResponse, body) {

			if (error) {
				this.log('GetState function failed: %s', error.message);
				callback(error);
			} else {

			var actions = [];

			//get the sat code
			sat = body.match(/sat=([^&]*)&/)[1];

			//parse the html
			$ = cheerio.load(body);

			//grab the action buttons
			$('#divOrbSecurityButtons input').each(function(el){

			//get the args from the onclick
			var matches = $(this).attr('onclick').match(/'([^']*)'/g);

			//remove the singl quotes
			matches.forEach(function(obj, index, arr){
					arr[index] = obj.replace(/'/gi,'');
				});

			//populate the values
			myAlarm = {
					instance: matches[0],
					newstate:matches[1],
					units: matches[2]
			  }
			});

			myAlarm = {
				status: $('#divOrbTextSummary span').text()
			};

			if (myAlarm.status.contains('stay')) {
				state = "0";
			};

			if (myAlarm.status.contains('away')) {
				state = "1";
			};

			if (myAlarm.status.contains('night')) {
				state = "2";
			};

			if (myAlarm.status.contains('disarmed')) {
				state = "3";
			};

			if (myAlarm.status.contains('trigger')) {
				state = "4";
			};

			this.log("State is currently %s", myAlarm.status);
			callback(state);
		}
		}.bind(this));

},

setTargetState: function(state, callback) {
	this.log("Setting state to %s", state);
	this.login();

	var targetstate;
	var self = this;
	switch (state) {
		case Characteristic.SecuritySystemTargetState.STAY_ARM:
			targetstate = 'Stay';
			break;
		case Characteristic.SecuritySystemTargetState.AWAY_ARM :
			targetstate = 'Away';
			break;
		case Characteristic.SecuritySystemTargetState.NIGHT_ARM:
		targetstate = 'Night';
			break;
		case Characteristic.SecuritySystemTargetState.DISARM:
		targetstate = 'Disarmed';
			break;
	}

	var url = this.url.config.statusChangeUrl+'?rtn=xml&fi='+encodeURIComponent(myAlarm.instance)+'&vn=arm-state&u='+encodeURIComponent(myAlarm.units)+'&ft=security-panel&sat=' + sat + '&value=' + encodeURIComponent(targetstate);

	request(
		{
			url: url,
			jar: j,
			headers: {
				'User-Agent': ua,
				'Referer': 'https://portal.adtpulse.com/myhome/summary/summary.jsp'
			},
		},
		function(error, httpResponse, body) {
			if(error){
				console.log('SetState function failed: %s', error.message);
				callback(error);
			} else {
				console.log('Pulse setAlarmState Success');
				self.securityService.setCharacteristic(Characteristic.SecuritySystemCurrentState, state);
				callback(error, response, state);
			}
		}.bind(this));
		callback(null);
	},

getCurrentState: function(callback) {
		this.log("Getting current state");
		this.login();
		currentstate = this.getState();
		callback(currentstate);
},

getTargetState: function(callback) {
	this.log("Getting target state");
	this.login();
	targetstate = this.getState();
	callback(targetstate);
},

identify: function(callback) {
	this.log("Identify requested!");
	callback(); // success
},

getServices: function() {
				this.securityService = new Service.SecuritySystem(this.name);

				this.securityService
							.getCharacteristic(Characteristic.SecuritySystemCurrentState)
							.on('get', this.getCurrentState.bind(this));

				this.securityService
							.getCharacteristic(Characteristic.SecuritySystemTargetState)
							.on('get', this.getTargetState.bind(this))
							.on('set', this.setTargetState.bind(this));

				return [this.securityService];
		}
};
