var express = require('express');
var router = express.Router();
var User = require('mongoose').model('User');
var ActiveOrder = require("mongoose").model("ActiveOrder");
var crypto = require('crypto');

var webName = "delivery Boy";
var webDomain = "cloudfood-jasonews.c9users.io";
var authExpireTime = 60 * 60 * 1000;

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get("/home", function(req, res, next) {
	
	if (!req.cookies.username || !req.cookies.auth_token) {
		res.redirect('login');
		console.log("after redirect");
		return;
	}
	
	User.findOne({
		'username': req.cookies.username
	}, function( err, user) {
		if (err) {
			console.log(err);
			res.redirect("signup/?error=2");
		} else {
			if (user) {
				if ( user.auth.token == req.cookies.auth_token && user.auth.validate) {
	 				user.auth.token	= crypto.createHash('sha256').update((new Date()).toString()).digest("base64");
					var online = user.online;
					user.online = true;
					user.save(function (err) {
						if (err) {
							res.send("save data error");
							return;
						}
						res.clearCookie("auth_token", {path: "/users/home"});
						
						
						res.cookie('auth_token', user.auth.token, {path: "/users/home", expires: user.auth.expire, httpOnly: true});
						if (!online) {
							res.render('user_home', {'user': user, 'flash': 'success', 'flash_msg': 'Welcome to '+ webName});
						}
						else
							res.render('user_home', {'user': user});
					});
					
				} else {
					user.auth.expire = new Date(0);
					user.online = false;
					user.save(function(err) {
						if (err) {
							res.send("save data error");
							return;
						}
						console.log("cookie token", req.cookies.auth_token);
						console.log("user tooken", user.auth.token);
						console.log("token not match");
						if (req.cookies.logout)
							res.redirect('/');
						else 
							res.redirect('login');	
					});
					
				}
			} else {
				console.log("User not found");
				console.log("Not found user is: ", req.cookies.username);
				res.redirect('login');	
			}
		}
	});	
});

router.get('/signup', function(req, res, next) {
	console.log('enter signup');
	console.log(req.query.error !== undefined);
	if (req.query.error !== undefined) {
		if (parseInt(req.query.error) === 1)
			res.render('user_signup', {'flash':'danger', 'flash_msg': "unable to create account"});
	} else { 
		console.log("render signup")
		res.render('user_signup');	
		console.log("after render")
	}
});

router.post('/signup', function(req, res, next) {
	
	var err = validate(req.body);
	if (Object.keys(err).length === 0) {		
		handleNewUser(req.body, res);
	} else {
		console.log(req.body);
		err.flash = 'danger';
		err.flash_msg = "Marked fields are not in correct format";
		
		err = Object.assign(err, req.body);
		console.log(err);
		res.render('user_signup', err);
	}
});

router.get('/login', function(req, res, next) {
	res.render('user_login');
});

router.post('/login', function(req, res, next) {
	var input = req.body;
	User.findOne({"username": input.username}, function(err, user) {
	    if (err || !user || (user && user.passwd != crypto.createHash('md5').update(input.passwd).digest("hex"))) {
	    	var err = {};
	    	err.username_err = true;
	    	err.passwd_err = true;
	    	err.flash = "danger";
	    	err.flash_msg = "Login failed. Please retry";
	    	err = Object.assign(err, input);
	    	res.render("user_login", err);
	    	return;
	    }
	    
	    user.auth.token	= crypto.createHash('sha256').update((new Date()).toString()).digest("base64");
	    user.auth.expire = new Date(Date.now() + authExpireTime);
	    
	    user.save(function(err) {
	    	if (err) {
	    		console.log(err);
	    		res.send("save data error");
	    		return;
	    	}
	    	console.log("login token", user.auth.token);
	    	res.clearCookie('auth_token', {path: "/users/home"});
	    	res.clearCookie('username', {path: "/users/home"});
	    	res.cookie('username', user.username, {path: "/users/home", expires: user.auth.expire, httpOnly: true});
			res.cookie('auth_token', user.auth.token, {path: "/users/home", expires: user.auth.expire, httpOnly: true});
			res.redirect("home");
	    });
	    
	    	
	})
	
});

router.post('/login_facebook', function(req, res, next) {
	var info = req.body;
	var user = {};
	user.lastName = info.last_name;
	user.firstName = info.first_name;
	user.facebook_id = info.id;
	
	user.flash = "info";
	user.flash_msg = "Please fill your phone number";
	res.render("user_signup", user);
		
	
});

router.get('/logout', function(req, res, next) {
    res.clearCookie("auth_token", {path: "/users/home"});
    res.cookie("auth_token", "logout", {path: "/users/home", httpOnly: true});
    res.cookie("logout", "true", {path: "/users/home", httpOnly: true});
    res.redirect("home");
});

router.get("/home/activeOrders", function(req, res, next) {
    validateStatus(req,res,User, "/users/login", function(input, user) {
    	ActiveOrder.find({
    		$or: [ {number: user.number, paid: false}, {
    		number: user.number, delivered: false} ]
    	}, function(err, orders) {
    		res.set("Content-Type", "text/json");
    		if (err) {
    			console.log(err);
    			res.send({'err': err});
    			return;
    		}
    		res.send(orders);
    	});
    });
});

