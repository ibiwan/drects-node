var quote = "'";
var bslash = "\\";
formula_candidates = [
    // {'text':'=sum(root)',                                             'result':{'success':false}},
    // {'text':'=add(this.parent.member[mikey].element[27].parent, 22)', 'result':{'success':true, 'value':109}},
    // {'text':'=sum(root.members[*])',                                  'result':{'success':true, 'value':105}},
    // {'text':'=add(root.member[mikey], 4)',                            'result':{'success':true, 'value':91}},
    // {'text':'=add(root.member[*], 4)',                                'result':{'success':false}},
    // {'text':'=add(root.members[*], 4)',                               'result':{'success':false}},
    // {'text':'=add(root.members[mikey], 4)',                           'result':{'success':false}},
    // {'text':'=sum(3)',                                                'result':{'success':false}},
    // {'text':'=add(3)',                                                'result':{'success':false}},
    // {'text':'=add(3, 4)',                                             'result':{'success':true, 'value':7}},
    // {'text':'=add(3, add(2, 2))',                                     'result':{'success':true, 'value':7}},
    // {'text':'=neg(3)',                                                'result':{'success':true, 'value':-3}},
    // {'text':'=count(3)',                                              'result':{'success':false}},
    // {'text':'=sum(3',                                                 'result':{'success':false}},
    // {'text':'=sum',                                                   'result':{'success':false}},
    // {'text':'=sum(3)q',                                               'result':{'success':false}},
    // {'text':'=add(37, this.parent.element[5])',                       'result':{'success':true, 'value':124}},
    // {'text':'=add(37, this.parent.elements[5])',                      'result':{'success':false}},
    // {'text':'=this.parent',                                           'result':{'success':true, 'value':87}},
    // {'text':'=this.pa-rent',                                          'result':{'success':false}},
    // {'text':'=count(23,this.parent.members[*])',                      'result':{'success':true, 'value':1}},
    // {'text':'=this.parent.elements[*]',                               'result':{'success':false}},
    // {'text':'sum(3)',                                                 'result':{'success':false}},
    // {'text':'=57',                                                    'result':{'success':true, 'value':57}},
    // {'text':'=57q',                                                   'result':{'success':false}},
    // {'text':'=-23',                                                   'result':{'success':true, 'value':-23}},
    // {'text':'=1.57',                                                  'result':{'success':true, 'value':1.57}},
    // {'text':'=null',                                                  'result':{'success':true, 'value':null}},
    // {'text':"='hello world'",                                         'result':{'success':true, 'value':'hello world'}},
    // {'text':"='hello world',",                                        'result':{'success':false}},
    // {'text':"='hello world'q",                                        'result':{'success':false}},
    // {'text':"='hello w"+bslash+quote+"orld!"+bslash+bslash+"!!'",     'result':{'success':true, 'value':"hello w'orld!\\!!"}},
    // {'text':"='hello world!!!"+bslash+"'",                            'result':{'success':false}},
    // {'text':'=true',                                                  'result':{'success':true, 'value':true}},
    // {'text':'=false',                                                 'result':{'value':false}},
    // {'text':'=trueq',                                                 'result':{'success':false}},
    {
        'text'   : '=sum(/<characters>[*]<levels>[*]<level>)',
        'result' : {'success':true, 'value':147.7}
    },
    {
        'text'   : '=sum(/<characters>[1]<levels>[*]<level>)',
        'result' : {'success':true, 'value':14.7}
    },
    {
        'text'   : '=sum(/<characters>[0]<levels>[*]<level>)',
        'result' : {'success':true, 'value':133}
    },
    {
        'text'   : '=sum(.parent<levels>[*]<level>)',
        'result' : {'success':true, 'value':133}
    },
];

var out = {
    'log_type'    : true,
    'padding'     : true,
    'formula'     : true,
    // 'parse'       : true,
    'parse_error' : true,
    // 'lex'         : true,
    'lex_error'   : true,
    // 'debug'       : true,
    // 'path'        : true,
    'path_error'  : true,
    'type_error'  : true,
    'testing'     : true,
    'apply'       : true,
};
function log(type)
{
    var values = Array.prototype.slice.call(arguments, 1);
    if( out[type] )
    {
        if(out.log_type && type !== 'padding')
        {
            values.unshift(type.toUpperCase() + ':');
        }
        console.log.apply(this, values);
    }
}

