"Use strict";


$(document).ready(function(){

    if(localStorage.getItem("token")!="ok")
    {  window.location.href = "./Login/login.html"; }


    //..........................................MY ACCOUNT.........................................

    $(".dropdown-toggle").dropdown();
    let UserID=localStorage.getItem("utente");
    /*let request = inviaRichiesta("POST","/api/getUserName",{"ID":UserID});
    request.fail(errore);
    request.done(function(data){
        if(data==null)
            alert("ERRORE DATI");
        else
        {
            let Username = data["Name"]+" "+data["Surname"];
            if(data["Name"]=="admin") //PERCHE' COME COGNOME E' SEMPRE admin , QUINDI BASTA CHE VERRA' SCRITTO UNA VOLTA SOLA
            {
                Username = data["Name"];
            }
            $("#MyAccount").find("a").eq(0).html(Username);
        }
        
    });*/


    //VISUALIZZA PROFILO
    $("#MyAccount").on("click",function(){  
    })

    //EXIT
    $("#MyAccount").children().eq(1).children().eq(2).on("click",function(){
        localStorage.removeItem("token");
        localStorage.removeItem("utente");
    })
})