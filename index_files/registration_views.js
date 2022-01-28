var prices = {
    "nursery": 0,
    "preschool": 80,
    "primary": 100,
    "juniors": 140,
    "jr_high": 190,
    "high_school": 190,
    "adult": 225,
};

var daily_prices = {
    "nursery": 0,
    "preschool": 35,
    "primary": 40,
    "juniors": 45,
    "jr_high": 50,
    "high_school": 50,
    "adult": 55,
};

function Attendee(name, gender, age, age_group, surrogate){
    this.name = name || ""; 
    this.gender = gender || "male";
    this.age = age || 0;
    this.age_group = age_group || "nursery";
    this.surrogate = surrogate || "nursery";
}

var attendees = [];
var id = 0;

function numAsMoney(num) {
    return "$" + num + ".00";
}

function isLate() {
    var now = moment();
    var due = moment("2099-04-28");
    return now.isAfter(due);
}

function calculatePrice() {
    let rows = $("#attendees_table").find("tr");
    let total_price = 0;
    rows.each((index, raw_row) => {
        let row = $(raw_row);
        let age_group = row.find("[name=age_group]").val();
        let length_of_stay = parseInt(row.find("[name=length_of_stay]").val());
        let price = parseInt(prices[age_group]);
        let daily_price = parseInt(daily_prices[age_group]);
        let actual_price = Math.min(price, daily_price*length_of_stay);
        console.log(actual_price);
        row.find("[name=price]").val("$" + actual_price + ".00");
        total_price += actual_price;
    })
    var printed = numAsMoney(total_price) + "<br/>";
    printed += "+ $15/person x " + rows.length + " (" + numAsMoney(15*rows.length) + ")<br/>";

    if (isLate()) {
        printed += "+ $25 late fee/person x " + rows.length + " (" + numAsMoney(25*rows.length) + ")<br/> = ";
        printed += numAsMoney(total_price + 40*rows.length);
    }
    else {
        printed += numAsMoney(total_price + 15*rows.length);
    }

    $("#total_price").html(printed);
};

function addAttendee(attendee) {
    var html = $("#attendee_template").html();
    attendee.id = id;
    attendees.push({
        content: attendee,
        html: html,
        id: id,
    });
    id++;
    var appended = $(html).appendTo($("#attendees_table"));
    $(appended).find(".delete").data("id", id);
    $("#attendees_table").find(".delete").off("click");
    $("#attendees_table").find(".delete").click(function() {
        removeAttendee($(this).data("id"));
        calculatePrice();
    });
    calculatePrice();
    checkForYouth();
    $("#attendees_table").find("[name=age_group]").off("change");
    $("#attendees_table").find("[name=age_group]").change(function() {
        calculatePrice();
        checkForYouth();
    });
    $("#attendees_table").find("[name=length_of_stay]").on("keyup mouseup change", calculatePrice);

    $("#attendees_table").find("[name=name]").off("change");
    $("#attendees_table").find("[name=name]").change(function() {
        checkForYouth();
    });
}

function removeAttendee(id) {
    attendees = _.reject(attendees, function(att) {
        return att.id == id;
    });
    var to_delete = $(".delete").filter(function() {
        return $(this).data("id") == id;
    });
    to_delete.parent().parent().remove();
}

function checkForYouth() {                                                      
    let youths = getYouths();                                                   
    if (youths.length == 0) {                                                   
        $(".youth_medical_row").hide();                                         
    }                                                                           
    else {                                                                      
        $(".youth_medical_row").show();                                         
        // Comma separate + replace last comma with oxford comma + and          
        let names = youths.join(", ").replace(/,(?!.*,)/gmi, ', and');          
        $(".youth_names").html(names);                                          
    }                                                                           
}                                                                               
                                                                                
function getYouths() {                                                          
    let youth_rows = getYouthRows();                                            
    return youth_rows.map(
        (index, raw_row) => $(raw_row).find("[name=name]").val()
    ).get();
}                                                                               

