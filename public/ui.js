(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init(
            require('./include/jquery'),
            require('./include/jquery-ui'),
            require('./parser'),
            require('./log').log,
            require('./treebuilder'),
            require('./config')
        );
    } else if ( typeof define === 'function' && define.amd ) {
        // "amd" (require.js)
        define(
            ['jquery', 'jquery-ui', './parser', './log', './treebuilder', './config'],
            function ($, jqueryui, parser, log, treebuilder, config) {
                return init($, jqueryui, parser, log.log, treebuilder, config);
            });
    }
})(function($, jqueryui, parser, log, treebuilder, config){ // init

    var collapsers = {
        'element-open'  : 'fa fa-chevron-right',
        'element-close' : 'fa fa-chevron-up',
        'member-open'   : 'fa fa-chevron-down',
        'member-close'  : 'fa fa-chevron-left'
    };

    var formula_nodes = [];
    function track_formula_node(node){
        formula_nodes.push(node);
    }

    function printdom(htmlnode, depth)
    {
        if( !depth ) depth = 0;
        var tab  = Array(depth+1).join("  ");
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
                    for( var i = 0; i < $$fields.length; i++ )
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

    function save()
    {
        function extractdata($html_node)
        {
            console.log($html_node);
            console.log($html_node.data());

            var type = $html_node.data('type');
            if( ['string', 'number', 'boolean', 'null', 'formula'].indexOf(type) > -1 )
            {
                var t = $html_node.data('raw_value');
                // console.log("t:", t);
                return t;
            }
            if(['array', 'object'].indexOf(type) > -1 )
            {
                var a = []; var o = {};
                var $$fields = $html_node.data('$$fields');
                for( var i = 0; i < $$fields.length; i++ )
                {
                    var $field = $$fields[i];
                    var data_node = extractdata($field.data('$data_node'));

                    if( type === 'array' )
                    {
                        a.push(data_node);
                    } else {
                        var key = $field.data('selector');
                        o[key] = data_node;
                    }
                }
                // console.log("a:", a, "o:", o);
                return type === 'array' ? a : o;
            }
        }

        var savedata = extractdata($('#document').data('document'));
        // console.log("savedata before adding config:", savedata);
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
        var $labelstack = $field.data('$labelstack');

        // update collapser icon
        var direction  = ($data_node.data('state') == 'shown') ? 'close' : 'open';
        var type = $field.data('type');

        // arrow is first child of controller ("this")
        $($(this).children(':first')).attr('class', collapsers[type + '-' + direction]);

        if( direction === 'open' )
        {
            if( $summary ) $summary.hide();
            $data_node.show().data('state','shown');

            if( type === 'element' )
                $labelstack.removeClass('horizontal').addClass('vertical');

            setTimeout(function(){
                $data_node.removeClass('hidden');
            }, 10);
       } else {
            $data_node.addClass('hidden');

            setTimeout(function(){
                $data_node.hide().data('state','hidden');
                if( $summary ) $summary.show();
                $field.hide().show();

                if( type === 'element' )
                    $labelstack.removeClass('vertical').addClass('horizontal');
            }, 500);
        }
    }

    function handleScalarEdit(eventObject)
    {
        function stringToBoolean(string){
            switch(string.toLowerCase()){
                case "true": case "yes": case "1": return true;
                default: return false;
            }
        }
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

        $value_edit.val(old_value).show();
        $value_display.hide();
        $type_selector.show();

        $value_edit.keypress(function valueeditkeypress(event) {
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

                        changeMade();
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

    function handleKeyEdit($field)
    {
        function validateKey(value) {
            return value.match(/^[\w-_]*$/);
        }
        var $label = $field.data('$label');

        console.log($field.data(), $label);

        var $label_edit = $field.data('$label_edit');

        var old_key = $field.data('selector');

        $label_edit.show().val(old_key);
        $label.hide();

        $label_edit.keypress(function labeleditkeypress(event){
            if( event.which == 13 ) { // return key
                var new_key = $label_edit.val();
                var changed   = new_key != old_key;
                if( !changed || validateKey(new_key) )
                {
                    console.log(new_key);
                    $label_edit.hide();
                    $label.show();

                    if( changed ) {
                        $field.data('selector', new_key);
                        $label.html(new_key);

                        changeMade();
                    }
                }
            }
        });
    }

    function calculateFormulas()
    {
        var i;
        var num_changes = 0;
        var prev_num_changes;

        for( i = 0; i < formula_nodes.length; i++ )
        {
            formula_nodes[i].data('display_value', 'ERR:CIRCULAR REF');
        }

        do {
            prev_num_changes = num_changes;
            num_changes = 0;
            for( i = 0; i < formula_nodes.length; i++ )
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

    function handleDelete($node)
    {
        $parent = $node.data('$composition');
        $$fields = $parent.data('$$fields');

        for( var i = 0; i < $$fields.length; i++ )
        {
            if( $$fields[i] === $node ) {
                $$fields.splice(i, 1); // in-place
                $parent.data('$$fields', $$fields);
                $node.remove();

                changeMade();
                return true;
            }
        }
        return false;
    }

    function buildContextMenu($node, coords)
    {
        console.log($node, coords.left, coords.top);

        var $menu = $('#contextmenu')
            .addClass('contextmenu')
            .css(coords)
            .css({
                position   : 'absolute',
                'background-color' : '#fff',
            })
            .empty();
            // .show();

        var menuitems = [
            {id:"delete",     text:"Delete Node", function: function(){handleDelete( $node);}},
            {id:"edit-label", text: "Edit Label", function: function(){handleKeyEdit($node);}},
        ];

        for(var i = 0; i < menuitems.length; i++)
        {
            var item = menuitems[i];
            var $item = $('<div id="' + item.id + '" class="menuitem">' + item.text + '</div>');
            $item.click(item.function);
            $menu.append($item);
        }

        $menu.show();

        // return $menu;
    }

    function popUpContextMenu(eventObject)
    {
        var $label = $(this);
        var $field = $label.data('$field');

        eventObject.preventDefault();

        buildContextMenu($field, $label.offset());
    }

    function popDownContextMenu(eventObject)
    {
        if(!eventObject.isDefaultPrevented())
        {
            $('#contextmenu').offset({top:0,left:0}).hide();
        }
    }

    function registerHandlers()
    {
        $('.controller').click(handleToggle);
        $('.scalar').dblclick(handleScalarEdit);
        $('.label').click(popUpContextMenu);
        $(document).click(popDownContextMenu);
    }

    function changeMade()
    {
        calculateFormulas();
        save();
    }

    $(function initialize(){
        $("body").disableSelection();

        $.ajax("getdoc")
            .done(function gotjson(file_data, stringStatus, jqXHR){
                config.load(file_data);

                var doc = treebuilder.build(file_data, config, collapsers, track_formula_node);

                var $htmlroot = $('#document')
                    .append(doc)
                    .data('document', doc);

                registerHandlers();
                calculateFormulas();

                // printdom(doc);
                // save();
            });
    });
});
