requirejs.config({
    "baseUrl" : "files",
    "paths"   : {
        "jquery"      : "include/jquery",
        "jquery-ui"   : "include/jquery-ui",
        "contextmenu" : "include/jquery.contextmenu",
        "vue"         : "include/vue"
    },
});

// Load the main app module to start the app
requirejs(["./ui"]);
