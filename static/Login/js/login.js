"use strict";

let your_email;
let your_pass;

$(document).ready(function(){

    $("#signIn").on("click",function(){
        your_email=$("#your_email").val();
        your_pass=$("#your_pass").val();    
        let request=inviaRichiesta("POST","/api/login",{"mail":your_email,"password":your_pass});
        request.fail(errore);      
        request.done(function(data)
        {
            alert("Loggato "+data);
            console.log(data);
            if(data["Ris"] == "ok")
            {
                alert("ok");
                localStorage.setItem("token","ok");
                window.location.href = "../index.html"; 
            }
        });  
    })
});
