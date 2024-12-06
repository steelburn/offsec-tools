function makePopper(ele) {
  var ref = ele.popperRef(); // used only for positioning
  ele.tippy = tippy(ref, {
    // tippy options:
    content: () => {
      let content = document.createElement("div");
      content.innerHTML = ele.id();
      return content;
    },
    trigger: "manual", // probably want manual mode
  });
}

window.onpopstate = function (event) {
  $("body").html(event.state);
};

function set_query(index) {
  query = queries[index];
  $("#aqlquerytext").val(query.query);
}

function dragMoveListener(event) {
  var target = event.target,
    // keep the dragged position in the data-x/data-y attributes
    x = (parseFloat(target.getAttribute("data-x")) || 0) + event.dx,
    y = (parseFloat(target.getAttribute("data-y")) || 0) + event.dy;

  // translate the element
  target.style.webkitTransform = target.style.transform =
    "translate(" + x + "px, " + y + "px)";

  // update the posiion attributes
  target.setAttribute("data-x", x);
  target.setAttribute("data-y", y);

  if (!target.classList.contains("window-front")) {
    console.log($(".window-front"));
    $(".window-front").removeClass("window-front");
    console.log($(".window-front"));
    target.classList.add("window-front");
  }
}

function get_window(id) {
  return $("#windows > #window_" + id);
}

function new_window(
  id,
  title,
  content,
  alignment = "topleft",
  height = 0,
  width = 0
) {
  // Other windows are not in front
  $(".window-front").removeClass("window-front");

  var mywindow = $(`#windows #window_${id}`);
  var itsnew = false;

  var maxheight = $(window).height() * 0.8;
  var maxwidth = $(window).width() * 0.6;

  xpos = 0;
  ypos = 0;

  switch (alignment) {
    case "topleft":
      // default
      break;
    case "center":
      xpos = window.innerWidth / 2;
      ypos = window.innerHeight / 2;
      break;
  }

  // add the new one
  if (mywindow.length == 0) {
    mywindow = $(
      `<div class="window bg-dark shadow border pointer-events-auto window-front" style="transform: translate(${xpos}px, ${ypos}px);" data-x=${xpos} data-y=${ypos} id="window_${id}">
            <div id='header' class='window-header mb-1 bg-primary text-dark p-1'>
            <span id="title" class="col">${title}</span><span id="close" class="border float-end cursor-pointer">X</span>
            </div>
            <div class="window-wrapper">
            <div class="window-content p-1" id="contents">${content}</div>
            </div>
            </div>`
    );

    $("#windows").append(mywindow);

    // closing
    $("#close", mywindow).click(function (event) {
      $(this).parents(".window").remove();
    });

    interact("#window_" + id)
      // .origin('self')
      .resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        margin: 5,
        origin: self,
        listeners: {
          move(event) {
            var target = event.target;
            var x = parseFloat(target.getAttribute("data-x")) || 0;
            var y = parseFloat(target.getAttribute("data-y")) || 0;

            // update the element's style
            target.style.width = event.rect.width + "px";
            target.style.height = event.rect.height + "px";

            if (!target.classList.contains("window-front")) {
              $(".window-front").removeClass("window-front");
              target.classList.add("window-front");
            }

            // translate when resizing from top or left edges
            x += event.deltaRect.left;
            y += event.deltaRect.top;

            // Ensure window does not slip too far up or left
            x = Math.max(0, x);
            y = Math.max(0, y);

            target.style.transform = "translate(" + x + "px," + y + "px)";

            target.setAttribute("data-x", x);
            target.setAttribute("data-y", y);
          },
        },
        modifiers: [
          // keep the edges inside the parent
          interact.modifiers.restrictEdges({
            outer: "parent",
          }),

          // min and max size
          interact.modifiers.restrictSize({
            min: { width: 200, height: 150 },
            max: { width: maxwidth, height: maxheight },
          }),
        ],

        inertia: true,
      })
      .draggable({
        onmove: window.dragMoveListener,
        modifiers: [
          interact.modifiers.restrictRect({
            restriction: "parent",
            endOnly: true,
          }),
        ],
        allowFrom: ".window-header",
      });

    if (height > 0) {
      mywindow.height(height);
    }
    if (width > 0) {
      mywindow.width(width);
    }

    if (mywindow.height() > maxheight) {
      mywindow.height(maxheight);
    }
    if (mywindow.width() > maxwidth) {
      mywindow.width(maxwidth);
    }
  } else {
    $("#title", mywindow).html(title);
    $("#contents", mywindow).html(content);
    mywindow.addClass("window-front");
  }

  // Bring to front on mouse down
  mywindow.mousedown(function () {
    var win = $(this);
    if (!win.hasClass("window-front")) {
      $("#windows div").removeClass("window-front");
      win.addClass("window-front");
    }
  });

  return itsnew;
}