function getYouthRows() {                                                       
    return getAttendeeRows().filter((index, raw_row) => {
        let row = $(raw_row);                                                   
        let age_group = $(row).find("[name=age_group]").val();                  
        return (age_group == "jr_high" || age_group == "high_school");
    });
} 

function getAttendeeRows() {
    return $("#attendees_table").find("tr");                            
}

function addEmptyAttendee(attendee) {
    var a = new Attendee();
    addAttendee(a);
}

function fetch_templates() {
    var deferreds = [];
    var i = 0;
    var templates = $("link[rel=template]");
    templates.each(function() {
        deferreds.push(new $.Deferred());
    });
    templates.each(function() {
        var file = $(this).attr('href');
        $(this).load(file, function() {
            deferreds[i].resolve();
            i++;
        });
    });
    return $.when.apply(null, deferreds);
}

$(".add").click(function() {
    addEmptyAttendee();
});

function isEmail(email) {
    var regex = /^([a-zA-Z0-9_.+-])+\@(([a-zA-Z0-9-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    return regex.test(email);
}

function lookForErrors() {
    var errors = false;
    $(".danger.errors").html("")

    $("input.required").each(function(input) {
        if ($(this).val() == "") {
            $(this).addClass("error");
            errors = true;
        }
        else {
            $(this).removeClass("error");
        }
    });

    $(".control-label.required").next().each(function(input) {
        if ($(this).val() == "") {
            $(this).addClass("error");
            errors = true;
        }
        else {
            $(this).removeClass("error");
        }
    });

    let error_message = "Missing required information. "

    if ($("#attendees_table tr").length < 1) {
        errors = true;
        error_message += "At least one attendee required. ";
    }

    var email = $("input[name=email]").val();

    if (!isEmail(email)) {
        errors = true;
        $("input[name=email]").addClass("error");
        error_message += "Invalid email address. ";
    }

    $("[name=requested_surrogate]").each((index, input) => {
        let surrogate = $(input);
        let cell = surrogate.parent().next('td').find('input');
        if (surrogate.val() && !cell.val()) {
            errors = true;
            cell.addClass('error');
        }
        else {
            cell.removeClass('error');
        }
    });

    let youths = getYouths();

    if (youths.length > 0) {
        let signature = $("[name=youth_medical_signature]");
        let date = $("[name=youth_medical_date]");
        let phone = $("[name=youth_medical_phone]");
        for (input of [signature, date, phone]) {
            input.removeClass("error");
            if (!input.val()) {
                errors = true;
                input.addClass("error");
            }
        }
        let checkbox = $("[name=youth_medical_agreement]");
        if (!checkbox.is(":checked"))  {
            errors = true;
            checkbox.parent().addClass("error");
        }
        else {
            checkbox.parent().removeClass("error");
        }
    }

    $("[name=age]").removeClass("error");

    let allRows = getAttendeeRows();

    allRows.each((index, row) => {
        let r = $(row);
        let age = r.find("[name=age]");
        let age_group = r.find("[name=age_group]");
        if (age_group.val() != 'adult' && !age.val()) {
            errors = true;
            age.addClass("error");
        }
    });

    if (errors) {
        $(".danger.errors").html(error_message);
    }


    return errors;
}

$(document).ready(function() {
    var templates = fetch_templates();
    templates.done(function() {
        addEmptyAttendee();
    });
});

$('input[name=last_name]').change(function() {
    var first_name = $("input[name=first_name]").val();
    var last_name = $("input[name=last_name]").val();
    var first_attendee = $("#attendees_table input[name=name]").first();
    if (first_attendee.val() == "") {
        first_attendee.val(first_name + " " + last_name);
    }
});

$("#registrationForm").submit(function(e){
    e.preventDefault();
    var form = this;
    var errors = lookForErrors();
    if (!errors) {
        form.submit();
    }
});
