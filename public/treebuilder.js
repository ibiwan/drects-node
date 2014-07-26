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

    var _config = null;
    var _collapsers = null;
    var _track_formula_node = null;

    function addbackrefs($$children, $parent, parent_name) {
        console.log("adding:", $$children, $parent, parent_name);
        for (var i = 0; i < $$children.length; i++) {
            $child = $$children[i];
            if( $child.data ) {
                console.log("OLD SCHOOL");
                $child.data(parent_name, $parent);
            } else if ( $child.setParent ) {
                $child.setParent($parent, parent_name);
            } else {
                throw "I don't know how to add backrefs to this:" + $child;
            }
        }
    }
    function $newdiv(type, value)
    {
        return $('<div>' + value + '</div>').addClass(type);
    }
    function $make_field_stack(type, selector, $data_node)
    {
        if($data_node.setState){
            $data_node.setState('shown');
        } else if($data_node.data) {
            $data_node.data('state', 'shown');
        }

        var $controller = $newdiv('controller', '<i class="' + _collapsers[type + '-open'] + '"></i>');
        var $label      = $newdiv('label', selector).addClass(type+'label');
        var $label_edit = $('<input type="text" value=""></input>').hide();

        var $labelstack = $newdiv('labelstack', '')
            .append($controller)
            .append(     $label)
            .append($label_edit)
            .addClass((type === 'element') ? 'vertical' : 'horizontal');

        var $field = $newdiv(type, '')
            .append($labelstack) // .data('$labelstack', $labelstack) // nobody seems to care
            .append ($data_node).data( '$data_node',  $data_node)
            .data(   'selector', selector.toString())
            .data(       'type', type)
            .data('$controller', $controller)
            .data(     '$label', $label)
            .data('$label_edit', $label_edit)
            .data('$labelstack', $labelstack);

        addbackrefs([$labelstack, $controller, $label, $label_edit, $data_node], $field, '$field');

        return $field;
    }
    function $make_type_selector(type) {
        var $type_selector = $('<select></select');
        var types = ['null','boolean','number','string', 'formula'];
        for(var i = 0; i < types.length; i++)
        {
            var cur = types[i];
            var sel = ((cur == type) ? 'selected' : '');
            var $option = $('<option value="' + cur + '" ' + sel + '>' + cur + '</option>');
            $type_selector.append($option);
        }

        return $type_selector;
    }
    // function $make_scalar(type, data)
    // {
    //     var $value_display = $newdiv('value_display', data).addClass(type);
    //     var $type_selector = $make_type_selector(type).hide();
    //     var $value_edit    = $('<input type="text" value=""></input>').hide();

    //     var $scalar = $newdiv('scalar', '')
    //         .addClass('horizontal')

    //         .append($value_display).data('$value_display', $value_display)
    //         .append($type_selector).data('$type_selector', $type_selector)
    //         .append(   $value_edit).data(   '$value_edit',    $value_edit)

    //         .data('type',          type)
    //         .data('raw_value',     data)
    //         .data('display_value', data) // will only differ for formula nodes
    //     ;

    //     addbackrefs([$value_display, $type_selector, $value_edit], $scalar, '$scalar');

    //     if( type === 'formula' )
    //     {
    //         // formula_nodes.push($scalar);
    //         _track_formula_node($scalar);
    //     }

    //     return $scalar;
    // }
    function $make_array(data, primaryvalue)
    {
        var $array = $newdiv('array', '').data('type', 'array');

        var $$fields = [];
        for( var i = 0; i < data.length; i++ )
        {
            var summary_holder = {};
            var $data_node     = gentree(data[i], primaryvalue, summary_holder);
            var summarystr     = (summary_holder.val === undefined)  ? '' : summary_holder.val;

            console.log($data_node);

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
            var config_keys = _config.forkey('rex-ordering');
            var sortedkeys = [];
            var whateverkeys = [];
            var allkeys = [];
            var has_other = $.inArray('OTHER', config_keys) > -1;

            for(var i = 0; i < keys.length; i++)
            {
                key = keys[i];
                if( $.inArray(key, config_keys) > -1  )
                {
                    sortedkeys.push(key);
                } else {
                    whateverkeys.push(key);
                }
            }

            for(i = 0; i < config_keys.length; i++)
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
            var pv    = _config.forkey('rex-primaries')[key];
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
    function gentree(data, primaryvalue, summary_holder)
    {
        if( data === null )
        {
            data = "null";
        }

        var t = typeof(data);
        if( ["null", "number", "string", "boolean"].indexOf(t) > -1 )
        {
            if( data[0] === '=' )
            {
                t = "formula";
            }
            return make_scalar({type:t, data:data});
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

    function build(data, config, collapsers, track_formula_node){
        var summary_holder = {};
        _config = config;
        _collapsers = collapsers;
        _track_formula_node = track_formula_node;
        return gentree(data, 'root', summary_holder);
    }

    // spec  : params
    // my    : protected
    // local : private
    // that  : public

    var make_node = function (spec, my) {
        var that;      //, other private instance variables; 
        my = my || {}; //Add shared variables and functions to my 
        that = {}      //a new object; // call other makers here
        
        console.log("constructing node");
        //Add privileged methods to that (define methods then reference)
        
        return that;
    };

    var make_collection = function (spec, my) {
        var that;
        my = my || {};
        that = make_node(spec, my);
        console.log("constructing collection");
        return that;
    }

    var make_array = function (spec, my) {
        var that;
        my = my || {};
        that = make_collection(spec, my);
        console.log("constructing array");
        return that;
    }

    var make_object = function (spec, my) {
        var that;
        my = my || {};
        that = make_collection(spec, my);
        console.log("constructing object");
        return that;
    }

    var make_primitive = function (spec, my) {
        var that;
        my = my || {};
        that = make_node(spec, my);
        console.log("constructing primitive");
        return that;
    }

    var make_table = function (spec, my) {
        var that;
        my = my || {};
        that = make_primitive(spec, my);
        console.log("constructing table");
        return that;
    }

    var make_scalar = function (spec, my) { // spec: type, data
        var that;
        my = my || {};
        that = make_primitive(spec, my);
        console.log("constructing scalar");

        my.state         = 'shown';
        my.type          = spec.type;
        my.raw_value     = spec.data;
        my.display_value = my.raw_value; // will only differ for formula nodes

        my.$value_display = $newdiv('value_display', my.raw_value).addClass(my.type);
        my.$type_selector = $make_type_selector(my.type).hide();
        my.$value_edit    = $('<input type="text" value=""></input>').hide();

        my.$scalar = $newdiv('scalar horizontal', '')
            .append(my.$value_display)
            .append(my.$type_selector)
            .append(my.$value_edit)
        ;

        var show = function() 
        { 
            my.state = 'shown'; 
            my.$scalar.removeClass('hidden');
            my.$scalar.hide();
        }
        var hide = function() 
        { 
            my.state = 'hidden'; 
            my.$scalar.addClass('hidden');
            my.$scalar.show();
        }
        var shown = function() 
        { 
            return (my.state === 'shown'); 
        }

        var getType = function(     ) { return my.type; }
        var setType = function(type ) { my.type = type; }

        var getData = function(     ) { return my.raw_value; }
        var setData = function(data ) {
            my.raw_value     = data;
            my.display_value = data;
        }

        var setParent = function(parent, parent_name) {
            my.parent = parent;
            console.log("setting parent named:", parent_name);
        }

        that.show      = show;
        that.hide      = hide;
        that.shown     = shown;

        that.getType   = getType;
        that.setType   = setType;

        that.getData   = getData;
        that.setData   = setData;
        
        that.setParent = setParent;

        addbackrefs([my.$value_display, my.$type_selector, my.$value_edit], that, '$scalar');

        if( my.type === 'formula' )
        {
            _track_formula_node(that);
        }

        return that;
    }

    return {
        build:build,
    };
});