function busystatus(busytext) {
  $("#status")
    .html(
      `<div class="text-center pb-3">` +
        busytext +
        `</div>
            <div class="p-2">
        <div class="sk-center sk-chase">
  <div class="sk-chase-dot"></div>
  <div class="sk-chase-dot"></div>
  <div class="sk-chase-dot"></div>
  <div class="sk-chase-dot"></div>
  <div class="sk-chase-dot"></div>
  <div class="sk-chase-dot"></div>
</div>
            </div>`
    )
    .show();
}

function encodeaqlquery() {
  q = JSON.stringify(
    $("#aqlqueryform, #analysisoptionsform")
      .serializeArray()
      .reduce(function (m, o) {
        // is it a checked checkbox?
        // console.log(o);
        // console.log($("#" + o.name).prop("type"));
        if ($("#" + o.name).is(":checked")) {
          m[o.name] = true;
        } else if ($("#" + o.name).prop("type") == "number") {
          m[o.name] = Number(o.value);
        } else {
          m[o.name] = o.value;
        }
        return m;
      }, {})
  );

  return q;
}

function aqlanalyze(e) {
  busystatus("Analyzing");

  $.ajax({
    type: "POST",
    url: "/api/aql/analyze",
    contentType: "charset=utf-8",
    data: encodeaqlquery(),
    dataType: "json",
    success: function (data) {
      if (data.total == 0) {
        $("#status").html("No results").show();
      } else {
        // Remove all windows
        $("#windows div").remove();

        // Hide status
        $("#status").hide();

        var info = "";
        if (data.nodecounts["start"] > 0 && data.nodecounts["end"] > 0) {
          info +=
            "Located " +
            data.nodecounts["start"] +
            " start nodes and " +
            data.nodecounts["end"] +
            " end nodes<hr/>";
        }

        info += '<table class="w-100">';
        for (var objecttype in data.resulttypes) {
          info +=
            '<tr><td class="text-right pr-5">' +
            data.resulttypes[objecttype] +
            "</td><td>" +
            objecttype +
            "</td></tr>";
        }
        info +=
          '<tr><td class="text-right pr-5">' +
          data.total +
          "</td><td>total nodes in analysis</td></tr>";
        if (data.removed > 0) {
          info +=
            '<tr><td class="text-right pr-5"><b>' +
            data.removed +
            "</b></td><td><b>nodes were removed by node limiter</b></td></tr>";
        }
        info += "</table>";

        new_window("results", "Query results", info);

        if ($("infowrap").prop("width") == 0) {
          $("#infowrap").animate({ width: "toggle" }, 400);
        }

        if (
          $("#hideoptionsonanalysis").prop("checked") &&
          $("#optionspanel").prop("width") != 0
        ) {
          $("#optionspanel").animate({ width: "toggle" }, 400);
        }

        if (
          $("#hidequeryonanalysis").prop("checked") &&
          $("#querydiv").prop("height") != 0
        ) {
          $("#querydiv").slideToggle("fast");
        }

        initgraph(data.elements);

        history.pushState($("body").html(), "adalanche");
      }
    },
    error: function (xhr, status, error) {
      $("#status")
        .html("Problem loading graph:<br>" + xhr.responseText)
        .show();
    },
  });
}

