var parser = require('./public/parser');
var log = require('./public/log').log;
var lex = require('./public/lexer');
var fs = require('fs');

function parse_formula(formula, io)
{
    var tokenstream;
    try {
        tokenstream = lex.lex(formula);
        log('lex', tokenstream);
    }catch(e){
        log('lex_error', e);
        return false;
    }
    try {
        var formula_io = {'context':io.context};
        parser.parse(tokenstream, formula_io);
        io.value = formula_io.value;
    }catch(e){
        log('parse_error', e);
        return false;
    }
    return true;
}


function runtestitem(tree, test_item)
{
    var f = test_item.text;
    var n = test_item.node;
    var r = test_item.result;

    log('formula', "candidate:", f);

    var io = {'context':{'root':tree, 'curr':n}};
    try{
        result = parse_formula(f, io);
    }catch(e){
        log('parse_error', e);
        return false;
    }

    log('testing', {'success':result, 'io':io});
    if( result !== r.success ) throw "testing: result was " + result + "; should have been " + r.success;
    if( io.value !== r.value ) throw "testing: value was " + io.value + "; should have been " + r.value;
    log('testing', "result and value were correct.");
    log('padding', '\n');
}

fs.readFile('./dnd.json', function(err, data){
    var i;
    var root = JSON.parse(data);

    var formula_candidates = [
        {
            'node'   : root,
            'text'   : '=sum(/<characters>[*]<levels>[*]<level>)',
            'result' : {'success':true, 'value':147.7}
        },
        {
            'node'   : root,
            'text'   : '=sum(/<characters>[1]<levels>[*]<level>)',
            'result' : {'success':true, 'value':14.7}
        },
        {
            'node'   : root,
            'text'   : '=sum(/<characters>[0]<levels>[*]<level>)',
            'result' : {'success':true, 'value':133}
        },
        {
            'node'   : root.characters[0].abilities,
            'text'   : '=add(max(.parent<levels>[*]<level>), 2)',
            'result' : {'success':true, 'value':134}
        },
        {
            'node'   : root.characters[0].abilities,
            'text'   : '=sum(.parent<levels>[*]<level>)',
            'result' : {'success':true, 'value':133}
        },
    ];

    for(i = 0; i < 10; i++) { log('padding'); }

    for(i = 0; i < formula_candidates.length; i++)
    {
        try{
            var cand = formula_candidates[i];
            log('debug', cand);
            runtestitem(root, cand);
        }catch(e){
            log('testing', e);
        }
    }
});
