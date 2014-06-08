## Dynamisaurus Rects, implemented in Node.js

- [Concept](#user-content-concept)
    - [Problem](#user-content-problem)
    - [Solution](#user-content-solution)
- [Usage](#user-content-usage)
    - [Formulas](#user-content-formulas)
    - [Future editing capabilities:](#user-content-future-editing-capabilities)
    - [Per-document preferences](#user-content-per-document-preferences)
- [Installation](#user-content-installation)
- [Direction](#user-content-direction)

===========

### Concept

#### Problem

Spreadsheet solutions like Excel and Google Docs are focused on tabular data, so anything compiled more of small arrays and scalar values requires careful layout and risk of broken cell references when changes are made in remote locations in the file.  

On the other hand, database solutions like MySQL, MS Access, and Filemaker require extensive schema design, programming, infrastructure, and maintenance.  
#### Solution

Using [json](http://www.json.org/) as a document storage format, implement a flexible viewer for arbitrarily-structured data.  Allow WYSIWYG editing of all fields, objects, arrays, and keys.  Allow strings, numeric values, booleans, empty fields, and formulas.  Calculate formulas much like Excel does, so that changes are reflected in real-time.  Cell references use a filename-like syntax that allows for both absolute paths and paths relative to the formula cell.  This level of complexity strikes a sweet spot between the Excel and Access families, allowing for non-tabular data, that can still be edited and calculated by non-programmers.

### Usage

An admin uses the command-line tool to create a user account:

    `./userpass.js --user=username --pass=p@ssword1 --name=Fullname`

...and runs the server from node:

    `./rects_s.js`

The user can then log into the system with their web browser:

    `http://localhost:1338`

![user login](https://raw.githubusercontent.com/ibiwan/drects-node/master/screenshots/login-form.png "user login")

The user can select an existing document to open, or (soon) select an option to create a new file.  Once logged in, there are links to log out or select a different file.

![document selection](https://raw.githubusercontent.com/ibiwan/drects-node/master/screenshots/document-selection.png "document selection")

ASSUMING the user has the file they want open, they will see the file's contents displayed in a nice, intelligently-rendered heirarchy.  Any level of the heirarchy can be collapsed individually with the chevron icon by that subtree's title.  Arrays' elements are titled by integer indices, and Objects' by string keys.

![sample viewer](http://raw.githubusercontent.com/ibiwan/drects-node/master/screenshots/main-viewer.png "sample viewer")

![collapsed array elements](https://raw.githubusercontent.com/ibiwan/drects-node/master/screenshots/collapsed-levels.png "collapsed array elements")

Any field can be edited by double-clicking the displayed value, which displays up a drop-down menu of available variable types, and an editing field for the value.  After hitting enter, the field is validated, and if valid, the file is saved to the server.  For now, the file is saved to "saved.json" instead of overwriting the original.

![field editing](https://raw.githubusercontent.com/ibiwan/drects-node/master/screenshots/field-editing.png "field editing")
![type selection](https://raw.githubusercontent.com/ibiwan/drects-node/master/screenshots/type-selection.png "type selection")

#### Formulas

A `formula` field contains a string starting with `=`, and consists of any combination of literal values or cell references, or built-in functions acting on them.  

Examples:
- `=sum(../levels/*/level)`
- `=max(/stores/ledgers/months/*/profit)`
- `=/owner`
- `=../username`
- `=add(count(../apples/*), max(../oranges/*/weight))`

#### Future editing capabilities:

* a drop-down menu will be available with options to cut/copy/paste/templatize/move/clear a given sub-tree
* menu options or icons will be available to add or delete fields, arrays, objects
* object member names will be editable

#### Per-document preferences

Certain objects can be added to the root level of the document, to customize the display options the viewer uses:

`rex-ordering` : a single array of strings.  Any time those strings are encountered as keys in a single object in the document, the associated subtrees will appear in the same order as the keys are found in the config array.

`rex-primaries` : a single object of string-string pairs (K, V).  Normally, collapsing an array element will hide all its contents, and just display a single integer, the element's index.  If the _array_ is associated with a label, K, in the config object, and the collapsed _element_ contains an object with member labeled V, the member's value will be displayed when the array element is collapsed.

### Installation
- Install node ([download](http://nodejs.org/download/))
- Clone git repo of project: 
    `https://github.com/ibiwan/drects-node.git`
- In project directory, use npm to install dependencies:
    `npm install express body-parser morgan sqlite3 cookie-parser express-session password-hash-and-salt csurf handlebars`
- See "Usage" section above for further directions

### Direction
I've got lots of [hopes](https://github.com/ibiwan/drects-node/issues) for where to take this.  Besides the editing capabilities mentioned above, I'd like to have:
- upload/download
- collaboration and sharing
- more built-in functions and function categories
- the ability to use data from external sources
- user management capabilities
- full document change histories
- add support for Firefox; for now only works in Chrome and Safari

=====

Table of Contents generated with [DocToc](http://doctoc.herokuapp.com/)

