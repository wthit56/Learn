var extractBody = (function() {
	var getBody = /^function\s*\(\)\s*\{([\W\w]*)\}$/;
	return function(code) { return (code + "").match(getBody)[1]; };
})();

var rewrite = (function() {
	var toEscape = /["\\]/g, newLine = /\n/g;
	
	function rewrite(code) {
		return extractBody(code).replace(literal, formatLiteral);
	}
	rewrite.plain = function(code) {
		return extractBody(code).replace(literal, plain);
	};

	var literal = /_?\/\*([\W\w]*?)\*\//g;
	function formatLiteral(match, literal) {
		return "\"" + literal.replace(toEscape, "\\$&").replace(newLine, "\\n") + "\"";
	}
	function plain(match, literal) { return literal; };

	return rewrite;
})();
var hasReturn = /\breturn \b/;
function compile(code) {
	code = rewrite(code);
	if (!hasReturn.test(code)) { code = "return " + code; }
	return new Function(code)();
}

var writeCode = compile(function() {
	var renderers = {
		js: {
			find: (function() {
				// (\/\/[^\r\n]*|\/\*[\W\w]*?\*\/)|("(?:[^\\]*?(?:\\[\W\w])?)+?"|'(?:[^\\]*?(?:\\[\W\w])?)+?')|(\/(?:[^\/\n\r]*?(?:\\[\W\w])?)+?\/[gmi]*)|([!=]==?)|((?:[+-\/\*%&^|]|(<<|>>>?))?=)|(<<|>>>?)|([!=]==?|[<>]=?)|(&&|\|\|)|([&^|~])|([(){}[\],!;?:\.])|(\+\+|--|[+-\/\*%])|(0[xX][0-9A-Fa-f]+|(?:\d+|0)(?:\.\d+)?(?:e[+-][1-9]\d*)?|true|false)|(null|undefined)|(\b(?:break|case|class|catch|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|instanceof|in|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|null|undefined|NaN)\b)|(\w+(?=\())
				return new RegExp(
					"(" + [
						/\/\/[^\r\n]*|\/\*[\W\w]*?\*\//, // comment
						/"(?:[^\\]*?(?:\\[\W\w])?)+?"|'(?:[^\\]*?(?:\\[\W\w])?)+?'/, // string
						/\/(?:[^\/\n\r]*?(?:\\[\W\w])?)+?\/[gmi]*/, // regex
						/[!=]==?/, // equality
						/(?:[+-\/\*%&^|]|(?:<<|>>>?))?=/, // assignment
						/<<|>>>?/, // bitwise shift
						/[!=]==?/, // strict equality
						/[<>]=?/, // relational
						/&&|\|\|/, // logical
						/[&^|~]/, // bitwise
						/[(){}[\],!;?:\.]/, // punctuation
						/\+\+|--|[+-\/\*%]/, // arithmetic
						/0[xX][0-9A-Fa-f]+|(?:\d+|0)(?:\.\d+)?(?:e[+-][1-9]\d*)?/, // number
						"(?:\\b(" + [
							/true|false/, // boolean
							/null|undefined/, // null-like
							// keyword
							/break|case|class|catch|const|continue|debugger|default|delete|do|else|export|extends|finally|for|function|if|import|instanceof|in|let|new|return|super|switch|this|throw|try|typeof|var|void|while|with|yield|null|undefined|NaN/,
						].map(function(part) { return part.source; }).join(")|(") + ")\\b)",
						/\b\w+(?=\()/, // function call
						/\b\w+(?=\.)/ // object
					].map(function(part) { return part.source || part; }).join(")|(") + ")",
					"g"
				);
			})(),
			
			replace: function(match,
				comment, string, regex, equality, assignment, bitwise_shift, strict_equality,
				relational, logical, bitwise, punctuation, arithmetic, number,
				words, boolean, nully, keyword,
				call, object
			) {
				return /*<span class="*/ + (
					comment ? "comment" :
					string ? "literal string" :
					regex ? "literal regex" :
					equality ? "operator comparison equality" :
					assignment ? "operator assignment" :
					bitwise_shift ? "operator bitwise-shift" :
					strict_equality ? "operator comparison equality strict" :
					relational ? "operator comparison relational" :
					logical ? "operator logical" :
					bitwise ? "operator bitwise" :
					punctuation ? "punctuation" :
					arithmetic ? "operator arithmetic" :
					number ? "literal number" :
					boolean ? "literal word boolean" :
					nully ? "word nully" :
					keyword ? "word keyword" :
					call ? "call" :
					object ? "object" :
						""
				) + _/*">*/ + match.replace(findLessThan, "&lt;") + _/*</span>*/;
			}
		}
	};

	var findTab = /^(\t+)/m;
	var findLessThan = /</g;
	//var findBeforeFirstNewLine = /^\r?\n([^\r\n]+)/;
	var findLeadingWhitespace = /^\s*/;

	return function(lang, code) {
		if (arguments.length === 1) { code = lang; lang = null; }
		if (!(lang in renderers)) { lang = null; }

		if (lang === "js") { code = extractBody(code); }
		else { code = rewrite.plain(code); }

		var tab = code.match(findTab); tab = tab ? tab[1].length : 0;
		if (tab > 0) {
			code = code.replace(new RegExp("^\t{1," + tab + "}", "mg"), "");
		}

		if (lang) {
			code = code.replace(renderers[lang].find, renderers[lang].replace);
		}

		code = code.replace(findLeadingWhitespace, "");

		document.write(/*<code*/ + (lang ? _/* class="*/ + lang + _/*"*/ : "") + _/*>*/ +
			code +
		_/*</code>*/);
	};
});