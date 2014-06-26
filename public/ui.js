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
                .append($labelstack) // .data('$labelstack', $labelstack) // nobody seems to care
                .append ($data_node).data( '$data_node',  $data_node)
                .data('selector', selector.toString())
                .data('type', type);

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
                var config_keys = config.forkey('rex-ordering');
                var sortedkeys = [];
                var whateverkeys = [];
                var allkeys = [];
                var has_other = $.inArray('OTHER', config_keys) > -1;

                for(var i in keys)
                {
                    key = keys[i];
                    if( $.inArray(key, config_keys) > -1  )
                    {
                        sortedkeys.push(key);
                    } else {
                        whateverkeys.push(key);
                    }
                }

                for(i in config_keys)
                {
                    key = config_keys[i];
                    if( key === 'OTHER' )
                    {
                        allkeys = allkeys.concat(whateverkeys);
                    } else if( $.inArray(key, sortedkeys) > -1 )
                    {
                        allkeys.push(key);
                    }
                }

                if( !has_other )
                {
                    allkeys = allkeys.concat(whateverkeys);
                }

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

        // if( data === null )
        // {
        //     data = "null"; // what's this fix?
        // }

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
            case 'string':
            case 'number':
            case 'boolean':
            case 'null':
                if( type === 'formula')
                {
                    console.log(tab + '"' + htmlnode.data('raw_value') + '"');
                }
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
        var type = htmlnode.data('type');
        if( ['string', 'number', 'boolean', 'null', 'formula'].indexOf(type) > -1 )
        {
            var t = htmlnode.data('raw_value');
            return t;
        }
        if(['array', 'object'].indexOf(type) > -1 )
        {
            var a = []; var o = {};
            var $$fields = htmlnode.data('$$fields');
            for( var i in $$fields )
            {
                var $field = $$fields[i];
                var field = extractdata($field.data('$data_node'));
                if( type === 'array' )
                {
                    a.push(field);
                } else {
                    var key = $field.data('selector');
                    o[key] = field;
                }
            }
            return type === 'array' ? a : o;
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
        var $field      = $(this).data('$field');
        var $data_node  = $field.data('$data_node');
        var $summary    = $field.data('$summary');

        // update collapser icon
        var direction  = ($data_node.data('state') == 'shown') ? 'close' : 'open';
        var type = $field.data('type');

        // arrow is first child of controller ("this")
        $($(this).children(':first')).attr('class', collapsers[type + '-' + direction]);

        if( direction === 'open' )
        {
            if( $summary ) $summary.hide();
            $data_node.show().data('state','shown');

            setTimeout(function(){
                $data_node.removeClass('hidden');
            }, 10);
       } else {
            $data_node.addClass('hidden');
            setTimeout(function(){
                $data_node.hide().data('state','hidden');
                if( $summary ) $summary.show();
                $field.hide().show();
            }, 500);
        }
    }

    function stringToBoolean(string){
        switch(string.toLowerCase()){
            case "true": case "yes": case "1": return true;
            default: return false;
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

        // "this" is $scalar
        var $scalar = $(this);

        var old_type       = $scalar.data('type');

        var $value_display = $scalar.data('$value_display');
        var $type_selector = $scalar.data('$type_selector');
        var $value_edit    = $scalar.data('$value_edit');

        var old_value = $scalar.data('raw_value').toString();
        $value_edit.val(old_value);

        $value_display.hide();
        $type_selector.show();
        $value_edit.show();

        $value_edit.keypress(function editkeypress(event) {
            if( event.which == 13 ) { // return key
                var new_value = $value_edit.val();
                var new_type  = $type_selector.val();
                var changed   = (new_value != old_value || old_type != new_type);
                if( !changed || validate(new_type, new_value) ) {
                    $value_edit.hide();
                    $type_selector.hide();
                    $value_display.show();

                    if( changed ) {
                        switch(new_type) {
                            case 'string':
                                break;
                            case 'number':
                                new_value = parseFloat(new_value);
                                break;
                            case 'null':
                                new_value = null;
                                break;
                            case 'boolean':
                                new_value = stringToBoolean(new_value);
                                break;
                        }


                        $scalar.data('raw_value', new_value);
                        $value_display.data('type', new_type);

                        var display_value = (new_type === 'formula') ? 'ERR' : new_value;

                        $scalar.data('display_value', display_value);
                        $value_display.html(display_value);
                        $scalar.attr('class', new_type + ' scalar');

                        calculateFormulas();
                        save();
                    }
                }
            }
        });
        $type_selector.change( function changetype() {
            var new_type = $(this).val(); // "this" here is the drop-down
            var defaults = {'null':'null', 'boolean':'false', 'number':'0', 'string':'text', 'formula':'='};
            $value_edit.val( (new_type !== old_type) ? defaults[new_type] : old_value );
        });
    }

    function calculateFormulas()
    {
        var num_changes = 0;
        var prev_num_changes;

        for( var i in formula_nodes )
        {
            formula_nodes[i].data('display_value', 'ERR:CIRCULAR REF');
        }

        do {
            prev_num_changes = num_changes;
            num_changes = 0;
            for( var i in formula_nodes )
            {
                try {
                    var node = formula_nodes[i];
                    var formula = node.data('raw_value');
                    var context = {
                        'root':$('#document').data('document'),
                        'curr':node
                    };

                    var value = parser.parse_formula(formula, context);

                    if( value !== node.data('display_value') )
                    {
                        num_changes++;
                    }

                    node.data('display_value', value);
                    node.data('$value_display').text(value);

                }catch(e){
                    node.data('$value_display').text('incalculable!');
                    console.log(e);
                    // don't re-throw; continue to next formula
                }
            }
        } while (num_changes !== prev_num_changes);
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
                $('.scalar').dblclick(handleEdit);

                calculateFormulas();

                // printdom(doc);
                // save();
            });
    });
});
