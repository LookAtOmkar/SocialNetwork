"Use strict";


$(document).ready(function(){

    //..........................................MY ACCOUNT.........................................

    $(".dropdown-toggle").dropdown();
    
    
    let request = inviaRichiesta("GET","/api/getUserName");
    request.fail(errore);
    request.done(function(data){
        if(data==null)
            alert("ERRORE DATI");
        else
        {
            console.log(data);
            let Username = data["Name"]+" "+data["Surname"];
            if(data["Name"]=="admin") //PERCHE' COME COGNOME E' SEMPRE admin , QUINDI BASTA CHE VERRA' SCRITTO UNA VOLTA SOLA
            {
                Username = data["Name"];
            }
            $("#MyAccount").find("a").eq(0).html(Username);
        }
        
    });


    let MYProfile_modal_body = $("#myProfile").find(".modal-body .card");

    //VISUALIZZA PROFILO
    $("#MyAccount").children().eq(1).children().eq(0).on("click",function(){  
        let request= inviaRichiesta("GET","/api/Profile");
        request.fail(errore);
        request.done(function(data){
            console.log(data);
            for(let item in data)
            {
                let content = $("<div>").addClass("d-flex flex-row");
                let divHead = $("<div>").addClass("col-sm-3 border-bottom border-right");
                let divBody = $("<div>").addClass("col-sm-9 border-bottom border-left");
                if((item != "_id")&&(item != "FOTO"))
                {
                    $("<h6>").html(item).appendTo(divHead); //Title 
                    $("<p>").html(data[item]).appendTo(divBody); //Detail
                    $("<div>").addClass("fa fa-pencil").prop("method","patch").on("click",insertUpdate);
                    $("<div>").addClass("far fa-trash-alt").prop("method","delete").on("click",remove);

                }
                divHead.appendTo(content);
                divBody.appendTo(content);
                content.appendTo(MYProfile_modal_body);
            }
        });
    })

    //EXIT
    $("#MyAccount").children().eq(1).children().eq(2).on("click",function(){
        let request = inviaRichiesta("POST","/api/logout");
        request.fail(errore);
        request.done(function(data){
            window.location.reload();
        })
    })



    //----------------------------------FUNCTIONS--------------------------------
    function insertUpdate()
    {

    }

    function remove()
    {

    }
})