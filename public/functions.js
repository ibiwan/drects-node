var log = require('./log').log;

functions = {
    'unary' : {
        'abs' : function u_abs(p) { return abs(p); },
        'neg' : function u_neg(p) { return -p; },
        'not' : function u_not(p) { return !p; },
    },
    'binary' : {
        'add' : function b_add(p1, p2) { return p1 + p2; },
        'sub' : function b_sub(p1, p2) { return p1 - p2; },
        'mul' : function b_mul(p1, p2) { return p1 * p2; },
        'div' : function b_div(p1, p2) { return p1 / p2; },
        'mod' : function b_mod(p1, p2) { return p1 % p2; },
    },
    'aggregate' : {
        'sum' : function a_sum(a){
            var sum = 0;
            for(var i = 0; i < a.length; i++)
            {
                sum += a[i];
            }
            return sum;
        },
        'mean' : function a_mean(a){
            var sum = 0;
            var count = 0;
            for(var i = 0; i < a.length; i++)
            {
                count++;
                sum += a[i];
            }
            return sum/count;
        },
        'max' : function a_max(a){
            log('apply', "taking max of", a);
            var max = -Infinity;
            for( var i = 0; i < a.length; i++)
            {
                log('apply', 'a[i]', a[i]);
                if( a[i] > max )
                {
                    max = a[i];
                }
                return max;
            }
        }
    },
    'mixed' : {
        'count' : function m_count(target, a){
            var count = 0;
            for(var i = 0; i < a.length; i++)
            {
                if(a[i] === target ) count += 1;
            }
            return count;
        },
    },
    // need "find" but that's tensor-return, not scalar
};

function get_list(){
    var list = [];
    for(var type in functions)
    {
        for(var name in functions[type])
        {
            list.push({'type':type, 'name':name});
        }
    }
    return list;
}

myexports = {
    'functions' : functions,
    'get_list':  get_list,
};
if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
    //Running inside node
    module.exports = myexports;
} else if ( typeof define === 'function' && define.amd ) {
    //Running inside AMD (require.js)
    define([], function () {return myexports;});
} else {
    //Dunno where we are, add it to the global context with a noConflict
    var previous = context.myexports;
    myexports.noConflict = function () {
        context.myexports = previous;
        return myexports;
    };
    context.myexports = myexports;
}
