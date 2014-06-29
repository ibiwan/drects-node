(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init(
            require('./include/jquery'),
            require('./include/jquery-ui'),
            require('./parser'),
            require('./log').log
        );
    } else if ( typeof define === 'function' && define.amd ) {
        // "amd" (require.js)
        define(
            ['jquery', 'jquery-ui', './parser', './log'],
            function ($, jqueryui, parser, log) {
                return init($, jqueryui, parser, log.log);
            });
    }
})(function($, jqueryui, parser, log){ // init

    var _config = {};
    var configlabels = ['rex-ordering', 'rex-primaries'];
    var loadconfig = function loadconfig(tree)
    {
        for(var i = 0; i < configlabels.length; i++)
        {
            _config[configlabels[i]] = [];
        }
        loadconfiginner(tree);
    };
    var loadconfiginner = function loadconfiginner(tree)
        {
            if( tree instanceof Array )
            {
                for( var i = 0; i < tree.length; i++ )
                {
                    loadconfiginner(tree[i]);
                }
                return;
            }
            if( tree instanceof Object )
            {
                for( var key in tree )
                {
                    if( $.inArray(key, configlabels) > -1)
                    {
                        _config[key] = tree[key];
                        delete tree[key];
                    }
                    else
                    {
                        loadconfiginner(tree[key]);
                    }
                }
            }
        };
    var saveconfig = function saveconfig(tree)
        {
            for( var i = 0; i < configlabels.length; i++ )
            {
                var label = configlabels[i];
                tree[label] = _config[label];
            }
        };
    var forkey = function forkey(key)
    {
        return _config[key];
    };
    return { // interface
        'load'   : loadconfig,
        'save'   : saveconfig,
        'forkey' : forkey
    };
});
