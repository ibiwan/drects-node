requirejs.config({
    "baseUrl" : "files",
    "paths"   : {
        "jquery"      : "include/jquery",
        "jquery-ui"   : "include/jquery-ui",
        "contextmenu" : "include/jquery.contextmenu"
    },
});

// Load the main app module to start the app
requirejs(["./ui"]);