function refreshProgress() {
  var lastwasidle = false;
  var progressSocket = new WebSocket(
    location.origin.replace(/^http/, "ws") + "/api/backend/progress"
  );

  progressSocket.onerror = function (event) {
    $("#backendstatus").html("Adalanche backend is still offline");
    $("#upperstatus").show();
    $("#progressbars").empty().hide();
    $("#offlineblur").show();
    setTimeout(refreshProgress, 3000);
  };

  progressSocket.onclose = function (event) {
    $("#backendstatus").html("Adalanche backend is offline");
    $("#upperstatus").show();
    $("#progressbars").empty().hide();
    $("#offlineblur").show();
    setTimeout(refreshProgress, 3000);
  };

  progressSocket.onmessage = function (message) {
    $("#offlineblur").hide();
    progress = $.parseJSON(message.data);

    status = progress.status;

    progressbars = progress.progressbars;
    if (progressbars.length > 0) {
      lastwasidle = false;
      keepProgressbars = new Set();
      for (i in progressbars) {
        progressbar = progressbars[i];
        if (progressbar.Done) {
          continue;
        }
        keepProgressbars.add(progressbar.ID);

        // find progressbar
        pb = $("#" + progressbar.ID);
        if (pb.length == 0 && !progressbar.Done) {
          $("#progressbars").append(
            `<div class="progress-group"><span class="progress-group-label">` +
              progressbar.Title +
              `</span><div class="progress"><div id="` +
              progressbar.ID +
              `" class="progress-bar rounded-0" role="progressbar" aria-valuemin="0" aria-valuemax="100"></div></div><span class="progress-group-label"></span></div>`
          );
          pb = $("#" + progressbar.ID);
        }

        // Update progressbar
        pb.attr("aria-valuenow", progressbar.Percent.toFixed(0));
        pb.css("width", progressbar.Percent.toFixed(0) + "%");
        pb.parent()
          .next()
          .html(progressbar.Percent.toFixed(2) + "%");
      }
      // remove old progressbars
      $("#progressbars .progress-bar").each(function (index) {
        id = $(this).attr("id");
        if (!keepProgressbars.has(id)) {
          $(this)
            .parent()
            .parent()
            .slideUp("slow", function () {
              $(this).remove();
            });
        }
      });

      $("#upperstatus").show();
      $("#progressbars").show();
      $("#backendstatus").html("Adalanche is processing");
    } else {
      if (!lastwasidle) {
        $("#progressbars").empty().hide();
        $("#backendstatus").html("Adalanche backend is idle");
        $("#upperstatus").fadeOut("slow");
      }
      lastwasidle = true;
    }
  };
}

refreshProgress();

function toast(contents) {
  Toastify({
    text: contents,
    duration: 10000,
    // destination: "https://github.com/apvarun/toastify-js",
    newWindow: true,
    close: true,
    gravity: "top", // `top` or `bottom`
    position: "left", // `left`, `center` or `right`
    stopOnFocus: true, // Prevents dismissing of toast on hover
    style: {
      background: "orange"
      // background: "linear-gradient(to right, #00b09b, #96c93d)",
    },
    // onClick: function () {}, // Callback after click
  }).showToast();
}

var firstQueryLoad = true;

var queries;
function updateQueries() {
  $.ajax({
    url: "/api/backend/queries",
    dataType: "json",
    success: function (querylist) {
      queries = querylist;
      dropdowncontent = $("#aqlqueries");
      dropdowncontent.empty();

      for (i in queries) {
        query = queries[i];
        item =
          "<li " +
          (query.default ? 'id="defaultquery"' : "") +
          ' class="dropdown-item" querynum=' +
          i +
          " queryname='"+query.name+"'>" +
          query.name +
          (query.user_defined ? '<i class="float-end bi-eraser"></i>' : "") +
          "</li>";
        dropdowncontent.append(item);
      }

      // Predefined queries dropdown button
      $("#aqlqueries li").on("click", "", function (event) {
        if (event.target !== this) return; // not children, only the li

        console.log("You clicked the drop downs", event.target);
        set_query(event.target.getAttribute("querynum"));
        $("#queriesbutton").toggleClass("active");
        $("#queriesdropdown").toggleClass("show");
      });

      // Delete user defined queries
      $("#aqlqueries i").on("click", "", function (event) {
        console.log(jQuery(this).parent().get(0));
        queryname = $(this).parent().get(0).getAttribute("queryname");
        $.ajax({
          type: "DELETE",
          url: "api/backend/queries/" + queryname,
          error: function (xhr, status, error) {
            toast("Error deleting query: " + error);
          },
          success: function (data) {
            toast("Query deleted successfully");
            updateQueries();
          },
        });
        console.log(event);
      });


      if (firstQueryLoad) {
        console.log("Setting default query ...");
        set_query($("#defaultquery").attr("querynum"));
        firstQueryLoad = false;
      }
    },
  });
}

