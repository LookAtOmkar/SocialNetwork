"use strict";

let your_email;
let your_pwd;

$(document).ready(function(){

    $(".it-date-datepicker").datepicker({
        inputFormat: ["dd/mm/yyyy"],
        outputFormat: "dd/mm/yyyy",
        format:"dd/mm/yyyy"
      });

    //..........................................................LOGIN..........................................................
    $("#signIn").on("click",function(){
        LogIn();
    })

    $(document).on('keydown',function(event){
        if(event.keyCode == 13)
            LogIn();
    })


    function LogIn(){
        $("#your_email").removeClass("is-invalid");
        $("#your_pass").removeClass("is-invalid");
        $("#your_email").addClass("is-valid");
        $("#your_pass").addClass("is-valid");
        
        your_email=$("#your_email").val();
        your_pwd=$("#your_pass").val();    

        if(your_email == "")
        {
            $("#your_email").addClass("is-invalid");
            $("#your_email").removeClass("is-valid");
        }
        else if(your_pwd == "")
        {
            $("#your_pass").addClass("is-invalid");
            $("#your_pass").removeClass("is-valid");
        }
        else
        {
            let request=inviaRichiesta("POST","/api/Login/login",{"mail":your_email,"password":your_pwd});
            request.fail(errore);      
            request.done(function(data)
            {
                alert("Loggato");
                console.log(data);
                if(data["Ris"] == "ok")
                {
                    //localStorage.setItem("token","ok");
                    //localStorage.setItem("utente",data["utente"]);
                    window.location.href = "../index.html"; 
                }
                else
                    alert("Errore");
            });  
        }       
    }


    //............................................................SIGN UP............................................................

    $("#_name").on("keydown",function(){
        controllaLength($(this),0);
    })

    $("#_surname").on("keydown",function(){
        controllaLength($(this),0);
    })
    
    $("#_pwd").on("keydown",function(){
        controllaLength($(this),8);
    })

    $("#_mail").on("keydown",function(){
        controllaMail($(this));
    })

    $("#_localita").on("keydown",function(){
        controllaLength($(this),0);
    })


    $("#signUp").on("click",function(){
        
        controllaParams();
        //Dopo un controllo 
        let _name = $("#_name").val();
        let _surname = $("#_surname").val();
        let _sesso = $("#ComboSesso").val();
        let _dataNascita = $("#date1").val();
        let _foto = $("#_foto").val(); //PER ADESSO E' COSI'
        let _localita = $("#_localita").val();
        let _mail = $("#_mail").val();
        let _pwd = $("#_pwd").val();
        let Data = {
            "NOME": _name,
            "COGNOME":_surname,
            "SESSO":_sesso,
            "DATANASCITA":_dataNascita,
            "LOCALITA":_localita,
            "MAIL":_mail,
            "PASSWORD":_pwd,
            "FOTO":_foto,
            "SALDOACCOUNT":200,
        }        
        let request= inviaRichiesta("POST","/api/Login/Register",Data);
        request.fail(errore);
        request.done(function(data){
            alert("REGISTRATO CON SUCCESSO");
            console.log(Data);
            console.log(data);
            $("html,body").animate({
              scrollTop: $("#LOGIN").offset().top
            },3000);
        })
    })




    //----------------------------------------------------FUNCTIONS--------------------------------------------------------
    function controllaLength(param,num)
    {
        if(param.val().length>=num)
        {
            param.removeClass("is-invalid");
            param.addClass("is-valid");
            //$("#_name").prev().addClass("icona-verde");

        }  
        else
        {
            param.removeClass("is-valid");
            param.addClass("is-invalid");
        }
    }

    function controllaMail(param)
    {
        if((param.val().indexOf("@")==-1)&&(param.val().indexOf(".")==-1))
        {
            //alert("mail non valido");
            param.removeClass("is-valid");
            param.addClass("is-invalid");
        } 
        else
        {
            //VALIDO
            param.removeClass("is-invalid");
            param.addClass("is-valid");
        }
    }

    function controllaParams()
    {
        $("#_name").removeClass("is-invalid"); 
        $("#_surname").removeClass("is-invalid");
        $("#ComboSesso").removeClass("is-invalid");
        $("#date1").removeClass("is-invalid");
        $("#_localita").removeClass("is-invalid");
        $("#_mail").removeClass("is-invalid");
        $("#_pwd").removeClass("is-invalid");
        $("#_re_pwd").removeClass("is-invalid");
        $("#_foto").removeClass("is-invalid");

        

        //Controllo del nome e cognome
        if(($("#_name").val()== "")&&($("#_surname").val()==""))
        {
            $("#_surname").addClass("is-invalid");
            $("#_name").addClass("is-invalid");
        }
        else if($("#_surname").val()=="")
        {
            $("#_surname").addClass("is-invalid");
        }
        else if($("#_name").val()=="")
        {
            $("#_name").addClass("is-invalid");
        }      
        
        //MAIL
        controllaMail($("#_mail")); 

        //PASSWORD
        if(($("#_pwd").val()=="") || ($("#_pwd").val().length >8))
        {
            $("#_pwd").addClass("is-invalid");
        }

        //RE-PASSWORD
        if($("#_re_pwd").val() != $("#_pwd").val())
        {
            $("#_re_pwd").addClass("is-invalid");
        }

        //LOCALITA
        if($("#_localita").val()=="")
        {
            $("#_localita").addClass("is-invalid");
        }

        //DATENASCITA
        if($("#date1").val()=="")
        {
            $("#date1").addClass("is-invalid");
        }
    }
});
