function switchLogonToReg(toLogon) {
		var regMarkup = "<h2>Register</h2>" +
		"<div id='regContainer'>" +
			"<form name='register' method='POST' action='/account/register' />" +
				"<input id='userReg' name='userReg' type='text'>" +
				"Name" +
				"<div class='clear'></div>" +
				"<input id='passReg' name='pass' type='password'>" +
				"Password" +
				"<div class='clear'></div>" +
				"<input id='passRegConfirm' name='passConfirm' type='password'>" +
				"Confirm  Password	" +
				"<div class='clear'></div>" +
				"<input id='submitReg' value='Register' type='submit' />" +
			"</form>" +
		"</div>" +
		"<div class='clear'></div>" +
		"<div style='margin-top:20px;'>" +
		"<span><input type='button' value='Switch' id='logonRegSwitcher' onclick='switchLogonToReg(false); return false;' />Have an account? Login instead.</span>" +
    "</div>"
		"<div class='error'>" +
			"<%= message %>" +
		"</div>";
	
		var loginMarkup = "<h2>Login</h2>" +
		"<div id='loginContainer'>" +
			"<form name='login' method='POST' action='/account/login'>" +
				"<input id='user' name='user' type='text' />" +
				"Name" +
				"<div class='clear'></div>" +
				"<input id='pass' name='pass' type='password' />" +
				"Password" +
				"<div class='clear'></div>" +
				"<input id='submitLogin' value='Login' type='submit' />" +
		"</div>" +
		"<div class='clear'></div>" +
    "<div style='margin-top:20px;'>" +
		"<span><input type='button' value='Switch' id='logonRegSwitcher' onclick='switchLogonToReg(true); return false;' />No account yet? Need to register?</span>" +
    "</div>"
		"<div class='error'>" +
			"<%= message %>" +
		"</div>";
	
		var goingToRender = toLogon? regMarkup : loginMarkup;
		$("div#container").html(goingToRender);
}