// When we´re ready ...
$(function () {
  // Initial GUI setup
  $("#infopop").on("click", function () {
    $("#infowrap").animate({ width: "toggle" }, 400);
  });

  $("#optionstogglevisibility").on("click", function () {
    $("#optionspanel").animate({ width: "toggle" }, 400);
  });

  $("[data-bs-toggle='tooltip']").each(function () {
    new bootstrap.Tooltip($(this));
  });

  // autosize($('#querytext'));

  $("#explore").on("click", function () {
    new_window(
      "explore",
      "Explore objects",
      "<div id='exploretree' class='jstree-default-dark'></div>"
    );
    $("#exploretree")
      .jstree({
        core: {
          multiple: false,
          data: {
            url: "/api/tree",
            dataType: "json",
            data: function (node) {
              return { id: node.id };
            },
          },
        },
        types: {
          default: {
            icon: "glyphicon glyphicon-flash",
          },
          demo: {
            icon: "glyphicon glyphicon-ok",
          },
        },
        state: { key: "adalanche_explore" },
        plugins: ["sort", "types", "state", "wholerow"],
      })
      .on("select_node.jstree", function (e, d) {
        if (d.event == undefined) {
          return;
        }
        if (d.event.type == "click") {
          $.ajax({
            type: "GET",
            url: "api/details/id/" + d.node.id, // n123 format -> 123
            dataType: "json",
            success: function (data) {
              // details = rendernode(data)
              var details = renderdetails(data);
              new_window("details_" + d.node.id, "Item details", details);
            },
            // error: function (xhr, status, error) {
            //     newwindow("details", "Node details", rendernode(evt.target) + "<div>Couldn't load details:" + xhr.responseText + "</div>");
            // }
          });
        }
      });
  });

  $("#savequerybutton").on("click", function () {
    // open new windows with the save dialog
    new_window(
      "save_query",
      "Save query",
      `Name: <input type='text' id='savequeryname'>
<div><button id="savequerydialogbutton" class="float-end">Save</button></div>`,
      "center"
    );

    // tie the button handler to the button
    $("#savequerydialogbutton").on("click", function () {
      // POST the encoded query using ajax and display results
      $.ajax({
        url: "/api/backend/queries/" + $("#savequeryname").val(),
        method: "PUT",
        dataType: "json",
        data: encodeaqlquery(),
        error: function (xhr, status, error) {
          toast("Error saving query: "+error);
        },
        success: function (data) {
          toast("Query saved successfully");
          updateQueries(); // refresh the list
        },
        complete: function () {
          get_window("save_query").remove();
        },
      });
    });
  });

  // QUERY FORM
  // $("#querydiv").slideUp("fast")
  $("#togglequeryvisible").on("click", function () {
    $("#querybox").slideToggle("fast");
  });

  // $('[data-toggle="tooltip"]').tooltip()

  let aqlchangetimer;
  $("#aqlquerytext").on("input", function (e) {
    clearTimeout(aqlchangetimer);
    aqlchangetimer = setTimeout(function () {
      // check query for errors when user has been idle for 200ms
      $.ajax({
        type: "GET",
        url: "/api/aql/validatequery",
        data: {
          query: e.target.value,
        },
        success: function (data) {
          console.log(data);
          $("#aqlanalyzebutton").attr("disabled", false);
          $("#aqlqueryerror").hide();
        },
        error: function (xhr, status, error) {
          $("#aqlanalyzebutton").attr("disabled", true);
          $("#aqlqueryerror").html(xhr.responseText).show();
        },
      });
    }, 200);
  });

  // Display stats on screen
  $.ajax({
    url: "api/backend/statistics",
    dataType: "json",
    success: function (data) {
      statustext =
        "<div class='text-center pt-10'><img height=128 src='icons/adalanche-logo.svg'></div><div class='text-center'><h2>" +
        data.adalanche.program +
        "</h2><b>" +
        data.adalanche.shortversion +
        "</b><p><p>";

      if (data.adalanche.status == "Ready") {
        statustext +=
          data.statistics.Total +
          " objects connected by " +
          data.statistics.PwnConnections +
          " links</p><p>";
      } else {
        statustext += "Backend status: " + data.adalanche.status;
      }

      first = true;
      for (datatype in data.statistics) {
        if (datatype == "PwnConnections" || datatype == "Total") {
          continue;
        }
        if (!first) {
          statustext += ", ";
        }
        count = data.statistics[datatype];
        statustext += count + " " + datatype;
        first = false;
      }

      statustext += "</p></div>";

      $("#status").html(statustext).show().delay(15000).fadeOut(2000);
      $("#programinfo").html(
        data.adalanche.program + " " + data.adalanche.shortversion
      );
    },
    error: function (xhr, status, error) {
      $("#status")
        .html("guru meditation:<br>" + xhr.responseText)
        .show();
    },
  });

  $("#graphlayout").change(function () {
    layout = $(this).val();
    if (cy) {
      // render graph with new layout if there is one
      getGraphlayout(layout).run();
    }
  });

  $("#nodesizes").change(function () {
    if (cy) {
      applyNodeStyles(cy);
    }
  });

  $("#nodelabels").change(function () {
    if (cy) {
      cy.style().update();
    }
  });

  $.ajax({
    type: "GET",
    url: "/api/backend/filteroptions",
    dataType: "json",
    success: function (data) {
      buttons = `<table class="w-100">`;
      data.edges.sort((a, b) => (a.name > b.name ? 1 : -1));
      for (i in data.edges) {
        method = data.edges[i];

        buttons += '<tr class="pb-1">';

        buttons +=
          `<td class="overflow-hidden font-size-12 w-100" lookup="` +
          method.name +
          `">` +
          method.name;
        `</td>`;

        buttons += '<td class="checkbox-button no-wrap">';
        buttons +=
          `<input type="checkbox" data-column="first" data-default=` +
          method.defaultenabled_f +
          ` ` +
          (method.defaultenabled_f ? "checked" : "") +
          ` id="` +
          method.lookup +
          `_f" name="` +
          method.lookup +
          `" autocomplete="off">`;
        buttons +=
          `<label for="` +
          method.lookup +
          `_f" class ="btn btn-sm mb-0">F</label>`;
        buttons +=
          ` <input type="checkbox" data-column="middle" data-default=` +
          method.defaultenabled_m +
          ` ` +
          (method.defaultenabled_m ? "checked" : "") +
          ` id="` +
          method.lookup +
          `_m" name="` +
          method.lookup +
          `" autocomplete="off">`;
        buttons +=
          `<label for="` +
          method.lookup +
          `_m" class ="btn btn-sm mb-0">M</label>`;
        buttons +=
          ` <input type="checkbox" data-column="end" data-default=` +
          method.defaultenabled_l +
          ` ` +
          (method.defaultenabled_l ? "checked" : "") +
          ` id="` +
          method.lookup +
          `_l" name="` +
          method.lookup +
          `" autocomplete="off">`;
        buttons +=
          `<label for="` +
          method.lookup +
          `_l" class ="btn btn-sm mb-0">L</label>`;
        buttons += "</td>";

        buttons += "</tr>";
      }
      buttons += "</table>";
      $("#edgefilter").html(buttons);

      data.objecttypes.sort((a, b) => (a.name > b.name ? 1 : -1));
      buttons = `<table class="w-100">`;
      for (i in data.objecttypes) {
        objecttype = data.objecttypes[i];

        buttons += '<tr class="pb-1">';

        buttons +=
          `<td class="overflow-hidden font-size-12 w-100" lookup="` +
          objecttype.name +
          `">` +
          objecttype.name;
        `</td>`;
        buttons += '<td class="checkbox-button no-wrap">';

        buttons +=
          `<input type="checkbox" data-column="first" data-default=` +
          objecttype.defaultenabled_f +
          ` ` +
          (objecttype.defaultenabled_f ? "checked" : "") +
          ` id="` +
          objecttype.lookup +
          `_f" name="` +
          objecttype.lookup +
          `" autocomplete="off">`;
        buttons +=
          `<label for="` +
          objecttype.lookup +
          `_f" class ="btn btn-sm mb-0">F</label>`;
        buttons +=
          ` <input type="checkbox" data-column="middle" data-default=` +
          objecttype.defaultenabled_m +
          ` ` +
          (objecttype.defaultenabled_m ? "checked" : "") +
          ` id="` +
          objecttype.lookup +
          `_m" name="` +
          objecttype.lookup +
          `" autocomplete="off">`;
        buttons +=
          `<label for="` +
          objecttype.lookup +
          `_m" class ="btn btn-sm mb-0">M</label>`;
        buttons +=
          ` <input type="checkbox" data-column="last" data-default=` +
          objecttype.defaultenabled_l +
          ` ` +
          (objecttype.defaultenabled_l ? "checked" : "") +
          ` id="` +
          objecttype.lookup +
          `_l" name="` +
          objecttype.lookup +
          `" autocomplete="off">`;
        buttons +=
          `<label for="` +
          objecttype.lookup +
          `_l" class ="btn btn-sm mb-0">L</label>`;

        buttons += "</td>";

        buttons += "</tr>";
      }
      buttons += "</table>";
      $("#objecttypefilter").html(buttons);
    },
  });

  updateQueries();

  $(document).on("prefereces.loaded", function (evt) {
    if (getpref("run.query.on.startup")) {
      analyze();
    }
  });

  // End of on document loaded function
});
