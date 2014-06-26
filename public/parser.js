(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init(
            require('./lexer'),
            require('./functions').functions,
            require('./jsonobject'), // note: use json objects from command line
            require('./log').log
        );
    } else if ( typeof define === 'function' && define.amd ) {
        // amd (require.js)
        define(
            ['./lexer', './functions', './drectsobject', './log'], // use custom drects object in web
            function (lexer, functions, myobject, log) {
                return init(lexer, functions.functions, myobject, log.log);
            });
    }
})(function(lex, functions, o, log){ // init
    function valuegetter(root_node, curr_node, path_elements)
    {
        log('path', "\n\nvaluegetter; \nPATH:", path_elements, "\nCURR:", curr_node);

        if( path_elements.length === 0 )
        {
            if( !o.isLeaf(curr_node) )
            {
                throw "type error: attempted to fetch non-leaf node";
            }
            log('debug', "returning curr_node:", curr_node);
            return o.value(curr_node);
        }
        var t = path_elements[0].type;
        var subpath = path_elements.slice(1);
        switch(t)
        {
            case 'THIS':
                return valuegetter(root_node, curr_node, subpath);
            case 'ROOT':
                return valuegetter(root_node, root_node, subpath);
            case 'PARENT':
                var parent = o.parent(root_node, curr_node);
                return valuegetter(root_node, parent, subpath);
            case 'CHILD':
                var sel = path_elements[0].selector;
                if( sel === '(STAR)' ) // (star)
                {
                    var ret = [];
                    var selectors = o.selectors(curr_node);
                    for( var i = 0; i < selectors.length; i++ )
                    {
                        var s = selectors[i];
                        var e = o.child(curr_node, s);
                        var elements = valuegetter(root_node, e, subpath);
                        log('debug', "got elements:", elements);
                        ret = ret.concat(elements);
                    }
                    log('debug', "collection: returning ret:", ret);
                    return ret;
                } else {
                    var field = o.child(curr_node,sel);
                    return valuegetter(root_node, field, subpath);
                }
                break;
            default: // should have already hit a "return" in all cases
                throw "path error: unknown path element type:" + t;
        }
    }

    function asserttoken(v, i, tok, err)
    {
        if( !v[i] || v[i].token !== tok )
        {
            if( err )
            {
                throw "parse error: " + err;
            }
            return false;
        }
        return true;
    }

    function asserttokens(v, i, toks, err)
    {
        for(var idx = 0; idx < toks.length; idx++)
        {
            if( asserttoken(v, i, toks[idx], null) )
            {
                return true;
            }
        }
        throw "parse error: " + err;
    }

    function params_helper(v, io, params)
    {
        var comma = ',';
        log('parse', params.label, v[0]);

        var param1_io = {'context':io.context};
        params.first_prod.parse(v, param1_io);

        if( params.second_prod )
        {
            v = param1_io.remainder;
            if(!asserttoken(v, 0, lex.punct.COMMA, "comma required between binary function parameters")) return false;

            var param2_io = {'context':io.context};
            params.second_prod.parse(v.slice(1), param2_io);

            io.value = { 'param1' : param1_io.value, 'param2' : param2_io.value};
            io.remainder = param2_io.remainder;
            log('debug', "returning from params_helper():", io);
            return true;
        } else {
            io.value = { 'param1' : param1_io.value };
            io.remainder = param1_io.remainder;
            log('debug', "returning from params_helper():", io);
            return true;
        }
    }

    productions = {
        'p_number' : {
            'prefixes' : function get_p_number_prefixes(){return ['DIGITS', 'NEG'];},
            'parse'    : function p_number_parse(v, io) {
                log('parse', "number:", v[0]);

                var i = 0, value;
                var negate = false;
                if( v[i].token === 'NEG' )
                {
                    i++;
                    negate = true;
                }
                if( (v.length >= 3+i) && (v[i+1].token === 'DOT') && (v[i+1].token === 'DIGITS') )
                {
                    io.value = parseFloat(v[i].tag + '.' + v[i+2].tag);
                    io.remainder = v.slice(i+3);
                } else {
                    io.value = parseFloat(v[i].tag);
                    io.remainder = v.slice(i+1);
                }
                if( isNaN(io.value) ) throw "parse error: number could not be parsed";
                io.value = negate ? -io.value : io.value;
                log('debug', "returning from p_number():", io);
            },
        },
        'p_string' : {
            'prefixes' : function get_p_string_prefixes(){return ['STRING'];},
            'parse'    : function p_string_parse(v, io) {
                log('parse', "string:", v[0]);

                if(v[0] && v[0].token !== 'STRING') throw "parse error: string must be string.";
                io.value = v[0].tag;
                io.remainder = v.slice(1);
                log('debug', "returning from p_string():", io);
            },
        },
        'p_bool' : {
            'prefixes' : function get_p_bool_prefixes(){return ['BOOL'];},
            'parse'    : function p_bool_parse(v, io) {
                log('parse', "bool:", v[0]);

                asserttoken(v, 0, 'BOOL', "bool must be bool.");

                var tag = v[0].tag.toLowerCase();
                io.remainder = v.slice(1);
                if( tag === 'true' )
                {
                    io.value = true;
                }
                else if( tag === 'false' )
                {
                    io.value = false;
                }
                else {
                    throw "parse error: bool must be true or false";
                }
            },
        },
        'p_null' : {
            'prefixes' : function get_p_null_prefixes(){return ['NULL'];},
            'parse'    : function p_null_parse(v, io) {
                log('parse', "null:", v[0]);

                if( !v[0] || v[0].token !== 'NULL' )
                {
                    throw "parse error: null must be null";
                }
                io.value = null;
                io.remainder = v.splice(1);
                log('debug', "returning from p_null():", io);
            },
        },
        'p_unary_params' : {
            'prefixes' : function get_p_unary_params_prefixes(){return [lex.punct.DOT];},
            'parse'    : function p_unary_params_parse(v, io) {
                return params_helper(v, io, {
                    'label':'unary_params:',
                    'first_prod' : productions.p_scalar,
                });
            },
        },
        'p_aggregate_params' : {
            'prefixes' : function get_p_aggregate_params_prefixes(){return ['.'];},
            'parse'    : function p_aggregate_params_parse(v, io) {
                return params_helper(v, io, {
                    'label':'aggregate_params:',
                    'first_prod' : productions.p_path,
                });
            },
        },
        'p_binary_params' : {
            'prefixes' : function get_p_binary_params_prefixes(){return ['.'];},
            'parse'    : function p_binary_params_parse(v, io) {
                return params_helper(v, io, {
                    'label':'mixed_params:',
                    'first_prod' : productions.p_scalar,
                    'second_prod': productions.p_scalar,
                });
            },
        },
        'p_mixed_params' : {
            'prefixes' : function get_p_mixed_params_prefixes(){return ['.'];},
            'parse'    : function p_mixed_params_parse(v, io) {
                return params_helper(v, io, {
                    'label':'mixed_params:',
                    'first_prod' : productions.p_scalar,
                    'second_prod': productions.p_path,
                });
            },
        },
        'p_unary' : {
            'functions' : functions.unary,
            'prefixes' : function get_p_unary_prefixes(){return ['UNARY'];},
            'params'   : function get_p_unary_params(){return 'p_unary_params';},
            'apply'    : function p_unary_parse(fname, params){
                log('apply', 'p_unary:');
                var p = params.value.param1;
                if( p === undefined )
                {
                    log('type_error', "can't apply function '" + fname + "' to param: ", p);
                    return undefined;
                }
                return functions.unary[fname](p);
            }
        },
        'p_binary' : {
            'functions' : functions.binary,
            'prefixes' : function get_p_binary_prefixes(){return ['BINARY'];},
            'params'   : function get_p_binary_params(){return 'p_binary_params';},
            'apply'    : function p_binary_parse(fname, params){
                log('apply', 'p_binary:');
                var p1 = params.value.param1;
                var p2 = params.value.param2;
                log('path', params.context);
                if( p1 === undefined || p2 === undefined )
                {
                    log('type_error', "can't apply function '" + fname + "' to params:", p1, ",", p2);
                    return undefined;
                }
                return functions.binary[fname](p1, p2);
            }
        },
        'p_mixed' : {
            'functions' : functions.mixed,
            'prefixes' : function get_p_mixed_prefixes(){return ['MIXED'];},
            'params'   : function get_p_mixed_params(){return 'p_mixed_params';},
            'apply'    : function p_mixed_parse(fname, params){
                log('apply', 'p_mixed:');
                var p1 = params.value.param1;
                var p2 = params.value.param2;
                log('path', params.context);
                if( p1 === undefined || p2 === undefined || !Array.isArray(p2) )
                {
                    log('type_error', "can't apply function '" + fname + "' to params:", p1, ",", p2);
                    return undefined;
                }
                return functions.mixed[fname](p1, p2);
            }
        },
        'p_aggregate' : {
            'functions' : functions.aggregate,
            'prefixes' : function get_p_aggregate_prefixes(){return ['AGGREGATE'];},
            'params'   : function get_p_aggregate_params(){return 'p_aggregate_params';},
            'apply'    : function p_aggregate_parse(fname, params){
                log('apply', 'p_aggregate:');
                var p = params.value.param1;
                if( p === undefined || !Array.isArray(p) )
                {
                    log('type_error', "can't apply function '" + fname + "' to param:", p);
                    return undefined;
                }
                return functions.aggregate[fname](p);
            }
        },
        'p_subpath' : {
            'cases'    : p_subpath_prefixes = [lex.punct.SLASH, lex.punct.BSLASH],
            'prefixes' : function get_p_subpath_prefixes(){return p_subpath_prefixes;},
            'parse'    : function p_subpath_parse(v, io) {
                log('parse', "subpath:", v[0]);

                asserttokens(v, 0, p_subpath_prefixes, "subpath must start with slash");
                asserttokens(v, 1,
                    [ lex.punct.DOT, 'DIGITS', 'LABEL', lex.punct.STAR ],
                    "subpath must specify index, key, all (*), or parent (..)");

                var path = [];
                switch( v[1].token )
                {
                    case lex.punct.DOT:
                        asserttoken(v, 2, lex.punct.DOT, "single dot in subpath doesn't make sense...");
                        path.push({'type':'PARENT', 'selector':null});
                        remainder = v.slice(3);
                        break;
                    case 'DIGITS':
                    case 'LABEL':
                    case lex.punct.STAR:
                        path.push({'type':'CHILD', 'selector':v[1].tag});
                        remainder = v.slice(2);
                        break;
                }

                if(remainder.length > 0)
                {
                    var i = productions.p_subpath.prefixes().indexOf(remainder[0].token);
                    if( i > -1 )
                    {
                        var path_io = {'context':io.context};
                        productions.p_subpath.parse(remainder, path_io);

                        path = path.concat(path_io.path);
                        remainder = path_io.remainder;
                    }
                }

                io.path = path;
                io.remainder = remainder;
            },
        },
        'p_path' : {
            'cases'    : p_path_prefixes = [lex.punct.SLASH, lex.punct.DOT, lex.punct.BSLASH],
            'prefixes' : function get_p_path_prefixes(){return p_path_prefixes;},
            'parse'    : function p_path_parse(v, io) {
                log('parse', "path:", v[0]);

                asserttokens(v, 0, p_path_prefixes, "path must start with one of: " + p_path_prefixes.join(" "));

                var prefix, remainder, addparent = false;

                if(v[0].token === 'SLASH' || v[0].token === 'BSLASH')
                {
                    prefix = 'ROOT';
                    remainder = v; // leave slash for next path section
                } else if( v[0].token === 'DOT' ) {
                    prefix = 'THIS';
                    if( v[1].token === 'DOT' )
                    {
                        addparent = true;
                        remainder = v.slice(2);
                    } else {
                        remainder = v.slice(1);
                    }
                }
                var path = [ {'type':prefix, 'selector':null} ];
                if( addparent )
                {
                    path.push( {'type':'PARENT', 'selector':null} );
                }

                // parse subpath

                // console.log("io before:", io, path_io);

                var path_io = {'context':io.context};

                productions.p_subpath.parse(remainder, path_io);

                path = path.concat(path_io.path);
                io.remainder = path_io.remainder;

                var got = valuegetter(io.context.root, io.context.curr, path);
                log('path', "got:", got);

                io.value = got;
                io.remainder = io.remainder;

                log('debug', "returning from path_helper():", io);
                return true;
            }
        },
        'p_function_call' : {
            'cases'    : p_function_call_cases = ['p_unary','p_binary','p_mixed','p_aggregate'],
            'prefixes' : function get_p_function_call_prefixes(){
                var ret = [];
                for(var i = 0; i < p_function_call_cases.length; i++)
                {
                    var fcase = p_function_call_cases[i];
                    var prod = productions[fcase];
                    ret = ret.concat(prod.prefixes());
                }
                return ret;
            },
            'parse'    : function p_function_call_parse(v, io) {
                log('parse', "function_call:", v[0]);

                for(var i = 0; i < p_function_call_cases.length; i++)
                {
                    var f_case = p_function_call_cases[i];
                    var prod = productions[f_case];
                    var fname = v[0].tag;
                    var fns = prod.functions;

                    if( !fns[fname] )
                    {
                        continue;
                    }

                    asserttoken(v, 1, lex.punct.LPAREN, "left paren expected to start function call params");

                    var params_io = {'context':io.context};
                    var parm_prod = productions[prod.params()];
                    parm_prod.parse(v.slice(2), params_io);

                    v = params_io.remainder;

                    asserttoken(v, 0, lex.punct.RPAREN, "right paren expected to finish function call params");

                    log('debug', "APPLYING FUNCTION:", fname);
                    io.value = prod.apply(fname, params_io);

                    io.remainder = v.slice(1);
                    if( io.value === undefined )
                    {
                        throw "formula error: could not apply formula to params";
                    }

                    log('debug', "returning from p_function_call():", io);
                    return;
                }
                throw "parse error: function call must start with a function keyword";
            },
        },
        'p_scalar' : {
            'cases'    : p_scalar_cases = ['p_number', 'p_string', 'p_bool', 'p_null', 'p_path', 'p_function_call'],
            'prefixes' : function get_p_scalar_prefixes(){
                var ret = [];
                for(var i = 0; i < p_scalar_cases.length; i++)
                {
                    ret = ret.concat(productions[p_scalar_cases[i]].prefixes());
                }
                return ret;
            },
            'parse'    : function p_scalar_parse(v, io) {
                log('parse', "scalar:", v[0]);

                for(var i = 0; i < p_scalar_cases.length; i++)
                {
                    var prod_name = p_scalar_cases[i];
                    var prod = productions[prod_name];
                    if( prod.prefixes().indexOf(v[0].token) > -1 )
                    {
                        var scalar_io = {'context':io.context};
                        prod.parse(v, scalar_io);
                        io.value     = scalar_io.value;
                        io.remainder = scalar_io.remainder;
                        log('debug', "returning from p_scalar():", io);
                        return;
                    }
                }
                throw "parse error: scalar must be number, string, bool, null, scalar path, or function call";
            },
        },
        'p_formula' : {
            'prefixes' : function get_p_formula_prefixes(){return [lex.punct.EQUALS];},
            'parse'    : function p_formula_parse(v, io) {
                log('parse', "formula:", v[0]);

                asserttoken(v, 0, lex.punct.EQUALS, "formula must start with =");

                var scalar_io = {'context':io.context};

                productions.p_scalar.parse(v.slice(1), scalar_io);

                io.value     = scalar_io.value;
                io.remainder = scalar_io.remainder;

                if( scalar_io.remainder.length > 0 )
                {
                    throw "parse error: didn't expect anything after formula, got:" + scalar_io.remainder;
                }
                log('debug', "returning from p_formula():", io);
            }
        }
    };

    function parse_formula(formula, context)
    {
        var tokenstream;

        try {
            tokenstream = lex.lex(formula);
            log('lex', tokenstream);
        }catch(e){
            log('lex_error', e);
            log('lex_error', e.stack);
            throw(e);
        }

        try {
            var io = {'context':context};
            productions.p_formula.parse(tokenstream, io);
            return io.value;
        }catch(e){
            log('parse_error', e);
            log('parse_error', e.stack);
            throw(e);
        }
    }

    return {
        'parse_formula' : parse_formula,
    };
});