for(var i = 0; i < 10; i++)
    log('padding');

var puncts_dict = {
    '(' : 'LPAREN',
    ')' : 'RPAREN',
    '[' : 'LBRACK',
    ']' : 'RBRACK',
    '<' : 'LCHEV',
    '>' : 'RCHEV',
    '=' : 'EQUALS',
    ',' : 'COMMA',
    '*' : 'STAR',
    '.' : 'DOT',
    '-' : 'NEG',
    '/' : 'SLASH',
};
var puncts = {};
var puncts_str = {};
for(var key in puncts_dict)
{
    var str = puncts_dict[key];
    puncts[str] = key;
    puncts_str[str] = str;
}

var reserveds = {
    'NULL'      : ['null'],
    'ROOT'      : ['root'],
    'THIS'      : ['this'],
    'MIXED'     : ['count'],
    'BOOL'      : ['true', 'false'],
    'UNARY'     : ['neg', 'abs', 'not'],
    'AGGREGATE' : ['sum', 'prod', 'min', 'max', 'mean'],
    'BINARY'    : ['add', 'sub', 'mul', 'div', 'mod', 'and', 'or'],
};
var taggeds = [
    'STRING',
    'DIGITS',
    'LABEL',
];
function lexstring(haystack)
{
    var chars = haystack.split('');
    var substr = [];
    for(var i = 0; i < chars.length; i++)
    {
        var c = chars[i];
        if( i === 0 )
        {
            if( c === "'" ) // as it should be
            {
                continue;
            }
            log('lex_error', "string must start with single quote");
            return false;
        }
        if( c === bslash ) // escape!
        {
            i++;
            c = chars[i];
            if( [bslash, quote].indexOf(c) === -1 )
            {
                log('lex_error', "backslash in a string must precede backslash or single quote");
                return false;
            }
            substr.push(c);
            continue;
        }
        if( c === "'" ) // end of string
        {
            var ret = substr.join('');
            return {'string':substr.join(''), 'end_index':i};
        }
        substr.push(c);
    }
    log('lex_error', "unterminated string");
    return false;
}
function lexdigits(haystack)
{
    var chars = haystack.split('');
    var digits = [];
    for(var i = 0; i < chars.length; i++)
    {
        var c = chars[i];
        if( c >= '0' && c <= '9' )
        {
            digits.push(c);
            continue;
        }
        break;
    }
    return {'digits':digits.join(''), 'end_index':i};
}
function lexlabel(haystack)
{
    var chars = haystack.split('');
    var label = [];
    for(var i = 0; i < chars.length; i++)
    {
        var c = chars[i];
        if( (c >= '0' && c <= '9') || (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || (['-','_'].indexOf(c) > -1) )
        {
            label.push(c);
            continue;
        }
        break;
    }
    return {'label':label.join(''), 'end_index':i};
}
function lex(str)
{
    var tokenstream = [];

    for(var i = 0; i < str.length; i++)
    {
        var c = str.substr(i, 1);

        if( c === "'" )
        {
            var ls = lexstring(str.substr(i));
            if( ls === false )
            {
                return false;
            }
            i += ls.end_index;
            tokenstream.push({'token':'STRING', 'tag':ls.string});
            continue;
        }
        if( p = puncts_dict[c] )
        {
            tokenstream.push({'token':p, 'tag':'(' + p + ')'});
            continue;
        }
        if( c >= '0' && c <= '9' )
        {
            var ld = lexdigits(str.substr(i));
            i += ld.end_index - 1;
            tokenstream.push({'token':'DIGITS', 'tag':ld.digits});
            continue;
        }
        if( ( c >= 'a' && c <= 'z' ) || ( c >= 'A' && c <= 'Z' ) )
        {
            var ll = lexlabel(str.substr(i));
            i += ll.end_index - 1;
            var found = false;
            for( var key in reserveds )
            {
                var candidates = reserveds[key];
                if( candidates.indexOf(ll.label) > -1 )
                {
                    tokenstream.push({'token':key, 'tag':ll.label});
                    found = true;
                    continue;
                }
            }
            if( found )
            {
                continue;
            }
            tokenstream.push({'token':'LABEL', 'tag':ll.label});
            continue;
        }
    }
    return tokenstream;
}

function helpervaluegetter(root_node, curr_node, path_elements, params)
{

}
function scalarvaluegetter(root_node, curr_node, path_elements)
{
    log('path', "getting scalar from path:\n", path_elements);
    try {
        if( path_elements.length === 0 )
        {
            if( curr_node instanceof Array || curr_node instanceof Object )
            {
                log('type_error', "attempted to fetch non-leaf node");
                return {'success':false};
            }
            return {'success':true, 'value':curr_node};
        }
        var t = path_elements[0].type;
        var sel = path_elements[0].selector;
        var subpath = path_elements.slice(1);
        switch(t)
        {
            case 'THIS':
                return scalarvaluegetter(root_node, curr_node, subpath);
            case 'ROOT':
                return scalarvaluegetter(root_node, root_node, subpath);
            case 'MEMBER':
            case 'ELEMENT':
                var mel = curr_node[sel];
                if( mel === undefined )
                {
                    log('path_error', "could not find element:", sel);
                    return {'success':false};
                }
                return scalarvaluegetter(root_node, mel, subpath);
            case 'PARENT':
                return scalarvaluegetter(root_node, parent(root_node, curr_node), subpath);
            default:
                log('path_error', "unknown path element type:", t);
                return {'success':false};
        }
    } catch (err) {
        log('path_error', "could not traverse path:", path_elements);
        return {'success':false};
    }

    log('path_error', "not sure what happened, here");
    return {'success':false};
}
function tensorvaluesgetter(root_node, curr_node, path_elements, indent)
{
    if( indent === undefined )
    {
        indent = '';
    } else {
        indent = indent + '   ';
    }
    log('path', indent + "getting tensor from path:\n", indent, path_elements);
    try {
        if( path_elements.length === 0 )
        {
            if( curr_node instanceof Array || curr_node instanceof Object )
            {
                log('type_error', indent + "attempted to fetch non-leaf node");
                return {'success':false};
            }
            return {'success':true, 'value':[curr_node]};
        }
        var t = path_elements[0].type;
        var sel = path_elements[0].selector;
        var subpath = path_elements.slice(1);
        var ret = [];
        switch(t)
        {
            case 'THIS':
                return tensorvaluesgetter(root_node, curr_node, subpath, indent);
            case 'ROOT':
                return tensorvaluesgetter(root_node, root_node, subpath, indent);
            case 'MEMBERS':
            case 'ELEMENTS':
                if( sel === '(STAR)' )
                {
                    if(t === 'MEMBERS')
                    {
                        if( !(curr_node instanceof Object) )
                        {
                            log('type_error', indent + "attempted to get members of a non-object");
                            return {'success':false};
                        }
                        for(var m in curr_node)
                        {
                            // console.log(indent + "KEY:", m);
                            var members = tensorvaluesgetter(root_node, curr_node[m], subpath, indent);
                            if( !members.success )
                            {
                                return false;
                            }
                            ret = ret.concat(members.value);
                        }
                    }
                    if(t === 'ELEMENTS')
                    {
                        if( !(curr_node instanceof Array) )
                        {
                            log('type_error', indent + "attempted to get elements of a non-array");
                            return {'success':false};
                        }
                        for(var i = 0; i < curr_node.length; i++)
                        {
                            // console.log(indent + "INDEX:", i);
                            var elements = tensorvaluesgetter(root_node, curr_node[i], subpath, indent);
                            if( !elements.success )
                            {
                                return false;
                            }
                            ret = ret.concat(elements.value);
                        }
                    }
                    return {'success':true, 'value':ret};
                } else {
                    // console.log(indent + "KEYDEX:", sel);
                    var mel = curr_node[sel];
                    if( mel === undefined )
                    {
                        log('path_error', indent + "could not find element:", sel);
                        return {'success':false};
                    }
                    return tensorvaluesgetter(root_node, mel, subpath, indent);
                }
                break;
            case 'PARENT':
                return tensorvaluesgetter(root_node, parent(root_node, curr_node), subpath, indent);
            default:
                log('path_error', indent + "unknown path element type:", t);
                return {'success':false};
        }
    } catch (err) {
        log('path_error', "could not traverse path:", path_elements);
        return {'success':false};
    }

    log('path_error', "not sure what happened, here");
    return {'success':false};
}

function asserttoken(v, i, tok, err)
{
    if( !v[i] || v[i].token !== tok )
    {
        if( err )
        {
            log('parse_error', err);
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
    log('parse_error', err);
    return false;
}

unary_fns = {
    'abs' : function u_abs(p) { return abs(p); },
    'neg' : function u_neg(p) { return -p; },
    'not' : function u_not(p) { return !p; },
};
binary_fns = {
    'add' : function b_add(p1, p2) { return p1 + p2; },
};
aggregate_fns = {
    'sum' : function a_sum(a){
        var sum = 0;
        for(var i = 0; i < a.length; i++)
        {
            sum += a[i];
        }
        return sum;
    },
};
mixed_fns = {
     // need "find" but that's tensor-return, not scalar
     'count' : function m_count(target, a){
        var count = 0;
        for(var i = 0; i < a.length; i++)
        {
            if(a[i] === target ) count += 1;
        }
        return count;
    },
};

productions = {
    'p_subpath_helper' : p_subpath_helper = function p_subpath_helper(v, io, params){
        log('parse', params.label);
        log('parse', v);

        var path = [];
        var remainder = v;

        var succes = true;

        if(!asserttokens(v, 0, [puncts_str.DOT, puncts_str.LBRACK, puncts_str.LCHEV], 'subpath should start with one of: < [ .')) return false;
        if(!asserttoken(v, 1, 'SUBPATH', params.subpath_error)) return false;

        var subpath_type = v[0].tag.toLowerCase();

        if( subpath_type === 'parent' )
        {
            path.push({'type':'PARENT', 'selector':null});
            remainder = v.slice(2);
        } else if( subpath_type === params.subpath_types.m || subpath_type === params.subpath_types.e ) {
            if(!asserttoken(v, 2, puncts_str.LBRACK, "left bracket expected to start selector")) return false;

            var allow = [];
            if( subpath_type === params.subpath_types.m ) { allow.push('LABEL'); }
            if( subpath_type === params.subpath_types.e ) { allow.push('DIGITS'); }
            if( params.allow_star )                       { allow.push('STAR'); }
            if(!asserttokens(v, 3, allow, params.label_error))
            {
                return false;
            }

            if(!asserttoken(v, 4, puncts_str.RBRACK, "right bracket expected to finish selector")) return false;

            path.push({'type':subpath_type.toUpperCase(), 'selector':v[3].tag}); // null for star
            remainder = v.slice(5);
        } else {
            log('debug', params.subpath_types);
            log('parse_error', ".parent, ." + params.subpath_types.m + ", or ." + params.subpath_types.e + " required for subpath");
            return false;
        }

        log('debug', "remainder:", remainder);

        if(remainder.length > 0)
        {
            success = true;
            var prod = params.subprod; // p_scalar_subpath or p_tensor_subpath both yield puncts_str.DOT
            var i = prod.prefixes().indexOf(remainder[0].token); // if "DOT" is next...
            if( i > -1 )
            {
                var path_io = {'context':io.context};
                success = prod.parse(remainder, path_io);

                path = path.concat(path_io.path);
                remainder = path_io.remainder;
            }
        }

        io.path = path;
        io.remainder = remainder;
        return success;
    },
    'p_scalar_subpath' : {
        'prefixes' : function get_p_scalar_subpath_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_scalar_subpath_parse(v, io) {
            params = {
                'label'         : 'scalar_subpath:',
                'allow_star'    : false,
                'subpath_error' : 'subpath should start with subpath type (.member, .element, .parent)',
                'label_error'   : 'label expected as key',
                'index_error'   : 'digits expected as index',
                'subprod'       : productions.p_scalar_subpath,
            };
            return p_subpath_helper(v, io, params);
        },
    },
    'p_tensor_subpath' : {
        'prefixes' : function get_p_tensor_subpath_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_tensor_subpath_parse(v, io) {
            params = {
                'label'         : 'tensor_subpath:',
                'allow_star'    : true,
                'subpath_error' : 'subpath should start with subpath type (.members, .elements, .parent)',
                'label_error'   : 'label or * expected as key',
                'index_error'   : 'digits or * expected as index',
                'subprod'       : productions.p_tensor_subpath,
            };
            return p_subpath_helper(v, io, params);
        },
    },
    'p_params_helper' : p_params_helper = function p_params_helper(v, io, params){
        var comma = ',';
        var success;
        log('parse', params.label, v);

        var param1_io = {'context':io.context};
        success = params.first_prod.parse(v, param1_io);
        if( !success )
        {
            return false;
        }

        if( params.second_prod )
        {
            v = param1_io.remainder;
            if(!asserttoken(v, 0, puncts_str.COMMA, "comma required between binary function parameters")) return false;

            var param2_io = {'context':io.context};
            success = params.second_prod.parse(v.slice(1), param2_io);
            if( !success )
            {
                return false;
            }

            io.value = { 'param1' : param1_io.value, 'param2' : param2_io.value};
            io.remainder = param2_io.remainder;
            log('debug', io);
            return true;
        } else {
            io.value = { 'param1' : param1_io.value };
            io.remainder = param1_io.remainder;
            log('debug', io);
            return true;
        }
    },
    'p_unary_params' : {
        'prefixes' : function get_p_unary_params_prefixes(){return [puncts_str.DOT];},
        'parse'    : function p_unary_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'unary_params:',
                'first_prod' : productions.p_scalar,
            });
        },
    },
    'p_aggregate_params' : {
        'prefixes' : function get_p_aggregate_params_prefixes(){return ['.'];},
        'parse'    : function p_aggregate_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'aggregate_params:',
                'first_prod' : productions.p_tensor_path,
            });
        },
    },
    'p_binary_params' : {
        'prefixes' : function get_p_binary_params_prefixes(){return ['.'];},
        'parse'    : function p_binary_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'mixed_params:',
                'first_prod' : productions.p_scalar,
                'second_prod': productions.p_scalar,
            });
        },
    },
    'p_mixed_params' : {
        'prefixes' : function get_p_mixed_params_prefixes(){return ['.'];},
        'parse'    : function p_mixed_params_parse(v, io) {
            return p_params_helper(v, io, {
                'label':'mixed_params:',
                'first_prod' : productions.p_scalar,
                'second_prod': productions.p_tensor_path,
            });
        },
    },
    'p_unary' : {
        'functions' : unary_fns,
        'prefixes' : function get_p_unary_prefixes(){return ['UNARY'];},
        'params'   : function get_p_unary_params(){return 'p_unary_params';},
        'apply'    : function p_unary_parse(fname, params){
            log('apply', 'p_unary:');
            var p = params.value.param1;
            // log('path', params.context);
            if( p === undefined )
            {
                log('type_error', "can't apply function '" + fname + "' to param: ", p);
                return undefined;
            }
            return unary_fns[fname](p);
        }
    },
    'p_binary' : {
        'functions' : binary_fns,
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
            return binary_fns[fname](p1, p2);
        }
    },
    'p_mixed' : {
        'functions' : mixed_fns,
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
            return mixed_fns[fname](p1, p2);
        }
    },
    'p_aggregate' : {
        'functions' : aggregate_fns,
        'prefixes' : function get_p_aggregate_prefixes(){return ['AGGREGATE'];},
        'params'   : function get_p_aggregate_params(){return 'p_aggregate_params';},
        'apply'    : function p_aggregate_parse(fname, params){
            log('apply', 'p_aggregate:');
            var p = params.value.param1;
            // log('path', params.context);
            // console.log(p);
            if( p === undefined || !Array.isArray(p) )
            {
                log('type_error', "can't apply function '" + fname + "' to param:", p);
                return undefined;
            }
            return aggregate_fns[fname](p);
        }
    },
    'p_number' : {
        'cases'    : p_number_cases = ['DIGITS', 'NEG'],
        'prefixes' : function get_p_number_prefixes(){return p_number_cases;},
        'parse'    : function p_number_parse(v, io) {
            log('parse', "number:", v);
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
            if( isNaN(io.value) )
            {
                log('parse_error', "number could not be parsed");
                return false;
            }
            io.value = negate ? -io.value : io.value;
            log('debug', io);
            return true;
        },
    },
    'p_string' : {
        'prefixes' : function get_p_string_prefixes(){return ['STRING'];},
        'parse'    : function p_string_parse(v, io) {
            log('parse', "string:", v);
            if(v[0] && v[0].token !== 'STRING')
            {
                log('parse_error', "string must be string.");
                return false;
            }
            io.value = v[0].tag;
            io.remainder = v.slice(1);
            log('debug', io);
            return true;
        },
    },
    'p_bool' : {
        'cases'    : p_bool_cases = ['BOOL'],
        'prefixes' : function get_p_bool_prefixes(){return p_bool_cases;},
        'parse'    : function p_bool_parse(v, io) {
            log('parse', "bool:", v);
            if(!asserttoken(v, 0, 'BOOL', "bool must be bool.")) return false;

            var tag = v[0].tag.toLowerCase();
            io.remainder = v.slice(1);
            if( tag === 'true' )
            {
                io.value = true;
                return true;
            }
            if( tag === 'false' )
            {
                io.value = false;
                return true;
            }
            log('parse_error', "bool must be true or false");
            return false;
        },
    },
    'p_null' : {
        'prefixes' : function get_p_null_prefixes(){return ['NULL'];},
        'parse'    : function p_null_parse(v, io) {
            log('parse', "null:", v);
            if( !v[0] || v[0].token !== 'NULL' )
            {
                log('parse_error', "null must be null");
                return false;
            }
            io.value = null;
            io.remainder = v.splice(1);
            log('debug', io);
            return true;
        },
    },
    'p_path_helper' : p_path_helper = function p_path_helper(v, io, parseparams){
        log('parse', parseparams.label, v);

        var i = parseparams.prefixes.indexOf(v[0].token);
        if( i === -1 )
        {
            log('parse_error', parseparams.error1);
            return false;
        }

        var prefix = parseparams.prefixes[i];

        var path = [ {'type':prefix, 'selector':null} ];
        var success = true;

        // check for subpath and parse if present
        var remainder = v.slice(1);

        var prod = parseparams.prod; // p_scalar_subpath or p_tensor_path_prefixes both yield puncts_str.DOT
        var j = prod.prefixes().indexOf(v[1].token);
        if( j > -1 )
        {
            var path_io = {'context':io.context};
            success = prod.parse(remainder, path_io);

            if( !success ) { return false; }

            path = path.concat(path_io.path);
            io.remainder = path_io.remainder;
        } else {
            io.remainder = remainder;
        }

        if( !success ) { return false; }

        var got = parseparams.getter(io.context.root, io.context.curr, path);
        log('path', got);
        if( got.success )
        {
            io.value = got.value;
            io.remainder = io.remainder;

            log('debug', io);
            return true;
        }
        return false;
    },
    'p_scalar_path' : {
        'cases'    : p_scalar_path_prefixes = [puncts_str.SLASH, puncts_str.DOT, puncts_str.LBRACK, puncts_str.LCHEV],
        'prefixes' : function get_p_scalar_path_prefixes(){return p_scalar_path_prefixes;},
        'parse'    : function p_scalar_path_parse(v, io) {
            return p_path_helper(v, io, {
                'label'    : "scalar path:",
                'prefixes' : p_scalar_path_prefixes,
                'error1'   : 'scalar path must start with one of: [ < . /',
                'prod'     : productions.p_scalar_subpath,
                'getter'   : scalarvaluegetter,
            });
        },
    },
    'p_tensor_path' : {
        'cases'    : p_tensor_path_prefixes = [puncts_str.SLASH, puncts_str.DOT, puncts_str.LBRACK, puncts_str.LCHEV],
        'prefixes' : function get_p_tensor_path_prefixes(){return p_tensor_path_prefixes;},
        'parse'    : function p_tensor_path_parse(v, io) {
            return p_path_helper(v, io, {
                'label'    : "tensor path:",
                'prefixes' : p_tensor_path_prefixes,
                'error1'   : 'tensor path must start with one of: [ < . /',
                'prod'     : productions.p_tensor_subpath,
                'getter'   : tensorvaluesgetter,
            });
        },
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
            var left = '(', right = ')';
            log('parse', "function_call:", v);
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

                if( !v[1] || v[1].token !== puncts_str.LPAREN )
                {
                    log('parse_error', "left paren expected to start function call params");
                    return false;
                }

                var params_io = {'context':io.context};
                var parm_prod = productions[prod.params()];
                var success = parm_prod.parse(v.slice(2), params_io);
                if( !success )
                {
                    return false;
                }
                log('debug', "params_io:", params_io);
                v = params_io.remainder;

                if( !v[0] || v[0].token !== puncts_str.RPAREN )
                {
                    log('parse_error', "right paren expected to finish function call params");
                    return false;
                }
                log('debug', "APPLYING");

                var collection_or_value = params_io.value;
                if( fns[fname] )
                {
                    log('debug', "FUNCTION:", fname);
                    io.value = prod.apply(fname, params_io);
                }
                io.remainder = v.slice(1);
                if( io.value === undefined )
                {
                    return false;
                }

                log('debug', io);
                return true;
            }
            log('parse_error', "function call must start with a function keyword");
            return false;
        },
    },
    'p_scalar' : {
        'cases'    : p_scalar_cases = ['p_number', 'p_string', 'p_bool', 'p_null', 'p_scalar_path', 'p_function_call'],
        'prefixes' : function get_p_scalar_prefixes(){
            var ret = [];
            for(var i = 0; i < p_scalar_cases.length; i++)
            {
                ret = ret.concat(productions[p_scalar_cases[i]].prefixes());
            }
            return ret;
        },
        'parse'    : function p_scalar_parse(v, io) {
            log('parse', "scalar:", v);
            for(var i = 0; i < p_scalar_cases.length; i++)
            {
                var prod_name = p_scalar_cases[i];
                var prod = productions[prod_name];
                if( prod.prefixes().indexOf(v[0].token) > -1 )
                {
                    var scalar_io = {'context':io.context};
                    var success = prod.parse(v, scalar_io);
                    io.value     = scalar_io.value;
                    io.remainder = scalar_io.remainder;
                    log('debug', io);
                    return success;
                }
            }
            log('parse_error', "scalar must be number, string, bool, null, scalar path, or function call");
            return false;
        },
    },
    'p_formula' : {
        'cases'    : ['p_scalar'],
        'prefixes' : function get_p_formula_prefixes(){return [puncts_str.EQUALS];},
        'parse'    : function p_formula_parse(v, io) {
            log('parse', "formula:", v);

            if( !v[0] || v[0].token !== puncts_str.EQUALS )
            {
                log('parse_error', "formula must start with " + puncts_str.EQUALS);
                return false;
            }

            var scalar_io = {'context':io.context};
            var success = productions.p_scalar.parse(v.slice(1), scalar_io);
            io.value     = scalar_io.value;
            io.remainder = scalar_io.remainder;
            if( success && scalar_io.remainder.length > 0 )
            {
                log('parse_error', "didn't expect anything after formula, got:", scalar_io.remainder);
                return false;
            }
            log('debug', io);
            return success;
        }
    }
};

