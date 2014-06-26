(function(init){  // deps
    if ( typeof module === 'object' && module && typeof module.exports === 'object' ) {
        // node
        module.exports = init(require('./log').log);
    } else if ( typeof define === 'function' && define.amd ) {
        // amd (require.js)
        define(['./log'], function (log) {return init(log.log);});
    }
})(function(log){ // init

    function isArray(node)
    {
        return node instanceof Array;
    }
    function isObject(node)
    {
        return node instanceof Object;
    }
    function isLeaf(node)
    {
        return(!(isArray(node) || isObject(node)));
    }
    function selectors(node)
    {
        if(isArray(node))
        {
            var indices = [];
            for(var i = 0; i < node.length; i++)
            {
                indices.push(i);
            }
            return indices;
        }
        if(isObject(node))
        {
            var keys = [];
            for(var k in node)
            {
                keys.push(k);
            }
            return keys;
        }
    }
    function parent(tree, target)
    {
        var sub;
        if( isArray(tree) ) {
            for( var i = 0; i < tree.length; i++ ) {
                if( tree[i] === target ) { return tree; }
                sub = parent(tree[i], target);
                if( sub ) { return sub; } }
            return false; }
        if( isObject(tree) ) {
            for( var key in tree ) {
                if( tree[key] === target ) { return tree; }
                sub = parent(tree[key], target);
                if( sub ) { return sub; } }
            return false; }
    }
    function child(tree, selector)
    {
        var field = tree[selector]; // member or element
        if( field === undefined )
        {
            log('path_error', "could not find element:", selector, "in tree:", tree);
            throw( "could not find element:" + selector);
        }
        return field;
    }
    function value(node)
    {
        return node;
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

