// $Id: shex-partition.js,v 1.2 2015/05/28 13:52:24 eric Exp $ -- execute ShEx valition over input data.
// invocation:
//   node shex-toResourceShapes.js test/Issue-js-test-date-triple.shex

require('./RDF.js')
require('./ShExParser.js')
var FS = require('fs')

function usage () {
    console.warn("Usage: " + process.argv[2] + "<ShEx file> <shape name>+");
    return 1;
}

function CannotRead (file, e) {
    this.name = 'CannotRead';
    this.file = file;
    this.message = "Can't read " + this.file;
    this.stack = e ? e.stack : (new Error()).stack;
};
CannotRead.prototype = new Error();
CannotRead.prototype.constructor = CannotRead;


if (process.argv.length < 3) // guessing we're invoked like `node shex-toResourceShapes.js schema.shex`
    process.exit(usage());
var schemaFile = process.argv[2];
var includes = process.argv.slice(2); // which shapes to include
try {
    var shex;
    try {
        process.stderr.write("parsing " + schemaFile + "\n");
        shex = FS.readFileSync(schemaFile, 'utf8');
    } catch (e) {
        throw new CannotRead(schemaFile, e); // @@ console.error and exit after transplanting exception intel.
    }
    var schema = ShExParser.parse(shex);
    var looseEnds = {};
    var needed = {};
    includes.forEach(function (include) {
	var s2 = schema.partition([include], looseEnds, needed);
	var lost = Object.keys(looseEnds);
	lost = lost.filter(function (l) { return needed[l]; });
	lost.sort();
	lost.forEach(function (resource) {
            var referentShapes = looseEnds[resource];
            var dump = Object.keys(referentShapes);
            process.stderr.write("# unknown shape " + resource + " is referenced in "
				 + dump.length + " shapes. These are in our partition:\n");
            dump = dump.filter(function (l) { return needed[l]; });
            dump.sort();
            dump.forEach(function (shape) {
		referentShapes[shape].forEach(function (msg) {
                    process.stderr.write("  " + shape + "{" + msg + "}\n");
		});
            });
	});
	var outFile = include.slice(1, -1)+".shex";
	FS.writeFile(outFile, s2.toString, function(err) {
	    if(err) {
		return console.log(err);
	    }
	    console.log("wrote "+outFile);
	});
	// process.stdout.write(s2.toString());
    });
} catch (e) {
    if (e instanceof CannotRead) {
        console.error("unable to read ShEx file \"" + e.file + "\":\n" + e.stack);
        process.exit(2);
    } else if (e.name === "SyntaxError") {
	console.error(schemaFile+":"+e.line+":"+e.column+": (offset: "+e.offset+"): error: "+e.message);
	process.exit(4);
    } else {
	console.error(e.stack);
	process.exit(4);
    }
}

