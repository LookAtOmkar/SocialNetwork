"use strict";

let your_email;
let your_pass;

$(document).ready(function(){

    $("#signIn").on("click",function(){
        your_email=$("#your_email").val();
        your_pass=$("#your_pass").val();    
        let request=inviaRichiesta("GET","/api/login",{"mail":your_email,"password":your_pass});
        request.done(function(data)
        {
            alert("Loggato "+data);
            if(data[0]["Ris"] == "ok")
            {
                alert("ok");
                window.location.href = "./static/index.html"; 
            }

        });
        request.fail(errore);        
    })

});
