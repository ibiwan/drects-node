(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init();
    } else if ( typeof define === 'function' && define.amd ) {
        // amd (require.js)
        define([], function () {return init();});
    }
})(function(){ // init

    function isArray(node)
    {
        return (node.attr('class') === 'array');
    }
    function isObject(node)
    {
        return (node.attr('class') === 'object');
    }
    function isLeaf(node)
    {
        return(!(isArray(node) || isObject(node)));
    }
    function selectors(node)
    {
        var kids = node.data('$$children');
        if(isArray(node))
        {
            var indices = [];
            for(var i = 0; i < kids.length; i++)
            {
                indices.push(i);
            }
            return indices;
        }
        if(isObject(node))
        {
            var keys = [];
            for(var k in kids)
            {
                keys.push(k);
            }
            return keys;
        }
    }
    function parent(tree, node)
    {
        return node.data('$parent');
    }
    function child(node, selector)
    {
        var kids = node.data('$$children');
        var mel = kids[selector]; // member or element
        if( mel === undefined )
        {
            log('path_error', "could not find element:", sel);
            return {'success':false};
        }
        return {'success':true,'child':mel};
    }
    function value(node)
    {
        return parseFloat(node.text());
    }

    return {
        'isArray'   : isArray,
        'isObject'  : isObject,
        'isLeaf'    : isLeaf,
        'parent'    : parent,
        'child'     : child,
        'selectors' : selectors,
        'value'     : value,
    };
});

