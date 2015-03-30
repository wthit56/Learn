var compile = (function() {
	function compile(code) {
		return new Function("return " + (code + "").replace(findLiterals, formatLiteral))();
	}

	var toEscape = /["\\]/g, newLine = /\n/g;
	var findLiterals = /_\/\*([\W\w]*?)\*\//g;
	function formatLiteral(match, literal) {
		return "\"" + literal.replace(toEscape, "\\$&").replace(newLine, "\\n\\\n") + "\"";
	}

	return compile;
})();

var renderCode = compile(function() {
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
				return _/*<span class="*/ + (
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

	var getBody = /^function\s*\S*\s*\([^)]*\)\s*\{([\W\w]*)\}$/;
	var findLessThan = /</g;

	return function(code) {
		var lang = code.name;
		if (!lang) { lang = "js"; }
		else if (!(lang in renderers)) { lang = null; }

		code = (code + "").match(getBody)[1];

		var tab = code.match(findTab); tab = tab ? tab[1].length : 0;
		if (tab > 0) {
			code = code.replace(new RegExp("^\t{1," + tab + "}", "mg"), "");
		}

		if (lang) {
			code = code.replace(renderers[lang].find, renderers[lang].replace);
		}

		code = code.replace(findLeadingWhitespace, "");

		console.log(lang);

		return _/*<code*/ + (lang ? _/* class="block */ + lang + _/*"*/ : "") + _/*>*/ +
			code +
		_/*</code>*/;
	};
})();

var render = compile(function() {
	var findLines = /^\s*(\()?(\S[\W\w]*?)\)?$/gm;
	function renderLines(match, aside, text) {
		text = text.replace(findSpecials, renderText);
		return (
			aside
				? "<aside>" + text + "</aside>"
				: "<p>" + text + "</p>"
		);
	}

	var findSpecials = /[<]|(`([^`]*)`)|(_([^_]*)_)/g;
	function renderText(match, inline, inlineCode, em, emText) {
		console.log(!!inline);
		return (
			inline ? "<code>" + inlineCode.replace(findSpecials, renderText) + "</code>" :
			em ? "<em>" + emText + "</em>" :
			match === "<" ? "&lt;" :
				match
		);
	}

	function renderContent(part) {
		if (typeof part === "string") {
			return part.replace(findLines, renderLines);
		}
		else if (part instanceof Function) {
			return renderCode(part);
		}
		else if (part instanceof Array) {
			return (
				_/*<h2>*/ + part[0] + _/*</h2>
				*/ + part.slice(1).map(renderContent).join("\n")
			);
		}
	}

	return function render(data) {
		data = compile(data)();
		document.write(_/*
			<html>
				<head>
					<title>*/ + data.title + _/*</title>
					<link href="styles.css" rel="stylesheet" type="text/css" />
					<script src="script.js" type="text/javascript"></script>
				</head>
				<body>
					<h1>*/ + data.title + _/*</h1>
					*/ + data.content.map(renderContent).join("\n") + _/*
				</body>
			</html>
		*/);
	};
})();