router.get("/home/orders", function(req, res, next) {
    validateStatus(req, res, User, "/users/login", function(input, user) {
    	ActiveOrder.find({
    		number: user.number
    	}, function(err, orders) {
    		res.set("Content-Type", "text/json");
    		if (err) {
    			console.log(err);
    			res.send({'err': err});
    			return;
    		}
    		console.log(orders);
    		res.send(orders);
    	});
    });
});

function handleNewUser(user, res) {
	if (user.username === null)
		user.username = user.number;
	var username = user.username.trim();
	var number = user.number.trim();
	var name = {};
	name.first = user.firstName.trim();
	name.mid = user.midName.trim();
	name.last = user.lastName.trim();
	var email = user.email;
	var passwd = user.passwd;
	var input = user;

	User.find({$or: [{
			'number': parseInt(number, 10)},
			{"username": username}]
	}).limit(2).exec(function(err, users) {
		if (err) {
			console.log(err);
			return;
		}		
		if (users && users.length  !== 0) {
			var flash_msg = "The ";
			var err = {};
			for (var i = 0; i < users.length; i++) {
				if (users[i].username == username) {
					err.username_err = true;
					flash_msg += "username ";
				}
				if (users[i].number == number) {
					err.number_err = true;
					flash_msg += "number ";
				}
					
			}
			// console.log(users);
			flash_msg += "has been used!";
			err.flash_msg  = flash_msg;
			err.flash = "danger";
			err.passwd_err = true;
			err.passwdcomfirm_err = true;
			err = Object.assign(err, input);
			res.render('user_signup', err);
			// res.render('user_home', {'user': user, 'flash': 'success', 'flash_msg': 'Already sign up!'});
			return;		
		}
		var user = new User();
		user.username = username;
		user.name.full = name;
		user.number = number;
		user.email = email;
		user.passwd =crypto.createHash('md5').update(passwd).digest("hex");
	 	user.auth.token	= crypto.createHash('sha256').update((new Date()).toString()).digest("base64");
		user.auth.expire = new Date(Date.now() + authExpireTime);
		user.online = false;
		
		user.save( function(err) {
			if (err) {
				console.log(err);		
				res.redirect("signup/?error=1");
			}
			else {
				res.clearCookie('username', {path: "/users/home"});
				res.clearCookie("auth_token", {path: "/users/home"});
				res.cookie('username', user.username, {path: "/users/home", expires: user.auth.expire, httpOnly: true});
				res.cookie('auth_token', user.auth.token, { path: "/users/home", expires: user.auth.expire, httpOnly: true});
				res.redirect("home");	
			}
		});
	});
}

router.post("/home/activeOrders/delivered", function(req, res, next) {
   validateStatus(req,res, User, "/users/login", function(input, restaurant) {
   		ActiveOrder.findOne({
   			name: input.name
   		}, function(err, order) {
   		    order.delivered = true;
	       order.save(function (err) {
	       		if (err) {
	       			res.render('user_home', {'user': restaurant, 'flash': 'danger', 'flash_msg': "unable to complete request: "+err.message });
	       			return;
	       		}
	       		res.redirect("/users/home");
   			});
       
       });
   }, function(input) {
       res.redirect("/users/login");
   });
});

function validate(user) {
		var reName = /^[a-zA-Z0-9_]{3,15}$/;
		var reNumber = /^[0-9]{10}$/;
		var reEmail = /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
		var rePasswd1 = /.{7,}/;
		var rePasswd2 = /[a-zA-Z]{1,}/;
		var err = {};
		if (!user.username || !reName.test(user.username.trim()))
			err.username_err = true;
		if (!user.number || !reNumber.test(user.number.trim()))
			err.number_err = true;
		if (user.email && !reEmail.test(user.email))
			err.email_err = true;
		if (!user.firstName)
			err.firstName_err = true;
		if (!user.lastName)
			err.lastName_err = true;
		if (!user.passwd || !rePasswd1.test(user.passwd) || !rePasswd2.test(user.passwd))
			err.passwd_err = true;
		if (err.passwd_err || !user.passwdcomfirm || user.passwd != user.passwdcomfirm)
			err.passwdcomfirm_err = true;
		return err;
}

var validateStatus = function(req, res, model, forwardPage, scallback, fcallback) {
	if (!req.cookies.username || !req.cookies.auth_token)
    	res.redirect(forwardPage);
    else {
    	var input = req.body;
    	console.log(input);
    	model.findOne({
		'username': req.cookies.username
		}, function( err, user) {
			if (err) {
				console.log(err);
				res.redirect("signup/?error=2");
			} else if(user) {
				if (user.auth.token == req.cookies.auth_token && user.auth.validate && user.online) {
					if (scallback)
						scallback(input, user);
				} else {
					if (fcallback)
						fcallback(input);
				}
			} else {
				res.redirect(forwardPage);
			}
		});
    }

}

module.exports = router;