function parse_formula(formula, io)
{
    var tokenstream = lex(formula);
    log('lex', tokenstream);
    if( tokenstream === false )
    {
        return false;
    }
    var formula_io = {'context':io.context};
    var success = productions.p_formula.parse(tokenstream, formula_io);
    io.value = formula_io.value;
    return success;
}

function load_some_data(cb)
{
    var fs = require('fs');
    var testjson = fs.readFile('dnd.json', cb);
}

function runtest(context)
{
    for(var i = 0; i < formula_candidates.length; i++)
    {
        var f = formula_candidates[i].text;
        var r = formula_candidates[i].result;
        log('formula', "candidate:", f);
        var io = {'context':context};
        result = parse_formula(f, io);
        log('testing', {'success':result, 'io':io});
        if( result !== r.success )
        {
            log('testing', "result was", result, "; should have been", r.success);
        } else if( io.value !== r.value ) {
            log('testing', "value was", io.value, "; should have been", r.value);
        } else {
            log('testing', "result and value were correct.");
        }
        log('padding', '\n');
    }
}

function parent(tree, target)
{
    var sub;
    if( tree instanceof Array ) {
        for( var i = 0; i < tree.length; i++ ) {
            if( tree[i] === target ) { return tree; }
            sub = parent(tree[i], target);
            if( sub ) { return sub; } }
        return false; }
    if( tree instanceof Object ) {
        for( var key in tree ) {
            if( tree[key] === target ) { return tree; }
            sub = parent(tree[key], target);
            if( sub ) { return sub; } }
        return false; }
}

load_some_data(function(err, data){
    var root = JSON.parse(data);

    var n1 = root.characters[0].abilities;
    log('debug', n1, parent(root, n1));
    var context1 = {'root':root, 'curr':n1};
    log('debug', context1);
    runtest(context1);

    // var n2 = root['array-of-arrays'][2][1];
    // log('debug', n2, parent(root, n2));
    // var context2 = {'root':root, 'curr':n2};
    // log('debug', context2);
    // runtest(context2);
});
