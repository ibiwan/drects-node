(function(init) { // deps
    if (typeof module === 'object' && module && typeof module.exports === 'object') {
        // node mode
        module.exports = init(
            require('./include/jquery'),
            require('./include/vue'),
            require('./parser'),
            require('./log')
            .log,
            require('./config')
        );
    } else if (typeof define === 'function' && define.amd) {
        // "amd" (require.js) mode
        define(
            ['jquery', 'jquery-ui', 'contextmenu', 'vue', './parser', './log', './config'],
            function($, jquery_ui, context_menu, vue, parser, log, config) {
                return init($, vue, parser, log.log, config);
            });
    }
})(function($, vue, parser, log, config) { // init

    let docroot    = 'rex-document';
    let configroot = config.configroot;
    let docname    = 'Untitled Document';

    let collapsers = {
        'element-open':  'fa fa-chevron-right',
        'element-close': 'fa fa-chevron-up',
        'member-open':   'fa fa-chevron-down',
        'member-close':  'fa fa-chevron-left'
    };

    var formula_nodes = [];

    function track_formula_node(node) {
        console.log('track_formula_node');
        if (node instanceof $) {
            node = node[0];
        }
        formula_nodes.push(node);
    }

    function untrack_formula_node(node) {
        console.log('untrack_formula_node');
        if (node instanceof $) {
            node = node[0];
        }
        var i = formula_nodes.indexOf(node);
        if (i > -1) {
            formula_nodes.splice(i, 1);
        }
    }

    function save(data) {
        console.log('save');
        var file = {};
        file[docroot] = data;
        file[configroot] = config.get();

        var savejson = JSON.stringify(file);
        console.log("SAVING:", savejson);

        $.ajax("savedoc", {
                'type': 'POST',
                'dataType': 'json',
                'data': { 'file': savejson, 'filename': docname }
            })
            .done(function savedjson(returned_data, stringStatus, jqXHR) {
                $('#message')
                    .text("saved, I think!");
                setTimeout(function() {
                    $('#message')
                        .text('');
                }, 5000);
            })
            .fail(function nosave(jqXHR, textStatus, errorThrown) {
                var resp = JSON.parse(jqXHR.responseText);
                $('#message')
                    .text(resp.error);
            });
    }

    function handleScalarEdit(eventObject) {
        console.log('handleScalarEdit');
        function stringToBoolean(string) {
            return ["true", "yes", "1"].indexOf(string.toLowerCase()) > -1;
        }

        function validate(type, value) {
            console.log('validate');
            var validators = {
                string: {
                    func: v => true,
                    err: 'all strings are strings, right?  right?!?',
                },
                formula: {
                    func: v => value.indexOf('=') === 0,
                    err:  'functions must start with "="',
                },
                number: {
                    func: v => !isNaN(parseFloat(v)) && isFinite(v),
                    err: 'number fields must take numeric values',
                },
                null: {
                    func: v => [null, '', 'null'].indexOf(v) > -1,
                    err: 'null fields must take null values',
                },
                boolean: {
                    func: v => [true, false, 'true', 'false', 'True', 'False'].indexOf(v) > -1,
                    err: 'boolean fields must take true/false values',
                }
            };
            if (!(type in validators)) {
                alert('unknown field type: ' + type);
                return false;
            }

            let validator = validators[type];

            if (validator.func(value)) return true;
            alert(validator.err);
            return false;
        }

        // "this" is $scalar
        var $scalar = $(this);

        var old_type = $scalar.data('type');

        var $value_display = $scalar.data('$value_display');
        var $type_selector = $scalar.data('$type_selector');
        var $value_edit = $scalar.data('$value_edit');

        var old_value = $scalar.data('raw_value')
            .toString();

        $value_edit.val(old_value)
            .show();
        $value_display.hide();
        $type_selector.show();

        $value_edit.keypress(function valueeditkeypress(event) {
            console.log('keypress');
            if (event.which == 13) { // return key
                var new_value = $value_edit.val();
                var new_type = $type_selector.val();
                var changed = (new_value != old_value || old_type != new_type);
                if (!changed || validate(new_type, new_value)) {
                    $value_edit.hide();
                    $type_selector.hide();
                    $value_display.show();

                    if (changed) {
                        switch (new_type) {
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
                            case 'formula':
                                if (old_type !== 'formula') {
                                    track_formula_node($scalar);
                                }
                                break;
                        }
                        if (old_type === 'formula' && new_type !== 'formula') {
                            untrack_formula_node($scalar);
                        }

                        $scalar.data('raw_value', new_value);
                        $scalar.data('type', new_type);

                        var display_value = (new_type === 'formula') ? 'ERR' : new_value;

                        $scalar.data('display_value', display_value);
                        $value_display.html(display_value);
                        $scalar.attr('class', new_type + ' scalar');

                        changeMade();
                    }
                }
            }
        });
        $type_selector.change(function changetype() {
            var new_type = $(this)
                .val(); // "this" here is the drop-down
            var defaults = { 'null': 'null', 'boolean': 'false', 'number': '0', 'string': 'text', 'formula': '=0' };
            $value_edit.val((new_type !== old_type) ? defaults[new_type] : old_value);
        });
    }

    function calculateFormulas() {
        console.log('calculateFormulas');

        var i, node;
        var num_changes = 0;
        var prev_num_changes;

        for (i = 0; i < formula_nodes.length; i++) {
            node = $(formula_nodes[i]);
            node.data('display_value', 'ERR:CIRCULAR REF');
        }

        do {
            prev_num_changes = num_changes;
            num_changes = 0;
            for (i = 0; i < formula_nodes.length; i++) {
                try {
                    node = $(formula_nodes[i]);
                    var formula = node.data('raw_value');
                    var context = {
                        'root': $('#document')
                            .data('document'),
                        'curr': node
                    };

                    var value = parser.parse_formula(formula, context);

                    if (value !== node.data('display_value')) {
                        num_changes++;
                    }

                    node.data('display_value', value);
                    node.data('$value_display')
                        .text(value);

                } catch (e) {
                    node.data('$value_display')
                        .text('incalculable!');
                    console.log(e);
                    // don't re-throw; continue to next formula
                }
            }
        } while (num_changes !== prev_num_changes);
    }

    function changeMade() {
        console.log('changeMade');
        calculateFormulas();
        save();
    }

    function sortKeys(keys) {
        let config_keys = config.forkey('rex-ordering');

        var key;
        var sorted_keys = [];
        var whatever_keys = [];
        var all_keys = [];

        for (var i = 0; i < keys.length; i++) {
            key = keys[i];
            if (config_keys.indexOf(key) > -1) {
                sorted_keys.push(key);
            } else {
                whatever_keys.push(key);
            }
        }

        // if OTHER is present in sorting config, "whatever" (un-sorted) fields take its place in the order.

        for (i = 0; i < config_keys.length; i++) {
            key = config_keys[i];
            if (key === 'OTHER') {
                all_keys = all_keys.concat(whatever_keys);
                whatever_keys = [];
            } else if (sorted_keys.indexOf(key) > -1) {
                all_keys.push(key);
            }
        }

        // otherwise, they go at the end.

        all_keys = all_keys.concat(whatever_keys);

        return all_keys;
    }

    function getKeys(obj) {
        var keys = [];
        for (var key in obj) {
            keys.push(key);
        }
        return sortKeys(keys);
    }

    function initVue(file_data, config) {

        vue.component('dr-object', {
            props:    ['members'],
            template: $('#object-template').html(),
            computed: {
                sortedMembers() {
                    let m = this.members;
                    return getKeys(m).map( key => ({ k: key, v: m[key] }));
                }
            },
            methods:  {
                deletenode(key) { vue.delete(this.members, key); },
                labelmodify(oldkey, newkey) {
                    vue.set(this.members, newkey, this.members[oldkey]);
                    vue.delete(this.members, oldkey);
                },
            },
        });

        vue.component('dr-member', {
            props:    ['member', 'hash'],
            template: $('#member-template').html(),
            data() { return {
                expanded: true,
            }; },
            computed: {
                widgeticon() { return collapsers[this.expanded ? 'member-open' : 'member-close']; }
            },
            methods:  {
                click(event)          { this.expanded = !this.expanded; },
                deletenode()          { this.$emit('deletenode', this.hash); },
                labelmodify(newlabel) { this.$emit('labelmodify', this.hash, newlabel); },
            },
        });

        vue.component('dr-array', {
            props:    ['elements', 'owner'],
            template: $('#array-template').html(),
            data() { return {
                summaryField: this.owner ? config.forkey('rex-primaries')[this.owner] : null,
            }; },
            methods:  {
                deletenode(index) { this.elements.splice(index, 1); },
            },
        });

        vue.component('dr-element', {
            props:    ['element', 'index', 'summaryField'],
            template: $('#element-template').html(),
            data() { return {
                summary:  this.summaryField ? this.element[this.summaryField] : null,
                expanded: true,
            }; },
            computed: {
                widgeticon() { return collapsers[this.expanded ? 'element-open' : 'element-close']; }
            },
            methods:  {
                click()      { this.expanded = !this.expanded; },
                deletenode() { this.$emit('deletenode', this.index); },
                editlabel()  { this.$emit('editlabel',  this.index); },
            }
        });

        vue.component('dr-scalar', {
            props:    ['value'],
            template: $('#scalar-template').html(),
            computed: {
                type() {
                    let t = typeof(this.value);
                    if (t === 'string' && this.value[0] === '=') {
                        t = "formula";
                    }
                    return t;
                }
            },
        });

        vue.component('dr-variant', {
            props:    ['datum', 'owner'],
            template: $('#variant-template').html()
        });

        vue.component('dr-label', {
            props:    ['label', 'editable'],
            template: $('#label-template').html(),
            data(){ return {
                mylabel:       this.label,
                labeleditmode: false,
            }; },
            mounted() { this.configmenu(); },
            updated() { this.configmenu(); },
            methods:  {
                configmenu() {
                    var items = [
                        { "Delete Node": () => this.$emit('deletenode', this.label) },
                    ];
                    if(this.editable){
                        items.push( $.contextMenu.separator );
                        items.push( { "Edit Label":  () => this.labeleditmode = true } );
                    }
                    $(this.$el).contextMenu(items, { theme: 'osx' });
                },
                labeleditdone(event) {
                    let changed = this.label != this.mylabel;
                    let valid   = !!this.mylabel.match(/^[\w-_]*$/);
                    if (!changed || valid) {
                        this.labeleditmode = false;
                    }
                    if(changed && valid){
                        this.$emit('labelmodify', this.mylabel);
                    }
                }
            }
        });

        var vApp = new vue({
            el:   '#document',
            data: {
                document: file_data
            }
        })
    }

    $(function initialize() {
        $("body")
            .disableSelection();

        $.ajax("getdoc")
            .done(function gotjson(xhr_data, stringStatus, jqXHR) {

                if (!xhr_data.success) {
                    $('#message')
                        .text("server couldn't retrieve file!");
                    console.log("server couldn't retrieve file");
                    return;
                }

                document.title = "Dynamic Spreadsheet - " + xhr_data.filename;

                let file_data = JSON.parse(xhr_data.file);

                config.load(file_data);
                if (file_data[docroot]) {
                    file_data = file_data[docroot];
                }

                initVue(file_data, config);

                // calculateFormulas();
            });
    });
});
