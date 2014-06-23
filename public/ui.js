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

    function gentree(data, primaryvalue, summary_holder)
    {
        function addbackrefs($$children, $parent, parent_name) {
            for (var i in $$children) {
                $$children[i].data(parent_name, $parent);
            }
        }
        function $newdiv(type, value)
        {
            return $('<div>' + value + '</div>').addClass(type);
        }
        function $make_field_stack(type, selector, $data_node)
        {
            $data_node.data('state', 'shown');

            var $controller = $newdiv('controller', '<i class="' + collapsers[type + '-open'] + '"></i>');
            var $label      = $newdiv('label', selector);
            var $label_edit = $('<input type="text" value=""></input>').hide();

            var $labelstack = $newdiv('labelstack', '')
                .append($controller).data('$controller', $controller)
                .append(     $label).data(     '$label',      $label)
                .append($label_edit).data('$label_edit', $label_edit)
                .addClass((type === 'element') ? 'vertical' : 'horizontal');

            var $field = $newdiv(type, '')
                .append($labelstack).data('$labelstack', $labelstack)
                .append ($data_node).data( '$data_node',  $data_node)
                .data('selector', selector.toString());

            addbackrefs([$labelstack, $controller, $label, $label_edit, $data_node], $field, '$field');

            return $field;
        }
        function $make_type_selector(type) {
            var $type_selector = $('<select></select');
            var types = ['null','boolean','number','string', 'formula'];
            for(var i in types)
            {
                var cur = types[i];
                var sel = ((cur == type) ? 'selected' : '');
                var $option = $('<option value="' + cur + '" ' + sel + '>' + cur + '</option>');
                $type_selector.append($option);
            }

            return $type_selector;
        }

        function $make_scalar(type, data)
        {
            var $value_display = $newdiv('value_display', data).addClass(type);
            var $type_selector = $make_type_selector(type).hide();
            var $value_edit    = $('<input type="text" value=""></input>').hide();

            var $scalar = $newdiv('scalar', '')
                .addClass('horizontal')

                .append($value_display).data('$value_display', $value_display)
                .append($type_selector).data('$type_selector', $type_selector)
                .append(   $value_edit).data(   '$value_edit',    $value_edit)

                .data('type',          type)
                .data('raw_value',     data)
                .data('display_value', data) // will only differ for formula nodes
            ;

            addbackrefs([$value_display, $type_selector, $value_edit], $scalar, '$scalar');

            if( type === 'formula' )
            {
                formula_nodes.push($scalar);
            }

            return $scalar;
        }
        function $make_array(data, primaryvalue)
        {
            var $array = $newdiv('array', '').data('type', 'array');

            var $$fields = [];
            for( var i = 0; i < data.length; i++ )
            {
                var summary_holder = {};
                var $data_node     = gentree(data[i], primaryvalue, summary_holder);
                var summarystr     = (summary_holder.val === undefined)  ? '' : summary_holder.val;

                var $field = $make_field_stack('element', i, $data_node)
                    .data('$composition', $array);

                if( summarystr )
                {
                    var $summary = $newdiv('summary', summarystr)
                        .data('field', $field)
                        .hide();
                    $field
                        .append($summary)
                        .data('$summary', $summary);
                }

                $$fields.push($field);
                $array.append($field);
            }
            $array.data('$$fields', $$fields);
            return $array;
        }
        function $make_object(data, primaryvalue, summary_holder)
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
                return sortkeys(keys);
            }
            var $object = $newdiv('object', '').data('type', 'object');

            var $$fields = [];
            var keys     = getkeys(data);
            for( var i = 0; i < keys.length; i++ )
            {
                var key   = keys[i];
                var pv    = config.forkey('rex-primaries')[key];
                var usepv = (pv === undefined) ? primaryvalue : pv;
                if( key === primaryvalue )
                {
                    summary_holder.val = data[key];
                }

                var $data_node = gentree(data[key], usepv, summary_holder);

                var $field = $make_field_stack('member', key, $data_node)
                    .data('$composition', $object);

                $$fields.push($field);
                $object.append($field);
            }
            $object.data('$$fields', $$fields);
            return $object;
        }

        if( data === null )
        {
            data = "null"; // what's this fix?
        }

        var t = typeof(data);
        if( ["null", "number", "string", "boolean"].indexOf(t) > -1 )
        {
            if( data[0] === '=' )
            {
                t = "formula";
            }
            return $make_scalar(t, data);
        }
        if( data instanceof Array )
        {
            return $make_array(data, primaryvalue);
        }
        if( data instanceof Object )
        {
            return $make_object(data, primaryvalue, summary_holder);
        }
        console.trace();
        console.log(data);
        console.log("confused, now");
    }

    function printdom(htmlnode, depth)
    {
        if( !depth ) depth = 0;
        var tab = Array(depth+1).join("  ");
        var type = htmlnode.data('type');
        switch(type)
        {
            case 'formula':
                console.log(tab + '"' + htmlnode.data('raw_value') + '"');
                // intentional fallthrough
            case 'string':
            case 'number':
            case 'boolean':
            case 'null':
                console.log(tab + '"' + htmlnode.data('display_value') + '"');
                break;
            case 'array':
            case 'object':
                (function printcomposition(){
                    var $$fields = htmlnode.data('$$fields');
                    for( var i in $$fields )
                    {
                        var $field = $$fields[i];
                        var sel = $field.data('selector');
                        console.log(tab + sel + ":");
                        printdom($field.data('$data_node'), depth+1);
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
            var f = htmlnode.data('$primstack').data('formula');
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
        var savedata = extractdata($('#document').data('document'));
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
        var $sub       = $(this).data('$content');
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


        var field_contents;
        if( type === 'formula' )
        {
            field_contents = parent.data('formula');
        } else {
            field_contents = $displayfield.text();
        }

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
                            // console.log("setting value:", value);
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
        for( var i in formula_nodes )
        {
            var node = formula_nodes[i];

            var formula = node.data('raw_value');

            // console.log("FORMULA:", formula);

            var io = {'context':{
                'root':$('#document').data('document'),
                'curr':node
            }};

            try {
                var success = parse_formula(formula, io);
                // console.log("calculation output:", io);
                if( success )
                {
                    // console.log("old display value:" ,node.data('display_value'));
                    // console.log("display field", node.data('$value_display'));
                    node.data('display_value', io.value);
                    node.data('$value_display').text(io.value);
                }
            }catch(e){
                node.data('$displayfield').text('incalculable!');
                console.log(e);
            }
        }
    }

    $(function initialize(){
        $("body").disableSelection();
        $.ajax("getdoc")
            .done(function gotjson(file_data, stringStatus, jqXHR){
                config.load(file_data);

                var summary_holder = {};
                var doc = gentree(file_data, "root", summary_holder);

                var $htmlroot = $('#document')
                    .append(doc)
                    .data('document', doc);

                $('.controller').click(handleToggle);
                $('.primitive').dblclick(handleEdit);

                calculateFormulas();

                printdom(doc);
            });
    });
});
