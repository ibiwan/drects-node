#!/usr/local/bin/node

(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        var parser = require('./public/parser');
        module.exports = init(
            parser,
            require('./public/log').log,
            require('./public/lexer'),
            require('fs')
        );
    } else if ( typeof define === 'function' && define.amd ) {
        // amd (require.js)
        define(['./parser', './log', './lexer', 'fs'], function (parser, log, lexer, fs) {return init(parser, log.log, lexer, fs);});
    }
})(function(parser, log, lex, fs){ // init
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
            log('parse_error', e.stack);
            return false;
        }

        log('testing', {'success':result, 'io':io});
        if( result !== r.success ) throw "testing: result was " + result + "; should have been " + r.success;
        if( io.value !== r.value ) throw "testing: value was " + io.value + "; should have been " + r.value;
        log('testing', "result and value were correct.");
        log('padding', '\n');
    }

    fs.readFile('./documents/dnd.json', function(err, data){
        var i;
        var root = JSON.parse(data);

        var formula_candidates = [
            {
                'node'   : root,
                'text'   : '=sum(/characters/*/levels/*/level)',
                'result' : {'success':true, 'value':147.7}
            },
            {
                'node'   : root,
                'text'   : '=sum(/characters/1/levels/*/level)',
                'result' : {'success':true, 'value':14.7}
            },
            {
                'node'   : root,
                'text'   : '=sum(/characters/0/levels/*/level)',
                'result' : {'success':true, 'value':133}
            },
            {
                'node'   : root.characters[0].abilities,
                'text'   : '=add(max(../levels/*/level), 2)',
                'result' : {'success':true, 'value':134}
            },
            {
                'node'   : root.characters[0].abilities,
                'text'   : '=sum(../levels/*/level)',
                'result' : {'success':true, 'value':133}
            },
            {
                'node'   : root.characters[0].abilities,
                'text'   : '=sum(/characters/*/name=exultation/../levels/*/level)',
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
                log('testing', e.stack);
            }
        }
    });
});
