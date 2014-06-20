(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init(
            require('./include/jquery'),
            require('./include/jquery-ui'),
            require('./parser'),
            require('./lexer'),
            require('./log').log
        );
    } else if ( typeof define === 'function' && define.amd ) {
        // "amd" (require.js)
        define(
            ['jquery', 'jquery-ui', './parser', './lexer', './log'],
            function ($, jqueryui, parser, lexer, log) {
                return init($, jqueryui, parser, lexer, log.log);
            });
    }
})(function($, jqueryui, parser, lex, log){ // init

    var collapsers = {
        'element-open'  : 'fa fa-chevron-right',
        'element-close' : 'fa fa-chevron-up',
        'member-open'   : 'fa fa-chevron-down',
        'member-close'  : 'fa fa-chevron-left'
    };
    var formula_nodes = [];

    var config = (function(){
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
    })();

    function gentree(data, primaryvalue, summaryholder)
    {
        function $newdiv(type, value)
        {
            return $('<div>' + value + '</div>').addClass(type);
        }
        function $makecontainerstack(type, index, $valwrapper, $valuenode, summarystr)
        {
            var $label = $newdiv('label', index);

            var $collapsebutton = $newdiv('controller', '<i class="' + collapsers[type + '-open'] + '"></i>')
                .data('type',       type)
                .data('$valuehtml', $valuenode)
                .data('content',    $valwrapper)
            ;
            $valwrapper.data('state', 'shown');

            var $labelstack = $newdiv('labelstack', '')
                .addClass((type === 'element') ? 'vertical' : 'horizontal')
                .append($collapsebutton)
                .append($label);

            var $wrapper = $newdiv(type, '')
                .append($labelstack)
                .append($valwrapper);

            if( summarystr )
            {
                var $summary = $newdiv('summary', summarystr).hide();
                $wrapper.append($summary);
                $collapsebutton.data('$summaryhtml', $summary);
            }
            return $wrapper;
        }
        function makeprimitivestack(type, data)
        {
            if( data[0] === '=' )
            {
                type = 'formula';
            }

            var $valuenode = $newdiv(type, data)
                .addClass('primitive')
                .data('type', type);

            var $primstack = $newdiv('primstack',  '')
                .append($valuenode)
                .addClass("horizontal")
                .data('$valuehtml', $valuenode);

            $valuenode.data('stack', $primstack);

            if( type === 'formula' )
            {
                $primstack.data('formula', data);
                formula_nodes.push($primstack);
            }

            return {'$stack': $primstack, '$valuehtml':$valuenode};
        }
        function makearray(data, primaryvalue)
        {
            var $htmlnode = $newdiv('array', '');

            var $$children = [];
            for( var i = 0; i < data.length; i++ )
            {
                var holder = {};
                var ret  = gentree(data[i], primaryvalue, holder);
                $$children.push(ret.$valuehtml);
                ret.$valuehtml.data('$parent', $htmlnode);

                var summarystr = (holder.val === undefined)  ? '' : holder.val;
                var $stack = $makecontainerstack('element', i, ret.$stack, ret.$valuehtml, summarystr);
                $htmlnode.append($stack);
            }
            $htmlnode.data('$$children', $$children);
            return {'$stack':$htmlnode, '$valuehtml':$htmlnode};
        }
        function makeobject(data, primaryvalue, summaryholder)
        {
            function sortkeys(keys)
            {
                var key;
                var sortedkeys = [];
                var whateverkeys = [];
                var allkeys = [];
                for(var i = 0; i < keys.length; i++)
                {
                    key = keys[i];
                    if( $.inArray(key, config.forkey('rex-ordering')) > -1 )
                    {
                        sortedkeys.push(key);
                    } else {
                        whateverkeys.push(key);
                    }
                }
                for(i = 0; i < config.forkey('rex-ordering').length; i++)
                {
                    key = config.forkey('rex-ordering')[i];
                    if($.inArray(key, sortedkeys) > -1)
                    {
                        allkeys.push(key);
                    }
                }
                allkeys = allkeys.concat(whateverkeys);
                return allkeys;
            }
            function getkeys(obj)
            {
                var keys = [];
                for( var key in obj )
                {
                    keys.push(key);
                }
                return keys;
            }
            var $htmlnode = $newdiv('object', '');

            var $$children = {};
            var keys     = sortkeys(getkeys(data));
            for( var i = 0; i < keys.length; i++ )
            {
                var key   = keys[i];
                var pv    = config.forkey('rex-primaries')[key];
                var usepv = (pv === undefined) ? primaryvalue : pv;
                if( key === primaryvalue )
                {
                    summaryholder.val = data[key];
                }

                var ret = gentree(data[key], usepv, summaryholder);
                $$children[key] = ret.$valuehtml;
                ret.$valuehtml.data('$parent', $htmlnode);

                var $stack = $makecontainerstack('member', key, ret.$stack, ret.$valuehtml, '');
                $htmlnode.append($stack);
            }
            $htmlnode.data('$$children', $$children);
            return {'$stack':$htmlnode, '$valuehtml':$htmlnode};
        }

        if( data === null )
        {
            data = "null";
        }

        var t = typeof(data);
        if( ["null", "number", "string", "boolean"].indexOf(t) > -1 )
        {
            return makeprimitivestack(t, data);
        }
        if( data instanceof Array )
        {
            return makearray(data, primaryvalue);
        }
        if( data instanceof Object )
        {
            return makeobject(data, primaryvalue, summaryholder);
        }
        console.trace();
        console.log(data);
        console.log("confused, now");
    }

    function printdom(htmlnode, depth)
    {
        if( !depth ) depth = 0;
        var tab = Array(depth+1).join("  ");
        switch(htmlnode.attr('class'))
        {
            case 'string':
            case 'number':
            case 'boolean':
            case 'null':
                console.log(tab + '"' + htmlnode.text() + '"');
                break;
            case 'array':
                (function printarray(){
                    var kids = htmlnode.data('$$children');
                    for( var i = 0; i < kids.length; i++ )
                    {
                        console.log(tab + i + ":");
                        printdom(kids[i], depth+1);
                    }
                })();
                break;
            case 'object':
                (function printobject(){
                    var kids = htmlnode.data('$$children');
                    for( var key in kids )
                    {
                        var kid = kids[key];
                        console.log(tab + key + ":");
                        printdom(kid, depth+1);
                    }
                })();
                break;
        }
    }

    function extractdata(htmlnode)
    {
        function extractarray(htmlnode)
        {
            var ret = [];
            var kids = htmlnode.data('$$children');
            for( var i = 0; i < kids.length; i++ )
            {
                var kid = kids[i];
                var element = extractdata(kid);
                ret.push(element);
            }
            return ret;
        }
        function extractobject(htmlnode)
        {
            var ret = {};
            var kids = htmlnode.data('$$children');
            for( var key in kids )
            {
                var kid = kids[key];
                var member = extractdata(kid);
                ret[key] = member;
            }
            return ret;
        }
        if( htmlnode.hasClass('string')  ||
            htmlnode.hasClass('number')  ||
            htmlnode.hasClass('boolean') ||
            htmlnode.hasClass('null')    )
        {
            var t = htmlnode.text();
            return t;
        }
        if( htmlnode.hasClass('formula') )
        {
            var f = htmlnode.data('stack').data('formula');
            return f;
        }
        if( htmlnode.hasClass('array') )
        {
            var a = extractarray(htmlnode);
            return a;
        }
        if( htmlnode.hasClass('object') )
        {
            var o = extractobject(htmlnode);
            return o;
        }
    }

    function save()
    {
        var savedata = extractdata($('#root'));
        config.save(savedata);
        var savejson = JSON.stringify(savedata);
        console.log(savejson);
        $.ajax("savedoc",
            {
                'type'     : 'POST',
                'dataType' : 'json',
                'data'     : {'file':savejson}
            })
            .done(function savedjson(returned_data, stringStatus, jqXHR){
                $('#message').text("saved, I think!");
                setTimeout(function(){
                    $('#message').text('');
                }, 5000);
            })
            .fail(function nosave(jqXHR, textStatus, errorThrown){
                var resp = JSON.parse(jqXHR.responseText);
                $('#message').text(resp.error);
            });
    }

    function handleToggle(eventObject)
    {
        var $sub       = $(this).data('content');
        var $summary   = $(this).data('$summaryhtml');

        // update collapser icon
        var direction  = ($sub.data('state') == 'shown') ? 'close' : 'open';
        var $collapser = $(this.firstChild)
            .attr('class', collapsers[$(this).data('type') + '-' + direction]);

        if( direction === 'open' )
        {
            if( $summary ) $summary.hide();
            $sub.show().data('state','shown');

            setTimeout(function(){
                $sub.removeClass('hidden');
            }, 10);
       } else {
            var $inner = $(this).data('$valuehtml');
            var $parent = $inner.data('$parent').data('$parent');

            $sub.addClass('hidden');
            setTimeout(function(){
                $sub.hide().data('state','hidden');
                if( $summary ) $summary.show();
                $parent.hide().show();
            }, 500);
        }
    }

    function handleEdit(eventObject)
    {
        function validate(type, value)
        {
            var validators = {
                'string'  : { 'func' : function(v){ return true; },
                              'err'  : 'all strings are strings, right?  right?!?' },
                'formula' : { 'func' : function(v){ return value.indexOf('=') === 0; },
                              'err'  : 'functions must start with "="' },
                'number'  : { 'func' : function(v){ return !isNaN(parseFloat(v)) && isFinite(v); },
                              'err'  : 'number fields must take numeric values' },
                'null'    : { 'func' : function(v){ return [null, '', 'null'].indexOf(v) > -1; },
                              'err'  : 'null fields must take null values' },
                'boolean' : { 'func' : function(v){ return [true, false, 'true', 'false', 'True', 'False'].indexOf(v) > -1; },
                              'err'  : 'boolean fields must take true/false values' }
            };
            if( !(type in validators) )
            {
                alert('unknown field type: ' + type);
                return false;
            }

            var validator = validators[type];

            if( validator.func(value) ) return true;
            alert(validator.err); return false;
        }

        var $displayfield;
        if( $(this).hasClass('primitive') ) {
            $displayfield = $(this);
        }

        var type   = $displayfield.data('type');
        var parent = $displayfield.parent();

        var $typefield = $('<select></select');
        var types = ['null','boolean','number','string', 'formula'];
        for(var i = 0; i < types.length; i++)
        {
            var cur = types[i];
            var sel = ((cur == type) ? 'selected' : '');
            var $option = $('<option value="' + cur + '" ' + sel + '>' + cur + '</option>');
            $typefield.append($option);
        }

        var field_contents;
        if( type === 'formula' )
        {
            field_contents = parent.data('formula');
        } else {
            field_contents = $displayfield.text();
        }

        var $editfield = $('<input type="text" value="' + field_contents + '"></input>');
        parent.append($typefield);
        parent.append($editfield);

        $displayfield.hide();

        $editfield.keypress(function editkeypress(event){
            if( event.which == 13 ) // return
            {
                var value = $editfield.val();
                var selectedtype = $typefield.val();
                var changed = (value != $displayfield.text() || type != selectedtype);
                if( !changed || validate(selectedtype, value) )
                {
                    $editfield.hide();
                    $typefield.hide();

                    $displayfield.show();

                    if( changed )
                    {
                        if( selectedtype === 'formula' )
                        {
                            parent.data('formula', value);
                            $displayfield.text('ERR');
                        } else {
                            $displayfield.text(value);
                            console.log("setting value:", value);
                        }
                        $displayfield.attr('class', selectedtype + ' primitive');
                        $displayfield.data('type', selectedtype);

                        calculateFormulas();
                        save();
                    }
                }
            }
        });
        $typefield.change(function changetype(){
            var newtype = $(this).val();
            var defaults = {'null':'null', 'boolean':'false', 'number':'0', 'string':'text'};
            $editfield.val( (newtype !== type) ? defaults[newtype] : $displayfield.text() );
        });
    }

    function parse_formula(formula, io)
    {
        var tokenstream;
        try {
            tokenstream = lex.lex(formula);
            log('lex', tokenstream);
        }catch(e){
            log('lex_error', e);
            log('lex_error', e.stack);
            return false;
        }
        try {
            var formula_io = {'context':io.context};
            parser.parse(tokenstream, formula_io);
            io.value = formula_io.value;
        }catch(e){
            log('parse_error', e);
            log('parse_error', e.stack);
            return false;
        }
        return true;
    }

    function calculateFormulas()
    {
        for( var i = 0; i < formula_nodes.length; i++ )
        {
            var node = formula_nodes[i];

            var formula = node.data('formula');
            var io = {'context':{
                'root':$('#root'),
                'curr':node.data('$valuehtml')
            }};

            try {
                var success = parse_formula(formula, io);
                if( success )
                {
                    node.data('$valuehtml').text(io.value);
                }
            }catch(e){
                node.data('$valuehtml').text('incalculable!');
                console.log(e);
            }
        }
    }

    $(function initialize(){
        $("body").disableSelection();
        $.ajax("getdoc")
            .done(function gotjson(file_data, stringStatus, jqXHR){
                config.load(file_data);

                var summaryholder = {};
                sub = gentree(file_data, "root", summaryholder);

                var $htmlroot = $('#root')
                    .attr('class',    'object')
                    .data('$parent',   null)
                    .data('$$children', sub.$stack.data('$$children'));

                $htmlroot.append(sub.$stack);
                sub.$stack.data('$parent', $htmlroot);

                $('.controller').click(handleToggle);
                $('.primitive').dblclick(handleEdit);

                calculateFormulas();
            });
    });
});
