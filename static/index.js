"Use strict";


$(document).ready(function(){

    if(localStorage.getItem("token")!="ok")
    {  window.location.href = "./Login/login.html"; }
})