var compile = (function() {
	function compile(code) {
		return new Function("return " + (code + "").replace(findLiterals, formatLiteral))();
	}

	var toEscape = /["\\]/g, newLine = /\n/g, escapedEnd = /\*_\//g;
	var findLiterals = /_\/\*([\W\w]*?)\*\//g;
	function formatLiteral(match, literal) {
		return "\"" + literal.replace(toEscape, "\\$&").replace(newLine, "\\n\\\n").replace(escapedEnd, "*/") + "\"";
	}

	return compile;
})();

var render = compile(function() {
	function render(defaultLang, data) {
		if (arguments.length === 1) { data = defaultLang; defaultLang = null; }
		if (defaultLang) { render.code.inlineDefault = defaultLang; }

		data = compile(data)();
		level = 1;
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

	var rule = "\n<hr />\n";

	var level;
	var findLines = /(\r?\n(?:\s*\r?\n)+)|^\s*(?:(\(\S[^\r\n)]*\)(?:\r?\n\s*\(\S[^\r\n)]*?\))+)|\((\S[\W\w]*?)\)|(\S[\W\w]*?))$/gm;
	function renderContent(part, i, a) {
		if (typeof part === "string") {
			return (
				((i > 0) && (typeof a[i - 1] === "string") ? rule : "") +
				part.replace(findLines, renderLines)
			);
		}
		else if (part instanceof Function) {
			return render.code(part);
		}
		else if (part instanceof Array) {
			level++;
			var result = (
				"<h" + level + ">" + part[0] + "</h" + level + ">\n" +
				part.slice(1).map(renderContent).join("\n")
			);
			level--;
			return result;
		}
	}
	
	function renderLines(match, text_break, multi_aside, aside, text) {
		return (
			multi_aside ? "<aside>" + multi_aside.replace(findAsides, renderAside) + "</aside>" :
			aside ? "<aside>" + aside.replace(findSpecials, renderText) + "</aside>" :
			text ? "<p>" + text.replace(findSpecials, renderText) + "</p>" :
			text_break ? rule :
				match
		);
	}

	var findAsides = /^\s*\(([\W\w]*?)\)$/gm;
	function renderAside(match, aside) {
		return "<p>" + aside.replace(findSpecials, renderText) + "</p>";
	}

	var entities = { "<": "&lt;" };
	var findQuotes = /['"]/g;
	var findAngles = /</g;
	var findSpecials = /<|(`([^`]*)`)|([^'"\s])(['"]+)|(['"]+)(?=[^'"\s])|(_([^_]*)_)/g;

	function replaceClosing(match) { return (match === "'" ? "&rsquo;" : "&rdquo;"); }
	function replaceOpening(match) { return (match === "'" ? "&lsquo;" : "&ldquo;"); }

	function renderText(
		match,
		inline, inlineCode,
		closing, closingQuotes,
		openingQuotes,
		em, emText
	) {
		return (
			inline ? render.code(inlineCode, true) :
			openingQuotes ? openingQuotes.replace(findQuotes, replaceOpening) :
			closing ? closing + closingQuotes.replace(findQuotes, replaceClosing) :
			em ? "<em>" + emText + "</em>" :
			match in entities ? entities[match] :
				match
		);
	}

	render.code = compile(function() {
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

		var parseFunction = /^function\s*(\S*)\s*\([^)]*\)\s*\{(?:[^\S\n\r]*\/\/[^\S\n\r]*([^\r\n]+))?([\W\w]*)\}$/;
		var parseString = /^(?:(js|txt)\;)?([\W\w]*)$/;
		var findLessThan = /</g;
		var id = 0;

		function render_code(code, inline) {
			var lang;
			if (code instanceof Function) {
				code = (code + "").match(parseFunction);
				lang = code[1] || "js";
				if (code[2]) { var title = code[2]; }
				code = code[3];
			}
			else {
				code = (code + "").match(parseString);
				lang = code[1] || render_code.inlineDefault;
				code = code[2];
			}

			var tab = code.match(findTab); tab = tab ? tab[1].length : 0;
			if (tab > 0) {
				code = code.replace(new RegExp("^\t{1," + tab + "}", "mg"), "");
			}

			if (lang in renderers) {
				code = code.replace(renderers[lang].find, renderers[lang].replace);
			}
			else { lang = "js"; }

			code = code.replace(findLeadingWhitespace, "");

			return (
				inline
					?
						_/*<code class="code code-inline*/ + (lang ? " " + lang : "") + _/*">*/ +
							code +
						_/*</code>*/
					:
						_/*<div class="code code-block">
							*/ + (
								title
									? _/*<label for="code-*/ + ++id + _/*" class="code-label">
										<span class="code-title">*/ + title + _/*</span>
										<span title="code language" class="code-lang">*/ + lang + _/*</span>
										<span class="clear"></span>
									</label>*/
									: _/*<span title="code language" class="code-lang">*/ + lang + _/*</span>*/
							) + _/*

							<code id="code-*/ + id + _/*" class="block */ + lang + _/*">*/ +
								code +
							_/*</code>
						</div>*/
			);
		}
		render_code.inlineDefault = "text";

		return render_code;
	})();

	return render;
})();